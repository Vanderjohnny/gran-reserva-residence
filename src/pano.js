// 360° panorama player (equirectangular renders): drag with inertia, pinch / wheel zoom, gyroscope on phones
// (DeviceOrientation, iOS permission on a tap), auto-rotation when idle, fullscreen, VR split view for Cardboard
// (StereoEffect), hotspots between panoramas and a thumbnail strip. Runs in its own overlay + WebGL renderer so the
// main scene keeps its state. Loads the 2k version first and swaps in the full-resolution file when it arrives.
import * as THREE from 'three';
import { StereoEffect } from 'three/addons/effects/StereoEffect.js';

const RAD = Math.PI / 180;
const IDLE_MS = 5000;           // auto-rotation starts this long after the last interaction
const AUTO_SPEED = 0.035;       // degrees per frame (≈2°/s at 60 fps)
const FOV = { min: 35, max: 95, start: 70 };

export function createPanoPlayer({ resolve = (p) => p, t = (k) => k, lang = () => 'pt', edit = false } = {}) {
  // ---------------------------------------------------------------------------------------------------- DOM
  const root = document.createElement('div'); root.id = 'pano'; root.hidden = true;
  root.innerHTML = `
    <canvas class="pano-canvas"></canvas>
    <div class="pano-hs-layer"></div>
    <div class="pano-top">
      <div class="pano-title"><b class="pano-name"></b><span class="pano-count"></span></div>
      <div class="pano-tools">
        <button type="button" class="pano-btn" data-act="gyro" title=""><span class="ic">⟲</span><span class="lb"></span></button>
        <button type="button" class="pano-btn" data-act="auto" title=""><span class="ic">↻</span><span class="lb"></span></button>
        <button type="button" class="pano-btn" data-act="vr" title=""><span class="ic">◫</span><span class="lb"></span></button>
        <button type="button" class="pano-btn" data-act="full" title=""><span class="ic">⛶</span><span class="lb"></span></button>
        <button type="button" class="pano-btn pano-close" data-act="close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="pano-strip"></div>
    <div class="pano-loading"><span></span></div>
    <div class="pano-hint"></div>
    <div class="pano-edit" hidden></div>`;
  document.body.appendChild(root);
  const $ = (sel) => root.querySelector(sel);
  const canvas = $('.pano-canvas'), hsLayer = $('.pano-hs-layer'), strip = $('.pano-strip'), loading = $('.pano-loading'), hint = $('.pano-hint'), editBox = $('.pano-edit');

  // ---------------------------------------------------------------------------------------------------- three
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV.start, 1, 0.1, 1100);
  const geo = new THREE.SphereGeometry(500, 96, 64); geo.scale(-1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const sphere = new THREE.Mesh(geo, mat); scene.add(sphere);
  const effect = new StereoEffect(renderer); effect.setEyeSeparation(0.064);
  const maxTex = renderer.capabilities.maxTextureSize;
  const loader = new THREE.TextureLoader();

  // ---------------------------------------------------------------------------------------------------- state
  const S = { open: false, items: [], index: -1, lon: 0, lat: 0, vLon: 0, vLat: 0, dragging: false, px: 0, py: 0, lastMove: 0, pinch: 0,
    gyro: false, gyroAvail: null, gyroQ: new THREE.Quaternion(), gyroBase: null, gyroYaw: 0, screenAngle: 0, auto: true, autoOn: false, vr: false, lastInput: 0,
    tex: null, texLow: null, loadId: 0, raf: 0 };
  const L = () => lang();

  // gyroscope: standard DeviceOrientation -> camera quaternion (same maths as the old three DeviceOrientationControls)
  const zee = new THREE.Vector3(0, 0, 1), euler = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  function onOrientation(ev) {
    if (ev.alpha == null) return;
    S.gyroAvail = true;
    const alpha = ev.alpha * RAD, beta = ev.beta * RAD, gamma = ev.gamma * RAD;
    const orient = (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : (window.orientation || 0)) * RAD;
    euler.set(beta, alpha, -gamma, 'YXZ');
    S.gyroQ.setFromEuler(euler).multiply(q1).multiply(q0.setFromAxisAngle(zee, -orient));
  }
  async function enableGyro(fromTap) {
    if (S.gyro) { setGyro(false); return; }
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (!fromTap) return;                                   // iOS needs a user gesture
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') { showHint(t('panoGyroDenied')); return; }
      }
    } catch { showHint(t('panoGyroDenied')); return; }
    S.gyroAvail = null;
    window.addEventListener('deviceorientation', onOrientation, true);
    setTimeout(() => { if (S.gyroAvail !== true) { setGyro(false); if (fromTap) showHint(t('panoGyroNone')); } }, 1800);
    setGyro(true);
  }
  function setGyro(on) {
    S.gyro = on; S.gyroYaw = 0; S.autoOn = false;
    if (!on) window.removeEventListener('deviceorientation', onOrientation, true);
    if (on) S.gyroBase = null;
    root.classList.toggle('gyro', on);
    updateButtons();
  }
  const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

  // ---------------------------------------------------------------------------------------------------- textures
  function setTexture(tex) {
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true;
    mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
  }
  function loadItem(i) {
    const it = S.items[i]; if (!it) return;
    const id = ++S.loadId;
    loading.hidden = false; root.classList.add('loading');
    const done = (tex, full) => {
      if (id !== S.loadId) { tex.dispose(); return; }
      if (S.tex && S.tex !== tex) S.tex.dispose();
      S.tex = tex; setTexture(tex);
      if (full || !it.file || it.file === it.low) { loading.hidden = true; root.classList.remove('loading'); }
    };
    const low = it.low || it.file, full = it.file;
    loader.load(resolve(low), (tex) => {
      done(tex, low === full);
      if (low !== full) loader.load(resolve(full), (tex2) => { done(tex2, true); }, undefined, () => { loading.hidden = true; root.classList.remove('loading'); });
    }, undefined, () => { loading.hidden = true; root.classList.remove('loading'); showHint(t('panoLoadError')); });
    if (maxTex < 6000) console.info('[pano] GPU max texture', maxTex, 'px: the full panorama is downscaled by three.js');
  }

  // ---------------------------------------------------------------------------------------------------- UI
  function updateButtons() {
    const g = $('[data-act="gyro"]'), a = $('[data-act="auto"]'), v = $('[data-act="vr"]'), f = $('[data-act="full"]');
    g.classList.toggle('on', S.gyro); g.querySelector('.lb').textContent = t('panoGyro'); g.title = t('panoGyroHint');
    g.hidden = !isTouch() && !S.gyro;
    a.classList.toggle('on', S.auto); a.querySelector('.lb').textContent = t('panoAuto'); a.title = t('panoAutoHint');
    v.classList.toggle('on', S.vr); v.querySelector('.lb').textContent = 'VR'; v.title = t('panoVrHint'); v.hidden = !isTouch();
    f.querySelector('.lb').textContent = t('panoFull'); f.title = t('panoFullHint');
  }
  let hintTimer = 0;
  function showHint(msg, ms = 2800) { hint.textContent = msg; hint.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.remove('show'), ms); }
  function renderStrip() {
    strip.innerHTML = S.items.map((it, i) => `<button type="button" class="pano-thumb ${i === S.index ? 'on' : ''}" data-i="${i}" title="${esc(label(it))}"><img src="${resolve(it.thumb || it.low || it.file)}" alt="" loading="lazy" /><span>${esc(label(it))}</span></button>`).join('');
    strip.querySelectorAll('.pano-thumb').forEach((b) => { b.onclick = () => show(+b.dataset.i); });
    strip.hidden = S.items.length < 2;
    const on = strip.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  const label = (it) => (it.label && (it.label[L()] || it.label.pt || it.label.en)) || it.id || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function renderHotspots() {
    const it = S.items[S.index]; const links = (it && it.links) || [];
    hsLayer.innerHTML = links.map((lk, k) => {
      const target = S.items.find((x) => x.id === lk.to);
      return `<button type="button" class="pano-hs" data-k="${k}" ${target ? '' : 'hidden'}><span class="arrow">➜</span><span class="lb">${esc(target ? label(target) : lk.to)}</span></button>`;
    }).join('');
    hsLayer.querySelectorAll('.pano-hs').forEach((b) => {
      b.onclick = (ev) => { ev.stopPropagation(); const lk = links[+b.dataset.k]; const j = S.items.findIndex((x) => x.id === lk.to); if (j >= 0) show(j, lk.arriveYaw); };
    });
  }
  function show(i, arriveYaw) {
    if (i < 0 || i >= S.items.length) return;
    S.index = i; const it = S.items[i];
    $('.pano-name').textContent = label(it);
    $('.pano-count').textContent = S.items.length > 1 ? ` · ${i + 1} / ${S.items.length}` : '';
    S.lon = arriveYaw ?? it.startYaw ?? 0; S.lat = it.startPitch ?? 0; S.vLon = S.vLat = 0; S.gyroYaw = 0; S.gyroBase = null;
    camera.fov = FOV.start; camera.updateProjectionMatrix();
    loadItem(i); renderHotspots(); renderStrip(); poke();
    if (typeof S.onShow === 'function') S.onShow(it, i);
  }

  // ---------------------------------------------------------------------------------------------------- input
  const poke = () => { S.lastInput = performance.now(); S.autoOn = false; };
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'touch' && ev.isPrimary === false) return;
    S.dragging = true; S.px = ev.clientX; S.py = ev.clientY; S.vLon = S.vLat = 0; S.lastMove = performance.now(); canvas.setPointerCapture(ev.pointerId); poke();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!S.dragging) return;
    const k = 0.12 * (camera.fov / FOV.start);
    const dx = (ev.clientX - S.px) * k, dy = (ev.clientY - S.py) * k;
    if (S.gyro) S.gyroYaw -= dx; else { S.lon -= dx; S.lat = Math.max(-85, Math.min(85, S.lat + dy)); }
    S.vLon = -dx; S.vLat = dy; S.px = ev.clientX; S.py = ev.clientY; S.lastMove = performance.now(); poke();
  });
  const endDrag = () => { if (!S.dragging) return; S.dragging = false; if (performance.now() - S.lastMove > 80) S.vLon = S.vLat = 0; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); zoom(ev.deltaY * 0.02); }, { passive: false });
  canvas.addEventListener('touchstart', (ev) => { if (ev.touches.length === 2) { S.pinch = dist(ev.touches); S.dragging = false; } }, { passive: true });
  canvas.addEventListener('touchmove', (ev) => { if (ev.touches.length === 2 && S.pinch) { const d = dist(ev.touches); zoom((S.pinch - d) * 0.15); S.pinch = d; } }, { passive: true });
  canvas.addEventListener('touchend', () => { S.pinch = 0; }, { passive: true });
  const dist = (tt) => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
  function zoom(d) { camera.fov = Math.max(FOV.min, Math.min(FOV.max, camera.fov + d)); camera.updateProjectionMatrix(); poke(); }
  canvas.addEventListener('dblclick', () => { camera.fov = camera.fov > 55 ? FOV.min + 10 : FOV.start; camera.updateProjectionMatrix(); });
  // edit mode (?panoedit=1): click prints the yaw / pitch of the clicked direction for placing hotspots in config.js
  canvas.addEventListener('click', (ev) => {
    if (!edit || S.dragging) return;
    const r = canvas.getBoundingClientRect(); const nx = ((ev.clientX - r.left) / r.width) * 2 - 1, ny = -((ev.clientY - r.top) / r.height) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera).normalize();
    const yaw = Math.atan2(v.z, v.x) / RAD, pitch = Math.asin(v.y) / RAD;
    const it = S.items[S.index];
    const line = `{ from: '${it.id}', yaw: ${yaw.toFixed(1)}, pitch: ${pitch.toFixed(1)} }`;
    editBox.hidden = false; editBox.textContent = line; console.log('[pano edit]', line);
    if (navigator.clipboard) navigator.clipboard.writeText(line).catch(() => {});
  });
  root.querySelectorAll('.pano-btn').forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      const act = b.dataset.act;
      if (act === 'close') close();
      else if (act === 'gyro') enableGyro(true);
      else if (act === 'auto') { S.auto = !S.auto; S.autoOn = false; updateButtons(); poke(); }
      else if (act === 'full') toggleFull();
      else if (act === 'vr') toggleVr();
    };
  });
  function toggleFull() {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { const el = root; (el.requestFullscreen || el.webkitRequestFullscreen || (() => showHint(t('panoNoFull')))).call(el); }
  }
  function toggleVr() {
    S.vr = !S.vr; root.classList.toggle('vr', S.vr); updateButtons();
    if (S.vr) {
      if (!S.gyro) enableGyro(true);
      if (!(document.fullscreenElement || document.webkitFullscreenElement)) toggleFull();
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch { /* not allowed */ }
      showHint(t('panoVrHint'), 3500);
    } else { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch { /* ignore */ } }
    resize();
  }
  document.addEventListener('keydown', (ev) => {
    if (!S.open) return;
    if (ev.key === 'Escape') { if (document.fullscreenElement) return; close(); }
    if (ev.key === 'ArrowRight' && S.items.length > 1) show((S.index + 1) % S.items.length);
    if (ev.key === 'ArrowLeft' && S.items.length > 1) show((S.index - 1 + S.items.length) % S.items.length);
  });
  window.addEventListener('resize', () => { if (S.open) resize(); });
  document.addEventListener('fullscreenchange', () => { if (S.open) resize(); });

  // ---------------------------------------------------------------------------------------------------- loop
  const dir = new THREE.Vector3(), v3 = new THREE.Vector3(), qYaw = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  function resize() {
    const w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); effect.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function frame() {
    if (!S.open) return;
    S.raf = requestAnimationFrame(frame);
    const now = performance.now();
    if (!S.dragging) {
      S.lon += S.vLon; S.lat = Math.max(-85, Math.min(85, S.lat + S.vLat)); S.vLon *= 0.92; S.vLat *= 0.92;
      if (Math.abs(S.vLon) < 0.002) S.vLon = 0; if (Math.abs(S.vLat) < 0.002) S.vLat = 0;
      if (S.auto && !S.gyro && now - S.lastInput > IDLE_MS) { S.autoOn = true; }
      if (S.autoOn) S.lon += AUTO_SPEED;
    }
    if (S.gyro && S.gyroAvail) {
      camera.quaternion.copy(qYaw.setFromAxisAngle(up, S.gyroYaw * RAD)).multiply(S.gyroQ);
    } else {
      const phi = (90 - S.lat) * RAD, theta = S.lon * RAD;
      dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      camera.lookAt(dir);
    }
    // hotspots follow their direction on screen
    const it = S.items[S.index]; const links = (it && it.links) || [];
    hsLayer.querySelectorAll('.pano-hs').forEach((b, k) => {
      const lk = links[k]; if (!lk) return;
      const phi = (90 - (lk.pitch || 0)) * RAD, theta = (lk.yaw || 0) * RAD;
      v3.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(400).project(camera);
      const visible = v3.z < 1 && Math.abs(v3.x) < 1.15 && Math.abs(v3.y) < 1.15;
      b.style.display = visible ? '' : 'none';
      if (visible) { b.style.left = `${(v3.x * 0.5 + 0.5) * 100}%`; b.style.top = `${(-v3.y * 0.5 + 0.5) * 100}%`; }
    });
    if (S.vr) effect.render(scene, camera); else renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------------------------------------------- api
  function open(items, index = 0, opts = {}) {
    S.items = items; S.onShow = opts.onShow || null;
    root.hidden = false; S.open = true; document.body.classList.add('pano-open');
    updateButtons(); resize(); show(index);
    if (isTouch() && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') enableGyro(false);   // Android: no permission prompt
    else if (isTouch()) showHint(t('panoTapGyro'), 3500);
    cancelAnimationFrame(S.raf); frame();
  }
  function close() {
    if (!S.open) return;
    S.open = false; root.hidden = true; document.body.classList.remove('pano-open');
    cancelAnimationFrame(S.raf);
    if (S.vr) { S.vr = false; root.classList.remove('vr'); }
    if (document.fullscreenElement === root) (document.exitFullscreen || (() => {})).call(document);
    setGyro(false);
    if (S.tex) { S.tex.dispose(); S.tex = null; mat.map = null; mat.color.set(0x000000); mat.needsUpdate = true; }
    if (typeof S.onClose === 'function') S.onClose();
  }
  return { open, close, show, get isOpen() { return S.open; }, get state() { return S; }, el: root, refreshLabels: () => { if (S.open) { updateButtons(); renderStrip(); renderHotspots(); const it = S.items[S.index]; if (it) $('.pano-name').textContent = label(it); } } };
}
