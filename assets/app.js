(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- giant name: build letters + crosshair hover color ---------- */
  // Splits the wordmark already in the markup rather than repeating the text
  // here, so the HTML stays the single source of truth (and still renders if
  // this script never runs).
  function splitLetters(el) {
    const text = el.textContent.trim();
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      const span = document.createElement('span');
      span.textContent = ch;
      frag.appendChild(span);
    }
    el.textContent = '';
    el.appendChild(frag);
  }
  const nameTop = document.getElementById('name-top');
  const nameBottom = document.getElementById('name-bottom');

  if (nameTop && nameBottom) {
    splitLetters(nameTop);
    splitLetters(nameBottom);

    if (!reduceMotion) {
      const inkRGB = [2, 16, 36];
      const rustRGB = [166, 52, 46];
      const RADIUS = 220;
      const letters = [...nameTop.children, ...nameBottom.children];
      const painted = new Array(letters.length);
      let centers = [];
      let rafPending = false;
      let lastX = -9999, lastY = -9999;

      // The letters only move when the line reflows, so measure once instead
      // of reading 16 rects every frame — that read forced a synchronous
      // layout on each pointer move. Centers are kept in document space so
      // scrolling doesn't invalidate them.
      function measure() {
        centers = letters.map((span) => {
          const r = span.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 + window.scrollX,
            y: r.top + r.height / 2 + window.scrollY,
          };
        });
      }

      function paintLetters(x, y) {
        for (let i = 0; i < letters.length; i++) {
          const c = centers[i];
          const intensity = Math.max(0, 1 - Math.hypot(x - c.x, y - c.y) / RADIUS);
          const mix = inkRGB.map((ch, k) => Math.round(ch + (rustRGB[k] - ch) * intensity));
          const next = `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
          // A pointer moving far from the wordmark leaves most letters at ink;
          // skip writing a colour that is already set.
          if (painted[i] === next) continue;
          painted[i] = next;
          letters[i].style.color = next;
        }
      }

      measure();
      // The wordmark is set in a webfont that swaps in after first paint, and
      // its metrics shift every letter — remeasure once it actually lands.
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      window.addEventListener('resize', measure);

      window.addEventListener('pointermove', (e) => {
        lastX = e.clientX + window.scrollX;
        lastY = e.clientY + window.scrollY;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(() => { paintLetters(lastX, lastY); rafPending = false; });
        }
      });
    }
  }

  /* ---------- open case toast ---------- */
  const toast = document.getElementById('toast');
  const TOAST_MESSAGE = 'Case study coming soon';
  let toastTimer;
  function showToast() {
    if (!toast) return;
    // The message is written on each show rather than sitting in the markup:
    // a role="status" region announces content that *arrives*, so text already
    // present at load would never be read out.
    toast.textContent = TOAST_MESSAGE;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.textContent = '';
    }, 1800);
  }
  // Delegated: the marquee's detail panel swaps its "open case" button in and
  // out of the DOM as the active case changes, so a direct listener wouldn't
  // survive that. Listening on the document catches every instance, present
  // now or added later.
  // Only the <button> form has nothing to open — the <a> form navigates.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button.open-case')) showToast();
  });

  /* ---------- case study section tabs ---------- */
  const toc = document.querySelector('.case-toc');
  if (toc) {
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const sections = links
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    if (sections.length) {
      const setCurrent = (id) => {
        links.forEach((a) => {
          const on = a.getAttribute('href') === '#' + id;
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      };

      // The topmost section still intersecting the band below the sticky bar
      // wins, so the marker tracks reading position rather than flickering
      // between neighbours mid-scroll.
      const visible = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        });
        const first = sections.find((s) => visible.has(s));
        if (first) setCurrent(first.id);
      }, { rootMargin: '-72px 0px -55% 0px', threshold: 0 });

      sections.forEach((s) => io.observe(s));
      setCurrent(sections[0].id);

      // Keep the active tab in view when the bar itself scrolls sideways.
      const scrollTabIntoView = (a) => {
        const r = a.getBoundingClientRect();
        const t = toc.getBoundingClientRect();
        if (r.left < t.left + 12 || r.right > t.right - 12) {
          toc.scrollTo({ left: a.offsetLeft - toc.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      };
      const obsCurrent = new MutationObserver(() => {
        const a = toc.querySelector('a[aria-current="true"]');
        if (a) scrollTabIntoView(a);
      });
      links.forEach((a) => obsCurrent.observe(a, { attributes: true, attributeFilter: ['aria-current'] }));
    }
  }

  /* ---------- projects marquee ---------- */
  const wrap = document.getElementById('marquee-wrap');
  if (!wrap) return;

  // `href` marks a case that has a written study; the rest still fall back to
  // the toast until their material exists.
  const CASES = [
    { category: 'RECOGNITION PLATFORM / PRODUCT', title: 'AWARDME', desc: 'Skill badges an organisation issues, and public pages that make them portable.', href: '../cases/awardme/', thumb: '../assets/cases/awardme-badge-900.jpg' },
    { category: 'CLOUD TOOLING / CONCEPT', title: 'WORKFLOW STUDIO', desc: 'Describe an engineering task in plain language; an agent assembles the pipeline.', href: '../cases/workflow-studio/', thumb: '../assets/cases/workflow-home-900.jpg' },
    { category: 'DEVELOPER PLATFORM / REDESIGN', title: 'YANDEX ASK & LEARN', desc: 'A developer Q&A platform rebuilt around people, reputation and findable tags.', href: '../cases/yandex-ask-learn/', thumb: '../assets/cases/ydx-tagmodal-after-900.jpg' },
    { category: 'WORKPLACE / UX', title: 'T—BANK WORKPLACE', desc: 'One connected system for desks, services, rooms, and everyday decisions.' },
    { category: 'FINTECH / PRODUCT', title: 'VTB POLITE REFUSALS', desc: 'A microservice that helps people communicate clearly when saying no is difficult.' },
  ];
  // 1px strokes on a 10px box, matching the hairline rules used elsewhere.
  const ARROW_SVG = '<svg class="arrow" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true" focusable="false"><path d="M1.6 8.4 8.4 1.6"/><path d="M3.6 1.6h4.8v4.8"/></svg>';
  function caseInnerHTML(c) {
    const action = c.href
      ? `<a class="open-case" href="${c.href}">OPEN CASE ${ARROW_SVG}</a>`
      : `<button class="open-case" type="button">OPEN CASE ${ARROW_SVG}</button>`;
    // A case with a written study shows its own work; the hatch stays only for
    // the ones that genuinely have nothing behind them yet.
    const preview = c.thumb
      ? `<div class="case-preview has-thumb"><img src="${c.thumb}" alt="" loading="lazy" decoding="async"></div>`
      : `<div class="case-preview"></div>`;
    return `
      ${preview}
      <div class="case-category mono"><span class="bar"></span>${c.category}</div>
      <h2 class="case-title">${c.title}</h2>
      <p class="case-desc">${c.desc}</p>
      ${action}
    `;
  }

  const track = document.getElementById('marquee-track');
  const detail = document.getElementById('marquee-detail');
  const items = [...track.querySelectorAll('.marquee-item')];
  const setEl = track.querySelector('.marquee-set');

  // The track repeats one set three times so the scroll can wrap seamlessly.
  // That repetition is purely visual: left alone it turns three projects into
  // nine tab stops and makes a screen reader announce the same list of work
  // three times over. Only the first copy stays in the accessibility tree and
  // the tab order — the clones keep working for pointer drags and taps.
  [...track.querySelectorAll('.marquee-set')].slice(1).forEach((clone) => {
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('.marquee-item').forEach((btn) => { btn.tabIndex = -1; });
  });

  let setWidth = 0;
  let scrollX = 0;
  let velocity = 0; // px/sec
  let dragging = false;
  let lastX = 0, lastT = 0;
  let ambientPausedUntil = 0;
  let holdDrift = false;
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
      } else if (!reduceMotion && !holdDrift && now > ambientPausedUntil) {
        scrollX += 14 * dt; // slow ambient drift, px/sec
        wrapScroll();
        applyTransform();
        updateActive();
      }
    }
    requestAnimationFrame(tick);
  }

  let pressedItem = null;
  let pressStartX = 0;
  let pressMaxMove = 0;

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true; velocity = 0;
    wrap.classList.add('grabbing');
    lastX = e.clientX; lastT = performance.now();
    wrap.setPointerCapture(e.pointerId);
    ambientPausedUntil = performance.now() + 2500;
    // Track what was actually pressed and how far the pointer travels before
    // release. Once pointer capture is engaged on `wrap`, the browser can
    // suppress the native `click` on the child button entirely — even a few
    // px of ordinary hand jitter is enough — so a plain click listener on
    // each item can silently never fire. Below the hysteresis threshold this
    // is a tap on that specific item, not a drag; above it, it's a real scrub.
    pressedItem = e.target.closest('.marquee-item');
    pressStartX = e.clientX;
    pressMaxMove = 0;
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (-dx / dt) * 1000;
    scrollX -= dx;
    lastX = e.clientX; lastT = now;
    pressMaxMove = Math.max(pressMaxMove, Math.abs(e.clientX - pressStartX));
    wrapScroll();
    applyTransform();
    updateActive();
  });
  function jumpToItem(el) {
    const wr = wrap.getBoundingClientRect();
    const anchor = wr.left + wr.width / 2;
    const r = el.getBoundingClientRect();
    ambientPausedUntil = performance.now() + 2500;
    animateBy((r.left + r.width / 2) - anchor);
  }
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('grabbing');
    ambientPausedUntil = performance.now() + 2500;
    if (pressMaxMove < 10 && pressedItem) {
      velocity = 0;
      jumpToItem(pressedItem);
      return;
    }
    if (Math.abs(velocity) < 40 || reduceMotion) { velocity = 0; animateBy(nearestOffset()); }
  }
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  // Reading a title shouldn't mean chasing it. Pointing at the marquee or
  // tabbing into it holds the ambient drift; leaving lets it resume after a
  // beat. This also gives the continuous motion the pause mechanism it
  // otherwise lacks for anyone who needs one.
  // Mouse and pen only: a touch pointer enters on tap and is destroyed on
  // release, so holding on it risks stalling the drift for good on a phone —
  // where a tap already pauses things through endDrag.
  wrap.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') holdDrift = true;
  });
  wrap.addEventListener('pointerleave', () => {
    holdDrift = false;
    ambientPausedUntil = performance.now() + 600;
  });
  wrap.addEventListener('focusin', () => { holdDrift = true; });
  wrap.addEventListener('focusout', () => { holdDrift = false; });

  items.forEach((el) => {
    // Kept for keyboard activation (Tab + Enter/Space) — that path fires a
    // real `click` with no pointer sequence at all, so `dragging` is false
    // and this runs cleanly. For pointer/touch input the tap is already
    // handled above in endDrag(), before this can double-fire.
    el.addEventListener('click', () => {
      if (dragging) return;
      jumpToItem(el);
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
