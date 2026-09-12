// Volumes of the surroundings drawn over the Google 3D Tiles (or over the fallback terrain): the neighbourhood houses
// (data/context_buildings.json, Microsoft footprints) and the tall buildings of the region (data/context_towers.json,
// OpenStreetMap levels / height) as light-grey blocks, each dropped onto the ground sampled from the tiles.
// User review 2026-09-12: "as modelos das casas do bairro sumiram" (the photogrammetry houses read as flat) and
// "queria ver as torres da orla de Balneario Camboriu modeladas" (from 800 m away the tiles only show them as texture).
//
// A house block encloses its photogrammetry: base = lowest ground sample around the footprint, top = the highest of the
// footprint estimate and the roof sampled at the centroid (+0.3 m). Sampling is restricted to the tiles whose bounding
// box covers the point, and the work is spread over frames (a few thousand ray casts otherwise freeze the page).
import * as THREE from 'three';

export function createContext3D({ scene, houses, towers, lot, dem, onWindows, csmSetup }) {
  // last ground source: the elevation grids of data/dem_grid.json (metres east / north of the pin, heights relative
  // to the site datum), sampled bilinearly - used wherever no Google tile and no terrain mesh is loaded (far away)
  let demSample = null;
  if (dem && dem.grids && dem.grids.length) {
    const th = (dem.north_deg || 0) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), [ax, ay] = dem.anchor_model || [0, 0];
    const grids = dem.grids.slice().sort((a, b) => a.step - b.step);   // finest first
    demSample = (x, y) => {
      const e = c * (x - ax) + s * (y - ay), n = -s * (x - ax) + c * (y - ay);
      for (const g of grids) {
        const fi = (e - g.east0) / g.step, fj = (n - g.north0) / g.step, N = g.n;
        if (fi < 0 || fj < 0 || fi > N - 1 || fj > N - 1) continue;
        const i0 = Math.floor(fi), j0 = Math.floor(fj), i1 = Math.min(i0 + 1, N - 1), j1 = Math.min(j0 + 1, N - 1), u = fi - i0, v = fj - j0, H = g.h;
        return (H[j0 * N + i0] * (1 - u) + H[j0 * N + i1] * u) * (1 - v) + (H[j1 * N + i0] * (1 - u) + H[j1 * N + i1] * u) * v;
      }
      return null;
    };
  }
  const MAT = {
    wall: new THREE.MeshStandardMaterial({ color: 0xcfccc6, roughness: 0.9, metalness: 0.0 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 0.95, metalness: 0.0 }),
    towerWall: new THREE.MeshStandardMaterial({ color: 0xdedbd6, roughness: 0.8, metalness: 0.05 }),
    towerRoof: new THREE.MeshStandardMaterial({ color: 0xc4c1bc, roughness: 0.9, metalness: 0.0 }),
  };
  if (csmSetup) for (const m of Object.values(MAT)) csmSetup(m);
  const group = new THREE.Group(); group.name = 'context3d'; scene.add(group);
  const S = { houses: null, towers: null, building: false, version: 0, source: null, boxes: [], dayTint: 1 };
  const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
  const up = new THREE.Vector3(0, -1, 0), org = new THREE.Vector3();

  // ------------------------------------------------------------------------------------------- ground sampling
  // sources in order of preference: the Google tiles (only the tiles in the camera's frustum are loaded, so far away
  // there is often nothing to hit) and then the DEM terrain rings of the fallback context (always complete)
  function indexSource(roots) {   // world-space boxes of the meshes to sample, one list per source
    S.boxes = [];
    for (const root of (Array.isArray(roots) ? roots : [roots])) {
      const list = [];
      if (root) {
        root.updateMatrixWorld(true);
        root.traverse((o) => {
          if (!o.isMesh || !o.visible || !o.geometry || /^(BUILDINGS_|CANOPY|GRASS|STREETS)/.test(o.name || '')) return;
          const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
          const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
          if (b.max.x - b.min.x > 20000) return;   // the sea plane
          list.push({ mesh: o, b });
        });
      }
      S.boxes.push(list);
    }
  }
  const cand = [];
  function ground(x, y) {   // model (x, y) -> world height of the sampled surface, or null
    const z = -y;
    for (const list of S.boxes) {
      cand.length = 0;
      for (const e of list) if (x >= e.b.min.x && x <= e.b.max.x && z >= e.b.min.z && z <= e.b.max.z) cand.push(e.mesh);
      if (!cand.length) continue;
      org.set(x, 800, z); ray.set(org, up); ray.far = 2000;
      const hit = ray.intersectObjects(cand, false)[0];
      if (hit && Math.abs(hit.point.y) < 400) return hit.point.y;
    }
    return demSample ? demSample(x, y) : null;
  }

  // ------------------------------------------------------------------------------------------- extrusion
  function extrude(P, base, top, pos, roofPos) {   // P: model [x, y] ring (any winding); walls to pos, roof to roofPos
    const n = P.length;
    // walls (two triangles per edge, outward facing whatever the winding thanks to DoubleSide-free normal fix below)
    let area2 = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area2 += a[0] * b[1] - b[0] * a[1]; }
    const ccw = area2 > 0;   // model frame (x east, y north): CCW rings have the outside on the right of each edge in three (z = -y)
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      const ax = a[0], az = -a[1], bx = b[0], bz = -b[1];
      if (ccw) pos.push(ax, base, az, bx, base, bz, bx, top, bz, ax, base, az, bx, top, bz, ax, top, az);
      else pos.push(bx, base, bz, ax, base, az, ax, top, az, bx, base, bz, ax, top, az, bx, top, bz);
    }
    const shape = P.map(([x, y]) => new THREE.Vector2(x, -y));
    const tris = THREE.ShapeUtils.triangulateShape(shape, []);
    for (const [i, j, k] of tris) {
      const a = shape[i], b = shape[j], c = shape[k];
      // roof faces up: order so that the normal is +y (cross product of (b-a) x (c-a) in xz has positive y when clockwise in x/z)
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (cross > 0) roofPos.push(a.x, top, a.y, c.x, top, c.y, b.x, top, b.y); else roofPos.push(a.x, top, a.y, b.x, top, b.y, c.x, top, c.y);
    }
  }
  function toMesh(pos, mat, name) {
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = false; m.receiveShadow = true; return m;
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  const inLot = (x, y) => lot && x > lot.x[0] - 3 && x < lot.x[1] + 3 && y > lot.y[0] - 3 && y < lot.y[1] + 3;

  // ------------------------------------------------------------------------------------------- build
  async function build(sourceRoot, { chunk = 40 } = {}) {
    if (S.building) return; S.building = true; const version = ++S.version;
    indexSource(sourceRoot); S.source = sourceRoot;
    const walls = [], roofs = [], winList = [];
    const list = (houses && houses.buildings) || [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i]; const P = b.p; const [cx, cy] = b.c;
      if (inLot(cx, cy)) continue;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [x, y] of P) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      const samples = [ground(minX - 1.2, minY - 1.2), ground(maxX + 1.2, minY - 1.2), ground(maxX + 1.2, maxY + 1.2), ground(minX - 1.2, maxY + 1.2)].filter((v) => v != null);
      const roof = ground(cx, cy);
      if (!samples.length && roof == null) continue;
      const base = (samples.length ? Math.min(...samples) : roof - b.h) - 0.25;
      const est = b.h || 6.0;
      const top = Math.max(base + Math.min(Math.max(est, 3.2), 14), roof != null ? Math.min(roof + 0.3, base + 18) : 0);
      extrude(P, base, top, walls, roofs);
      winList.push({ c: b.c, z: [base, top], h: top - base, a: b.a, p: P });
      if ((i % chunk) === chunk - 1) { await nextFrame(); if (version !== S.version) { S.building = false; return; } }
    }
    const tw = [], tr = [];
    const tl = (towers && towers.buildings) || [];
    for (let i = 0; i < tl.length; i++) {
      const b = tl[i]; const P = b.p; const [cx, cy] = b.c;
      if (inLot(cx, cy)) continue;
      const samples = P.map(([x, y]) => ground(x, y)).filter((v) => v != null); const c0 = ground(cx, cy);
      const all = samples.concat(c0 != null ? [c0] : []);
      if (!all.length) continue;
      const base = Math.min(...all) - 1.0;
      extrude(P, base, base + b.h, tw, tr);
      if ((i % chunk) === chunk - 1) { await nextFrame(); if (version !== S.version) { S.building = false; return; } }
    }
    for (const o of group.children.slice()) { group.remove(o); o.geometry.dispose(); }
    for (const m of [toMesh(walls, MAT.wall, 'houses-walls'), toMesh(roofs, MAT.roof, 'houses-roofs'), toMesh(tw, MAT.towerWall, 'towers-walls'), toMesh(tr, MAT.towerRoof, 'towers-roofs')]) if (m) group.add(m);
    S.houses = winList.length; S.towers = tl.length; S.building = false;
    if (onWindows) onWindows({ buildings: winList });
  }
  function setNight(k) {   // k 0 day .. 1 night: the blocks darken with the sky (they are lit by the scene lights too)
    const c = 1 - 0.55 * k;
    MAT.wall.color.setScalar(0.81 * c); MAT.roof.color.setScalar(0.73 * c); MAT.towerWall.color.setScalar(0.87 * c); MAT.towerRoof.color.setScalar(0.77 * c);
  }
  return { group, build, setNight, get state() { return S; } };
}
