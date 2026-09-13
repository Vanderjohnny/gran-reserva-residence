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

export function createContext3D({ scene, houses, towers, lot, dem, cityLights, onWindows, csmSetup }) {
  // ------------------------------------------------------------------------------------------- night point lights
  // lit windows on the tower volumes, street lights at their feet and the city-light dots exported from the satellite
  // imagery (data/city_lights.json, tools/export_city_lights.py): point sprites with a capped pixel size, additive,
  // faded in with the night (user review 2026-09-12: "as luzes da cidade à noite sumiram; muitas janelas acesas nas
  // torres da orla")
  const dotTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g2 = cv.getContext('2d');
    const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  function pointsMaterial(size, minPx, maxPx) {
    return new THREE.ShaderMaterial({
      uniforms: { uMap: { value: dotTex }, uOpacity: { value: 0 }, uScale: { value: window.innerHeight / 2 }, uSize: { value: size }, uMin: { value: minPx }, uMax: { value: maxPx } },
      vertexShader: `attribute vec3 aColor; varying vec3 vColor; uniform float uScale, uSize, uMin, uMax;
        void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uSize * uScale / max(1.0, -mv.z), uMin, uMax); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uOpacity; varying vec3 vColor;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); if (t.a < 0.03) discard; gl_FragColor = vec4(vColor * t.rgb, t.a * uOpacity); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  }
  const LIGHTS = { windows: null, city: null, street: null };
  let seed = 20260912;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const warm = (br) => { const r = rnd(); const c = r < 0.62 ? [1, 0.82, 0.55] : r < 0.85 ? [0.86, 0.9, 1] : [1, 0.62, 0.28]; return [c[0] * br, c[1] * br, c[2] * br]; };
  function makePoints(pos, col, size, minPx, maxPx, name) {
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
    const p = new THREE.Points(geo, pointsMaterial(size, minPx, maxPx)); p.name = name; p.frustumCulled = false; p.renderOrder = 2; p.visible = false;
    return p;
  }
  function buildLights(towerRecs, groundFn) {
    for (const k of Object.keys(LIGHTS)) if (LIGHTS[k]) { scene.remove(LIGHTS[k]); LIGHTS[k].geometry.dispose(); LIGHTS[k] = null; }
    seed = 20260912;
    // windows: a grid on every outer wall, 3.1 m per floor, a window every 3.4 m, ~55 % of them lit
    const wp = [], wc = [], sp = [], sc = [];
    for (const t of towerRecs) {
      const P = t.P, n = P.length, floors = Math.min(60, Math.floor(t.h / 3.1)); let a2 = 0;
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; a2 += a[0] * b[1] - b[0] * a[1]; }
      const sgn = a2 > 0 ? 1 : -1; let count = 0;
      for (let i = 0; i < n && count < 520; i++) {
        const a = P[i], b = P[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 2.5) continue;
        const nx = sgn * dy / L, ny = -sgn * dx / L, cols = Math.max(1, Math.floor(L / 3.4));
        for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
          if (rnd() > 0.55) continue;
          const u = (c + 0.5) / cols, x = a[0] + dx * u + nx * 0.25, y = a[1] + dy * u + ny * 0.25, z = t.base + f * 3.1 + 1.7;
          wp.push(x, z, -y); wc.push(...warm(0.6 + rnd() * 0.6)); count++;
        }
      }
      for (let k = 0; k < 2; k++) {   // street lights at the foot of the tower
        const x = t.cx + (rnd() - 0.5) * 24, y = t.cy + (rnd() - 0.5) * 24; const g = groundFn(x, y); if (g == null) continue;
        sp.push(x, g + 4, -y); sc.push(1.0 * 0.9, 0.78 * 0.9, 0.45 * 0.9);
      }
    }
    LIGHTS.windows = makePoints(wp, wc, 9, 1.6, 5.5, 'tower-windows');
    // city dots from the imagery
    const cp = [], cc = [];
    for (const [x, y, L] of ((cityLights && cityLights.lights) || [])) {
      const g = groundFn(x, y); if (g == null) continue;
      cp.push(x, g + 2.0, -y); cc.push(...warm(0.5 + L * 0.6));
    }
    LIGHTS.city = makePoints(cp.concat(sp), cc.concat(sc), 14, 2, 8, 'city-lights');
    for (const k of Object.keys(LIGHTS)) if (LIGHTS[k]) { LIGHTS[k].material.uniforms.uOpacity.value = S.nightK || 0; LIGHTS[k].visible = (S.nightK || 0) > 0.02; scene.add(LIGHTS[k]); }
    S.lights = { windows: wp.length / 3, city: cp.length / 3, street: sp.length / 3 };
  }
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
  // every block gets its own grey between light and dark (user review 2026-09-13), carried by vertex colours so the
  // whole neighbourhood stays one draw call per material; the material colour only darkens them at night
  const MAT = {
    wall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0, vertexColors: true }),
    roof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true }),
    towerWall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.05, vertexColors: true }),
    towerRoof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0, vertexColors: true }),
  };
  const GREY = { min: 0.42, max: 0.9, roof: 0.86 };   // wall grey range (0 black .. 1 white), roof = wall x 0.86
  let cseed = 4127;
  const crnd = () => { cseed = (cseed * 1103515245 + 12345) & 0x7fffffff; return cseed / 0x7fffffff; };
  const pickGrey = () => { const t = crnd(); const g = GREY.min + (GREY.max - GREY.min) * (0.15 + 0.7 * t + 0.15 * crnd()); const tint = 0.97 + 0.06 * crnd(); return [g * tint, g, g / tint]; };
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
  function extrude(P, base, top, pos, roofPos, wcol, rcol) {   // P: model [x, y] ring (any winding); walls to pos, roof to roofPos
    const n = P.length;
    const g = pickGrey(), n0 = pos.length, r0 = roofPos.length;   // one grey per block, pushed for every vertex added below
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
    for (let v = n0; v < pos.length; v += 3) wcol.push(g[0], g[1], g[2]);
    for (let v = r0; v < roofPos.length; v += 3) rcol.push(g[0] * GREY.roof, g[1] * GREY.roof, g[2] * GREY.roof);
  }
  function toMesh(pos, col, mat, name) {
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = false; m.receiveShadow = true; return m;
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  const inLot = (x, y) => lot && x > lot.x[0] - 3 && x < lot.x[1] + 3 && y > lot.y[0] - 3 && y < lot.y[1] + 3;

  // ------------------------------------------------------------------------------------------- build
  async function build(sourceRoot, { chunk = 40 } = {}) {
    if (S.building) return; S.building = true; const version = ++S.version;
    indexSource(sourceRoot); S.source = sourceRoot; cseed = 4127;
    const walls = [], roofs = [], winList = [], wallsCol = [], roofsCol = [];
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
      extrude(P, base, top, walls, roofs, wallsCol, roofsCol);
      winList.push({ c: b.c, z: [base, top], h: top - base, a: b.a, p: P });
      if ((i % chunk) === chunk - 1) { await nextFrame(); if (version !== S.version) { S.building = false; return; } }
    }
    const tw = [], tr = [], twCol = [], trCol = [], towerRecs = [];
    const tl = (towers && towers.buildings) || [];
    for (let i = 0; i < tl.length; i++) {
      const b = tl[i]; const P = b.p; const [cx, cy] = b.c;
      if (inLot(cx, cy)) continue;
      const samples = P.map(([x, y]) => ground(x, y)).filter((v) => v != null); const c0 = ground(cx, cy);
      const all = samples.concat(c0 != null ? [c0] : []);
      if (!all.length) continue;
      const base = Math.min(...all) - 1.0;
      extrude(P, base, base + b.h, tw, tr, twCol, trCol);
      towerRecs.push({ P, base, h: b.h, cx, cy });
      if ((i % chunk) === chunk - 1) { await nextFrame(); if (version !== S.version) { S.building = false; return; } }
    }
    for (const o of group.children.slice()) { group.remove(o); o.geometry.dispose(); }
    for (const m of [toMesh(walls, wallsCol, MAT.wall, 'houses-walls'), toMesh(roofs, roofsCol, MAT.roof, 'houses-roofs'), toMesh(tw, twCol, MAT.towerWall, 'towers-walls'), toMesh(tr, trCol, MAT.towerRoof, 'towers-roofs')]) if (m) group.add(m);
    S.houses = winList.length; S.towers = tl.length; S.building = false;
    if (onWindows) onWindows({ buildings: winList });
    try { buildLights(towerRecs, ground); } catch (e) { console.warn('context3d lights', e); }
  }
  function setNight(k) {   // k 0 day .. 1 night: the blocks darken with the sky (they are lit by the scene lights too)
    S.nightK = k;
    const c = 1 - 0.55 * k;
    MAT.wall.color.setScalar(c); MAT.roof.color.setScalar(c); MAT.towerWall.color.setScalar(c); MAT.towerRoof.color.setScalar(c);
    for (const key of Object.keys(LIGHTS)) { const p = LIGHTS[key]; if (!p) continue; p.material.uniforms.uOpacity.value = k; p.material.uniforms.uScale.value = window.innerHeight / 2; p.visible = k > 0.02; }
  }
  return { group, build, setNight, get state() { return S; } };
}
