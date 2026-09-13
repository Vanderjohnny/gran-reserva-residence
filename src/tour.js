// Guided tour: a sequence of stops (camera + short text + optional floor filter / unit / time of day / panorama)
// defined in config.js TOUR. Bottom card with title, text, progress dots, previous / next / close; arrow keys.
export function createTour({ stops, flyTo, t, lang, setFloor, selectUnit, clearSelection, setTime, openPano, onEnd, isTouch = false }) {
  const root = document.createElement('div'); root.id = 'tour'; root.hidden = true;
  root.innerHTML = `
    <div class="tour-card">
      <div class="tour-head"><span class="tour-step"></span><button type="button" class="icon-btn tour-close" aria-label="Close">×</button></div>
      <h3 class="tour-title"></h3>
      <p class="tour-text"></p>
      <div class="tour-foot">
        <button type="button" class="btn ghost small tour-prev"></button>
        <div class="tour-dots"></div>
        <button type="button" class="btn primary small tour-next"></button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const S = { i: -1, on: false, timer: 0 };
  const L = () => lang();
  const txt = (o) => (o && (o[L()] || o.pt || o.en)) || '';

  function render() {
    const st = stops[S.i]; if (!st) return;
    $('.tour-step').textContent = `${S.i + 1} / ${stops.length}`;
    $('.tour-title').textContent = txt(st.title);
    $('.tour-text').textContent = txt(st.text);
    $('.tour-prev').textContent = t('prev'); $('.tour-prev').disabled = S.i === 0;
    $('.tour-next').textContent = S.i === stops.length - 1 ? t('tourEnd') : t('next');
    $('.tour-dots').innerHTML = stops.map((_, k) => `<span class="${k === S.i ? 'on' : ''}" data-k="${k}"></span>`).join('');
    $('.tour-dots').querySelectorAll('span').forEach((d) => { d.onclick = () => go(+d.dataset.k); });
  }
  function apply(st) {
    clearTimeout(S.timer);
    if (st.floor !== undefined) setFloor(st.floor, st.reveal);   // GRANRESERVA-MAIN13: optional reveal mode ('hide' = clean cut)
    setTime(st.time !== undefined ? st.time : 0);   // GRANRESERVA-MAIN13: stops without a time are daylight
    if (st.unit) selectUnit(st.unit); else clearSelection();
    const ms = st.ms || 2200;
    if (st.pos && st.target) flyTo(st.pos, st.target, ms, isTouch && st.posMobile ? st.posMobile : null);
    if (st.pano) S.timer = setTimeout(() => { if (S.on && stops[S.i] === st) openPano(st.pano); }, ms + 400);
  }
  function go(i) {
    if (i < 0 || i >= stops.length) return;
    S.i = i; render(); apply(stops[i]);
  }
  function start(i = 0) {
    S.on = true; root.hidden = false; document.body.classList.add('tour-on'); go(i);
  }
  function end() {
    if (!S.on) return;
    S.on = false; root.hidden = true; document.body.classList.remove('tour-on'); clearTimeout(S.timer);
    setFloor(null); clearSelection(); setTime(0);
    if (onEnd) onEnd();
  }
  $('.tour-prev').onclick = () => go(S.i - 1);
  $('.tour-next').onclick = () => { if (S.i === stops.length - 1) end(); else go(S.i + 1); };
  $('.tour-close').onclick = end;
  document.addEventListener('keydown', (ev) => {
    if (!S.on || document.body.classList.contains('pano-open')) return;
    if (ev.key === 'ArrowRight') { if (S.i < stops.length - 1) go(S.i + 1); }
    else if (ev.key === 'ArrowLeft') go(S.i - 1);
    else if (ev.key === 'Escape') end();
  });
  return { start, end, go, get on() { return S.on; }, get index() { return S.i; }, refreshLabels: () => { if (S.on) render(); } };
}
