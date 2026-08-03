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
  // Delegated: the marquee's detail panel swaps its "open case" button in and
  // out of the DOM as the active case changes, so a direct listener wouldn't
  // survive that. Listening on the document catches every instance, present
  // now or added later.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.open-case')) showToast();
  });

  /* ---------- projects marquee ---------- */
  const wrap = document.getElementById('marquee-wrap');
  if (!wrap) return;

  const CASES = [
    { category: 'WORKPLACE / UX', title: 'T—BANK WORKPLACE', desc: 'One connected system for desks, services, rooms, and everyday decisions.' },
    { category: 'FINTECH / PRODUCT', title: 'VTB POLITE REFUSALS', desc: 'A microservice that helps people communicate clearly when saying no is difficult.' },
    { category: 'FINTECH / PRODUCT', title: 'VTB POLITE REFUSALS', desc: 'A microservice that helps people communicate clearly when saying no is difficult.' },
    { category: 'FINTECH / PRODUCT', title: 'CLOUD.RU WORKS', desc: 'Cloud services, pipelines etc' },
  ];
  function caseInnerHTML(c) {
    return `
      <div class="case-preview"></div>
      <div class="case-category mono"><span class="bar"></span>${c.category}</div>
      <h2 class="case-title">${c.title}</h2>
      <p class="case-desc">${c.desc}</p>
      <button class="open-case" type="button">OPEN CASE ↗</button>
    `;
  }

  const track = document.getElementById('marquee-track');
  const detail = document.getElementById('marquee-detail');
  const items = [...track.querySelectorAll('.marquee-item')];
  const setEl = track.querySelector('.marquee-set');

  let setWidth = 0;
  let scrollX = 0;
  let velocity = 0; // px/sec
  let dragging = false;
  let lastX = 0, lastT = 0;
  let ambientPausedUntil = 0;
  let activeIndex = -1;
  let activeEl = null;
  let lastTick = performance.now();

  function applyTransform() { track.style.transform = `translateX(${-scrollX}px)`; }

  function wrapScroll() {
    if (scrollX > setWidth * 1.5) scrollX -= setWidth;
    else if (scrollX < setWidth * 0.5) scrollX += setWidth;
  }

  function updateActive() {
    const wr = wrap.getBoundingClientRect();
    const anchor = wr.left + wr.width / 2;
    let closestEl = null, closestDist = Infinity;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.left + r.width / 2) - anchor);
      if (d < closestDist) { closestDist = d; closestEl = el; }
    });
    if (closestEl !== activeEl) {
      activeEl = closestEl;
      const closestCaseIndex = Number(closestEl.dataset.index);
      items.forEach((el) => el.toggleAttribute('data-active', el === closestEl));
      if (closestCaseIndex === activeIndex) return;
      activeIndex = closestCaseIndex;
      // Content updates the instant activation changes — no artificial wait.
      // While a gesture is actively dragging, skip the fade too: a live scrub
      // wants continuous 1:1 feedback, not a transition racing to catch up.
      detail.innerHTML = caseInnerHTML(CASES[activeIndex]);
      if (!reduceMotion && !dragging) {
        detail.classList.remove('is-entering');
        void detail.offsetWidth; // restart the animation even on rapid successive changes
        detail.classList.add('is-entering');
      }
    }
  }

  function nearestOffset() {
    const wr = wrap.getBoundingClientRect();
    const anchor = wr.left + wr.width / 2;
    let best = 0, bestDist = Infinity;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = (r.left + r.width / 2) - anchor;
      if (Math.abs(d) < bestDist) { bestDist = Math.abs(d); best = d; }
    });
    return best;
  }

  function animateBy(delta) {
    if (reduceMotion) {
      scrollX += delta;
      wrapScroll();
      applyTransform();
      updateActive();
      return;
    }
    const start = scrollX;
    const target = scrollX + delta;
    const startT = performance.now();
    const dur = 320;
    function step(now) {
      const t = Math.min(1, (now - startT) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      scrollX = start + (target - start) * eased;
      wrapScroll();
      applyTransform();
      updateActive();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastTick) / 1000);
    lastTick = now;
    if (!dragging) {
      if (Math.abs(velocity) > 2) {
        scrollX += velocity * dt;
        velocity *= Math.pow(0.05, dt);
        wrapScroll();
        applyTransform();
        updateActive();
        if (Math.abs(velocity) <= 2) { velocity = 0; animateBy(nearestOffset()); }
      } else if (!reduceMotion && now > ambientPausedUntil) {
        scrollX += 14 * dt; // slow ambient drift, px/sec
        wrapScroll();
        applyTransform();
        updateActive();
      }
    }
    requestAnimationFrame(tick);
  }

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true; velocity = 0;
    wrap.classList.add('grabbing');
    lastX = e.clientX; lastT = performance.now();
    wrap.setPointerCapture(e.pointerId);
    ambientPausedUntil = performance.now() + 2500;
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (-dx / dt) * 1000;
    scrollX -= dx;
    lastX = e.clientX; lastT = now;
    wrapScroll();
    applyTransform();
    updateActive();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('grabbing');
    ambientPausedUntil = performance.now() + 2500;
    if (Math.abs(velocity) < 40 || reduceMotion) { velocity = 0; animateBy(nearestOffset()); }
  }
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  items.forEach((el) => {
    el.addEventListener('click', () => {
      if (dragging) return;
      const wr = wrap.getBoundingClientRect();
      const anchor = wr.left + wr.width / 2;
      const r = el.getBoundingClientRect();
      ambientPausedUntil = performance.now() + 2500;
      animateBy((r.left + r.width / 2) - anchor);
    });
  });

  setWidth = setEl.getBoundingClientRect().width;
  scrollX = setWidth;
  applyTransform();
  updateActive();
  lastTick = performance.now();
  requestAnimationFrame(tick);
  window.addEventListener('resize', () => {
    const newSetWidth = setEl.getBoundingClientRect().width;
    scrollX = scrollX - setWidth + newSetWidth; // keep visual position stable across the resize
    setWidth = newSetWidth;
    applyTransform();
  });
})();
