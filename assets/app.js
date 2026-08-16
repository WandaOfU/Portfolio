(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- case screens: click to enlarge ---------- */
  const shots = [...document.querySelectorAll('.case-shot img')];
  if (shots.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">'
      + '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'
      + '<path d="M1 1l8 8M9 1l-8 8"/></svg></button>';
    document.body.appendChild(box);
    // Built rather than written into the markup: an <img> with no src is a
    // broken-image box if it ever renders, and this one has no source until
    // something is opened.
    const bigImg = document.createElement('img');
    box.appendChild(bigImg);
    const closeBtn = box.querySelector('.lightbox-close');
    let lastFocus = null;

    const close = () => {
      box.classList.remove('show');
      const done = () => { box.hidden = true; bigImg.removeAttribute('src'); };
      if (reduceMotion) done(); else setTimeout(done, 200);
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    const open = (img) => {
      // Take the largest candidate the srcset offers rather than the rendered
      // src, which is the 900px version sized for the column.
      const set = img.getAttribute('srcset') || '';
      const largest = set.split(',').map((s) => s.trim().split(/\s+/))
        .filter((p) => p.length === 2)
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0];
      bigImg.src = largest ? largest[0] : img.currentSrc || img.src;
      bigImg.alt = img.alt || '';
      lastFocus = document.activeElement;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => box.classList.add('show'));
      closeBtn.focus();
    };

    shots.forEach((img) => {
      img.addEventListener('click', () => open(img));
    });
    box.addEventListener('click', (e) => {
      // Anywhere outside the image closes, including the image itself — at
      // this size there is nothing to do but dismiss.
      if (e.target !== box && !e.target.closest('.lightbox-close') && e.target !== bigImg) return;
      close();
    });
    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      // Only one control inside, so keep focus on it.
      if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    });
  }

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
        if (first) { setCurrent(first.id); return; }
        // Nothing in the band. At the top of the page the first section still
        // sits below it, and keeping the previous mark leaves a stale tab lit —
        // so fall back to the last section the reader has actually passed.
        const passed = sections.filter((s) => s.getBoundingClientRect().top < 100);
        setCurrent((passed[passed.length - 1] || sections[0]).id);
      }, { rootMargin: '-72px 0px -55% 0px', threshold: 0 });

      sections.forEach((s) => io.observe(s));
      setCurrent(sections[0].id);

      // Keep the active tab in view only where the bar actually scrolls — it
      // wraps at reading width, so on most pages there is nothing to move.
      // Instant, never smooth: a sideways animation running underneath a
      // vertical scroll is what made this feel laggy in the first place.
      // The mono face swaps in after first paint and the fallback is wider, so
      // the bar can briefly overflow and get nudged against metrics that are
      // about to change. Hold the auto-scroll until the real font has landed.
      let fontsReady = !document.fonts;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsReady = true; });

      const obsCurrent = new MutationObserver(() => {
        if (!fontsReady) return;
        if (toc.scrollWidth <= toc.clientWidth) return;
        const a = toc.querySelector('a[aria-current="true"]');
        if (!a) return;
        const r = a.getBoundingClientRect();
        const t = toc.getBoundingClientRect();
        if (r.left < t.left + 12 || r.right > t.right - 12) {
          toc.scrollTo({ left: a.offsetLeft - toc.clientWidth / 2 + a.offsetWidth / 2, behavior: 'auto' });
        }
      });
      links.forEach((a) => obsCurrent.observe(a, { attributes: true, attributeFilter: ['aria-current'] }));
    }
  }

  /* ---------- the name: gooey blur that answers the pointer ---------- */
  // The filter is built here rather than declared in CSS on purpose: a CSS
  // `filter: url(#id)` pointing at a filter that does not exist stops the
  // element being rendered at all, so a script failure would delete the name
  // from the page. Built in JS, the worst case is plain sharp text.
  const nameEl = document.querySelector('.identity-name');
  if (nameEl && !reduceMotion) {
    // 2.5, not the 12 the effect was measured from: that figure was cut for a
    // drawn mark with thick strokes and wide counters. Golos 900 caps weld
    // shut well before it — at 3.5 the name stops reading, at 5 it is smears.
    // 2.5 is where the glyphs go liquid and merge at the joins but the name
    // survives, which is the point of the effect rather than the number.
    const MAX_BLUR = 2.5;  // stdDeviation at the centre of the name
    const RADIUS = 850;    // distance at which the effect reaches zero
    const NS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;pointer-events:none';

    const filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', 'name-gooey');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    // The blur spills far outside the glyphs; without an enlarged region the
    // browser clips it back to the element box and the edges go square.
    filter.setAttribute('x', '-150%');
    filter.setAttribute('y', '-150%');
    filter.setAttribute('width', '600%');
    filter.setAttribute('height', '600%');

    const blur = document.createElementNS(NS, 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', '0');
    blur.setAttribute('result', 'blur');

    const shape = document.createElementNS(NS, 'feComponentTransfer');
    shape.setAttribute('in', 'blur');
    shape.setAttribute('result', 'shaped');
    const fa1 = document.createElementNS(NS, 'feFuncA');
    fa1.setAttribute('type', 'table');
    fa1.setAttribute('tableValues', '0 1');
    shape.appendChild(fa1);

    const mask = document.createElementNS(NS, 'feComposite');
    mask.setAttribute('operator', 'in');
    mask.setAttribute('in', 'blur');
    mask.setAttribute('in2', 'shaped');
    mask.setAttribute('result', 'masked');

    // The step that makes this gooey rather than merely soft: alpha is pushed
    // through a slope of 10, so anything half-transparent snaps to fully on or
    // fully off. The glyphs spread and merge, but keep hard edges.
    const harden = document.createElementNS(NS, 'feComponentTransfer');
    harden.setAttribute('in', 'masked');
    const fa2 = document.createElementNS(NS, 'feFuncA');
    fa2.setAttribute('type', 'linear');
    fa2.setAttribute('slope', '10');
    fa2.setAttribute('intercept', '-2');
    harden.appendChild(fa2);

    filter.append(blur, shape, mask, harden);
    svg.appendChild(filter);
    document.body.appendChild(svg);
    nameEl.style.filter = 'url(#name-gooey)';

    let pending = false, px = -9999, py = -9999, applied = -1;

    function paint() {
      const r = nameEl.getBoundingClientRect();
      // Distance to the block, not to its centre: the name is far wider than
      // it is tall, and measuring from the centre would leave the ends dead.
      const dx = Math.max(r.left - px, 0, px - r.right);
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      const d = Math.hypot(dx, dy);
      const v = +(MAX_BLUR * Math.max(0, 1 - d / RADIUS)).toFixed(2);
      if (v !== applied) { applied = v; blur.setAttribute('stdDeviation', v); }
    }

    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => { paint(); pending = false; });
      }
    });
    window.addEventListener('scroll', () => {
      if (!pending) { pending = true; requestAnimationFrame(() => { paint(); pending = false; }); }
    }, { passive: true });
  }
})();
