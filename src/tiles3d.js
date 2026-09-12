// Google Photorealistic 3D Tiles around the site (3d-tiles-renderer, ESM from jsdelivr through the import map).
// Optional: needs GOOGLE_TILES.key (Google Maps Platform, Map Tiles API enabled, key restricted to the site domains).
// Without a key, or when the tiles fail to load, nothing changes: the fallback context (terrain + canopy + satellite)
// keeps showing. When the tiles are in, the caller hides the fallback (onReady). Attributions are exposed for #credits.
//
// Fitting the model into the photogrammetry (user review 2026-09-11, round 6):
//   * the pin of the georef sits on GOOGLE_TILES-independent georef.anchor_model; the tile set is turned by the north
//     offset and levelled so that the sidewalk in front of the lot meets the model's z = 0 (probes on the sidewalk line);
//   * the tiles are clipped inside the lot footprint (GOOGLE_TILES.lot, margin) so the Google terrain never cuts through
//     the podium: the hillside lot climbs ~5 m from the street, the building's lower floors are dug into it;
//   * a retaining-wall skirt is built along the lot boundary from the sampled tile height down to below the base, so
//     the cut reads as a wall and not as a paper-thin edge.
import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer/three';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/three/plugins/GoogleCloudAuthPlugin.js';
import { GLTFExtensionsPlugin } from '3d-tiles-renderer/three/plugins/GLTFExtensionsPlugin.js';
import { TilesFadePlugin } from '3d-tiles-renderer/three/plugins/fade/TilesFadePlugin.js';
import { TileCompressionPlugin } from '3d-tiles-renderer/three/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from '3d-tiles-renderer/three/plugins/UpdateOnChangePlugin.js';
import { ReorientationPlugin } from '3d-tiles-renderer/three/plugins/ReorientationPlugin.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';

export function createTiles3D({ scene, camera, renderer, cfg, georef, touch = false, onReady, onFail, onAttribution, onSkirt }) {
  if (!cfg || !cfg.key) return null;
  const g = georef || {};
  const lat = (g.anchor_latlng || [0, 0])[0], lng = (g.anchor_latlng || [0, 0])[1];
  const anchor = g.anchor_model || [0, 0];          // model (Blender) point that sits on the pin
  const north = g.north_deg || 0;                   // degrees clockwise from map north to the model +Y
  const lot = cfg.lot || null;                      // { x: [xmin, xmax], y: [ymin, ymax] } model metres
  const margin = cfg.lotMargin ?? 0.35;

  const tiles = new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: cfg.key, autoRefreshToken: true }));
  const draco = new DRACOLoader(); draco.setDecoderPath(DRACO_PATH);
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new UpdateOnChangePlugin());
  tiles.registerPlugin(new TilesFadePlugin({ fadeDuration: 400 }));
  tiles.errorTarget = cfg.errorTarget ?? (touch ? 28 : 16);   // finer than the default: the houses around the lot must come in as 3D, not as texture (user review 2026-09-12)
  tiles.maxDepth = Infinity;
  tiles.displayActiveTiles = false;
  tiles.lruCache.maxBytesSize = (touch ? 220 : 480) * 1024 * 1024;
  tiles.downloadQueue.maxJobsPerOrigin = 8; tiles.parseQueue.maxJobs = 2;
  tiles.setCamera(camera); tiles.setResolutionFromRenderer(camera, renderer);

  // the pin at the origin, Y up (ReorientationPlugin, 3d-tiles-renderer >= 0.4: setLatLonToYUp is gone); then rotate by the
  // north offset and move the origin onto the model anchor
  tiles.registerPlugin(new ReorientationPlugin({ lat: lat * THREE.MathUtils.DEG2RAD, lon: lng * THREE.MathUtils.DEG2RAD, height: 0, recenter: true }));
  const pivot = new THREE.Group(); pivot.name = 'google-3d-tiles';
  // ReorientationPlugin leaves map north along +Z (three) = towards the viewer; our model has north along -Z (model +Y),
  // so turn the tile set by 180 deg, then by the north offset (model +Y bears `north` degrees east of north)
  const spin = new THREE.Group(); spin.rotation.y = Math.PI + THREE.MathUtils.degToRad(cfg.azimuth != null ? cfg.azimuth : north);
  spin.add(tiles.group); pivot.add(spin);
  pivot.position.set(anchor[0], 0, -anchor[1]);
  pivot.visible = false;
  scene.add(pivot);

  // clip the photogrammetry inside the lot (world-space planes; a fragment is dropped only when it is inside all four)
  let planes = null;
  if (lot && cfg.clipLot !== false) {
    const x0 = lot.x[0] - margin, x1 = lot.x[1] + margin, y0 = lot.y[0] - margin, y1 = lot.y[1] + margin;   // model y -> three z = -y
    planes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -x1), new THREE.Plane(new THREE.Vector3(-1, 0, 0), x0),
              new THREE.Plane(new THREE.Vector3(0, 0, 1), y0), new THREE.Plane(new THREE.Vector3(0, 0, -1), -y1)];
    renderer.localClippingEnabled = true;
  }

  const S = { ready: false, failed: false, height: cfg.groundHeight ?? 0, levelled: false, tint: 1, mats: new Set(), attributions: '', skirt: null, skirtHeight: null };
  pivot.position.y = -S.height;
  const setHeight = (h) => { S.height = h; pivot.position.y = -h; };

  // look of the photogrammetry (user review 2026-09-11: "the Maps texture is much darker than the building"): the
  // sampled texel is lifted (gain), its saturation raised and its gamma bent before the lighting - shared uniforms so
  // the values can be tuned live (setLook) - and the materials are made matte so the sun adds no specular darkening
  const LOOK = { uGain: { value: cfg.look?.gain ?? 1.3 }, uSat: { value: cfg.look?.saturation ?? 1.3 }, uGamma: { value: cfg.look?.gamma ?? 0.9 } };
  function injectLook(m) {
    if (m.userData.grLook) return;
    m.userData.grLook = true;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, r) => {
      if (prev) prev.call(m, shader, r);
      shader.uniforms.uGain = LOOK.uGain; shader.uniforms.uSat = LOOK.uSat; shader.uniforms.uGamma = LOOK.uGamma;
      // the uniforms are declared at the very top: the fade plugin has already rewritten "void main()" by now
      shader.fragmentShader = 'uniform float uGain, uSat, uGamma;\n' + shader.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
        { float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); vec3 c = mix(vec3(l), diffuseColor.rgb, uSat);
          diffuseColor.rgb = pow(max(c, vec3(0.0)), vec3(uGamma)) * uGain; }`);
    };
    if ('roughness' in m) { m.roughness = 1.0; m.metalness = 0.0; }
    if ('envMapIntensity' in m) m.envMapIntensity = 0.35;
    m.needsUpdate = true;
  }

  // materials: keep them so day/night can tint them; clip inside the lot; apply the look
  tiles.addEventListener('load-model', ({ scene: model }) => {
    pivot.visible = true;   // first geometry in: show the group (the tile-set event name varies between versions)
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true; o.castShadow = false;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m) continue;
        S.mats.add(m); if (m.color) m.color.setScalar(S.tint);
        if (planes) { m.clippingPlanes = planes; m.clipIntersection = true; }
        if (cfg.look !== false) injectLook(m); else m.needsUpdate = true;
      }
    });
  });
  tiles.addEventListener('dispose-model', ({ scene: model }) => { model.traverse((o) => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) S.mats.delete(m); }); });
  tiles.addEventListener('load-error', (e) => {
    if (S.ready) return;
    S.failed = true; pivot.visible = false;
    console.warn('[tiles3d] Google 3D Tiles unavailable:', e && (e.error || e.message || e));
    if (onFail) onFail(e);
  });
  tiles.addEventListener('load-tile-set', () => { pivot.visible = true; });

  // ground height: measure the loaded tiles on the sidewalk line in front of the lot (three points 1 m outside the lot
  // front + one on the kerb line) and lower / raise the tiles so that the sidewalk meets the model's z = 0; repeated
  // until stable (finer tiles arrive later)
  const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
  const cx = lot ? (lot.x[0] + lot.x[1]) / 2 : anchor[0], fy = lot ? lot.y[0] : anchor[1];
  const probes = cfg.levelProbes || [[cx - 8, fy - 1.0], [cx, fy - 1.0], [cx + 8, fy - 1.0], [cx, fy - 3.5]];
  const hitAt = (x, y) => {   // tile ground height (world) at model (x, y), or null
    ray.set(new THREE.Vector3(x, 600, -y), new THREE.Vector3(0, -1, 0)); ray.far = 1500;
    const hit = ray.intersectObject(tiles.group, true)[0];
    return hit && Math.abs(hit.point.y) < 300 ? hit.point.y : null;
  };
  let levelTries = 0;
  function level() {
    if (S.failed || (S.levelled && levelTries > 240) || (cfg.groundHeight != null && cfg.autoLevel === false)) return;
    const hs = [];
    for (const [x, y] of probes) {
      const h = hitAt(x, y);
      // height of the tiles' ground in tile space (before the offset); ignore hits while the tile set is still being
      // re-oriented (ECEF-scale geometry passing through the probes gives absurd values)
      if (h != null) hs.push(h + S.height);
    }
    levelTries++;
    if (hs.length >= 3) {
      hs.sort((a, b) => a - b); const med = hs[Math.floor(hs.length / 2)];
      if (Math.abs(med - S.height) > 0.05) setHeight(med);
      S.levelled = true; pivot.visible = true;
      if (!S.ready) { S.ready = true; if (onReady) onReady(); }
      if (lot && cfg.skirt !== false && (S.skirtHeight == null || Math.abs(S.skirtHeight - S.height) > 0.1 || (levelTries % 40) === 0)) buildSkirt();
    }
  }
  // retaining wall along the lot boundary: top = tile ground sampled every metre just outside the cut, bottom well below
  // the base slab; double-sided so it is seen from the street side (where the ground is lower) and from inside the cut
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x8b8781, roughness: 0.92, metalness: 0.0 });
  function buildSkirt() {
    const x0 = lot.x[0] - margin, x1 = lot.x[1] + margin, y0 = lot.y[0] - margin, y1 = lot.y[1] + margin;
    const ring = [];   // model (x, y) around the lot, 1 m steps
    for (let x = x0; x < x1; x += 1) ring.push([x, y0]);
    for (let y = y0; y < y1; y += 1) ring.push([x1, y]);
    for (let x = x1; x > x0; x -= 1) ring.push([x, y1]);
    for (let y = y1; y > y0; y -= 1) ring.push([x0, y]);
    const tops = ring.map(([x, y]) => { const h = hitAt(x, y); return h == null ? null : h + 0.04; });
    let got = tops.filter((t) => t != null).length;
    if (got < ring.length * 0.5) return;
    for (let i = 0; i < tops.length; i++) if (tops[i] == null) { const p = tops[(i + tops.length - 1) % tops.length], n = tops[(i + 1) % tops.length]; tops[i] = p != null ? p : (n != null ? n : 0); }
    const bottom = cfg.skirtBottom ?? -8;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = ring[i]; const top = Math.max(tops[i], bottom + 0.5);
      pos.push(x, top, -y, x, bottom, -y); uv.push(i * 0.5, top * 0.5, i * 0.5, bottom * 0.5);
    }
    for (let i = 0; i < ring.length; i++) {
      const a = i * 2, b = ((i + 1) % ring.length) * 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    if (S.skirt) { scene.remove(S.skirt); S.skirt.geometry.dispose(); }
    const mesh = new THREE.Mesh(geo, skirtMat); mesh.name = 'lot-skirt'; mesh.receiveShadow = true; mesh.castShadow = false;
    skirtMat.side = THREE.DoubleSide;
    scene.add(mesh); S.skirt = mesh; S.skirtHeight = S.height;
    if (onSkirt) onSkirt(mesh);
  }
  let frame = 0;
  function update() {
    if (S.failed) return;
    camera.updateMatrixWorld();
    tiles.update();
    if ((++frame % 30) === 0) {
      level();
      if (onAttribution) {
        const list = []; tiles.getAttributions(list);
        const txt = list.map((a) => a.value).filter(Boolean).join(' · ');
        if (txt !== S.attributions) { S.attributions = txt; onAttribution(txt); }
      }
    }
  }
  function setNightTint(k) {   // 1 = day .. nightTintMin = night (the neighbourhood must stay legible at night)
    k = Math.max(cfg.nightTintMin ?? 0.45, Math.min(1, k));
    S.tint = k;
    for (const m of S.mats) if (m.color) m.color.setScalar(k);
    skirtMat.color.setScalar(0.55 * k + 0.45 * k * k);
  }
  function setLook({ gain, saturation, gamma } = {}) {
    if (gain != null) LOOK.uGain.value = gain; if (saturation != null) LOOK.uSat.value = saturation; if (gamma != null) LOOK.uGamma.value = gamma;
    return { gain: LOOK.uGain.value, saturation: LOOK.uSat.value, gamma: LOOK.uGamma.value };
  }
  function dispose() { tiles.dispose(); scene.remove(pivot); if (S.skirt) scene.remove(S.skirt); }
  return { tiles, group: pivot, update, setHeight, setNightTint, setLook, dispose, buildSkirt, hitAt, get ready() { return S.ready; }, get failed() { return S.failed; }, get height() { return S.height; }, get state() { return S; } };
}
