(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- giant name: build letters + crosshair hover color ---------- */
  function buildName(el, text) {
    el.innerHTML = '';
    [...text].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.color = 'var(--ink)';
      el.appendChild(span);
    });
  }
  const nameTop = document.getElementById('name-top');
  const nameBottom = document.getElementById('name-bottom');

  if (nameTop && nameBottom) {
    buildName(nameTop, 'VLADISLAV');
    buildName(nameBottom, 'SAPELIN');

    if (!reduceMotion) {
      const inkRGB = [2, 16, 36];
      const rustRGB = [166, 52, 46];
      let rafPending = false;
      let lastX = -9999, lastY = -9999;

      function paintLetters(x, y) {
        [...nameTop.children, ...nameBottom.children].forEach(span => {
          const r = span.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dist = Math.hypot(x - cx, y - cy);
          const intensity = Math.max(0, 1 - dist / 220);
          const mix = inkRGB.map((c, i) => Math.round(c + (rustRGB[i] - c) * intensity));
          span.style.color = `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
        });
      }

      window.addEventListener('pointermove', (e) => {
        lastX = e.clientX; lastY = e.clientY;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(() => { paintLetters(lastX, lastY); rafPending = false; });
        }
      });
    }
  }

  /* ---------- open case toast ---------- */
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast() {
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }
  document.querySelectorAll('.open-case').forEach(btn => btn.addEventListener('click', showToast));

  /* ---------- projects carousel ---------- */
  const track = document.getElementById('carousel-track');
  if (!track) return;

  const cards = [...track.children];
  const countEl = document.getElementById('carousel-count');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  let active = 0;
  let dragStartX = 0, dragCurrentX = 0, dragging = false, dragVelocity = 0, lastDragT = 0, lastDragX = 0;

  function layout(withMotion = true) {
    cards.forEach((el, i) => {
      const offset = i - active;
      const x = offset * 60 + (dragging ? dragCurrentX - dragStartX : 0);
      const scale = i === active ? 1 : 0.86;
      const opacity = i === active ? 1 : 0.45;
      const z = i === active ? 10 : 10 - Math.abs(offset);
      el.style.transition = (withMotion && !dragging && !reduceMotion) ? 'transform .5s var(--ease-spring), opacity .5s ease' : 'none';
      el.style.transform = `translateX(${x}px) scale(${scale})`;
      el.style.opacity = opacity;
      el.style.zIndex = z;
      el.style.pointerEvents = i === active ? 'auto' : 'none';
    });
    countEl.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    btnPrev.dataset.active = active > 0 ? 'true' : 'false';
    btnNext.dataset.active = active < cards.length - 1 ? 'true' : 'false';
  }

  function goTo(i) {
    active = Math.max(0, Math.min(cards.length - 1, i));
    layout();
  }

  btnPrev.addEventListener('click', () => goTo(active - 1));
  btnNext.addEventListener('click', () => goTo(active + 1));

  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    track.classList.add('grabbing');
    dragStartX = e.clientX;
    dragCurrentX = e.clientX;
    lastDragX = e.clientX;
    lastDragT = performance.now();
    dragVelocity = 0;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragCurrentX = e.clientX;
    const now = performance.now();
    const dt = now - lastDragT;
    if (dt > 0) dragVelocity = (e.clientX - lastDragX) / dt * 1000;
    lastDragX = e.clientX;
    lastDragT = now;
    layout(false);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('grabbing');
    const delta = dragCurrentX - dragStartX;
    const projected = delta + dragVelocity * 0.15;
    if (projected < -60) goTo(active + 1);
    else if (projected > 60) goTo(active - 1);
    else layout();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', () => layout(false));
  layout(false);
})();
