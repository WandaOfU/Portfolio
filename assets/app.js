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
})();
