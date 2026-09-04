(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Every name this file builds used to be English, on both language trees. A
  // Russian screen reader reads an English aria-label with Russian phonetics,
  // so the overlay announced itself as noise on half the site. The document
  // already declares which language it is in; nothing else has to.
  const RU = document.documentElement.lang === 'ru';
  const T = RU
    ? { dialog: 'Увеличенный экран', close: 'Закрыть',
        enlarge: 'Увеличить экран', enlargeThis: (alt) => 'Увеличить: ' + alt }
    : { dialog: 'Enlarged screen', close: 'Close',
        enlarge: 'Enlarge screen', enlargeThis: (alt) => 'Enlarge: ' + alt };

  /* ---------- case screens: click to enlarge ---------- */
  const shots = [...document.querySelectorAll('.case-shot img')];
  if (shots.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    // Announced as a dialog rather than as a div that happens to cover the
    // page: without these a screen reader has no way to know the overlay is
    // modal, and .shell below stays browsable behind it.
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', T.dialog);
    // Focusable, and that is the whole fix for the overlay's scrolling. The
    // browser scrolls the focused element's nearest scrollable ancestor; the
    // close button is position: fixed, so its containing block is the viewport
    // and the scroll chain skips this element entirely. With focus on the
    // button, PageDown, End and the arrow keys moved nothing, and a 2419px
    // capture in a 900px overlay showed a keyboard user its top third and no
    // way to reach the rest. Focus lands here instead, and the keys work.
    box.setAttribute('tabindex', '-1');
    box.innerHTML = '<button class="lightbox-close" type="button" aria-label="' + T.close + '">'
      + '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'
      + '<path d="M1 1l8 8M9 1l-8 8"/></svg></button>';
    document.body.appendChild(box);
    // Built rather than written into the markup: an <img> with no src is a
    // broken-image box if it ever renders, and this one has no source until
    // something is opened.
    const bigImg = document.createElement('img');
    box.appendChild(bigImg);
    const closeBtn = box.querySelector('.lightbox-close');
    const shell = document.querySelector('.shell');
    let lastFocus = null;

    const close = (morphing) => {
      box.classList.remove('show');
      const done = () => { box.hidden = true; bigImg.removeAttribute('src'); };
      // The view transition is already animating the whole surface; a second
      // 200ms opacity fade underneath it would double the exit.
      if (reduceMotion || morphing) done(); else setTimeout(done, 200);
      document.body.style.overflow = '';
      if (shell) shell.removeAttribute('inert');
      if (lastFocus) lastFocus.focus();
    };

    const open = (img, morphing) => {
      // Take the largest candidate the srcset offers rather than the rendered
      // src, which is the 900px version sized for the column.
      const set = img.getAttribute('srcset') || '';
      const largest = set.split(',').map((s) => s.trim().split(/\s+/))
        .filter((p) => p.length === 2)
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0];
      // Seed from the picture the reader is already looking at. That file is
      // decoded and in cache, so the overlay opens on the screenshot instead of
      // on an empty box — measured, the large capture took 898ms to arrive on a
      // 1.6 Mbps link while the backdrop finished fading at 200ms. The full-size
      // file is fetched behind it and swapped in when it is ready, so the
      // picture sharpens rather than appearing.
      const seed = img.currentSrc || img.src;
      const full = largest ? largest[0] : seed;
      bigImg.src = seed;
      bigImg.alt = img.alt || '';
      if (full !== seed) {
        bigImg.setAttribute('data-state', 'loading');
        const hi = new Image();
        hi.onload = () => {
          // Only if this is still the picture on screen — a reader can close
          // and open another one while a big file is in flight.
          if (bigImg.src === seed || bigImg.currentSrc === seed) bigImg.src = full;
          bigImg.removeAttribute('data-state');
        };
        hi.onerror = () => bigImg.removeAttribute('data-state');
        hi.src = full;
      }
      lastFocus = document.activeElement;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      // Takes the page behind the overlay out of the accessibility tree and
      // the tab order both, which the Tab handler below cannot do on its own.
      if (shell) shell.setAttribute('inert', '');
      // Synchronously when morphing: the transition snapshots the DOM at the
      // end of the update callback, and a class added a frame later is not in it.
      if (morphing) box.classList.add('show');
      else requestAnimationFrame(() => box.classList.add('show'));
      // The container, not the button: it is the scroll container, and it
      // carries the dialog role and label a screen reader announces on entry.
      // Close is one Tab away, and Escape works from either.
      box.focus();
    };

    // The overlay grows out of the picture it enlarges instead of fading in on
    // top of it. Both elements are in the DOM at once, so the name has to be
    // handed from one to the other inside the update callback — two elements
    // holding it at the same time makes the browser skip the morph. The
    // overlay already seeds its src from this exact decoded image, so the
    // morph starts from a picture that is on screen rather than from nothing.
    const morphSupported = () => !reduceMotion && typeof document.startViewTransition === 'function';

    const openFrom = (img) => {
      if (!morphSupported()) { open(img); return; }
      img.style.viewTransitionName = 'zoomed';
      const t = document.startViewTransition(() => {
        img.style.viewTransitionName = '';
        bigImg.style.viewTransitionName = 'zoomed';
        open(img, true);
      });
      t.finished.finally(() => { bigImg.style.viewTransitionName = ''; });
    };

    const closeTo = () => {
      const src = lastFocus && lastFocus.querySelector ? lastFocus.querySelector('img') : null;
      if (!morphSupported() || !src) { close(); return; }
      bigImg.style.viewTransitionName = 'zoomed';
      const t = document.startViewTransition(() => {
        bigImg.style.viewTransitionName = '';
        src.style.viewTransitionName = 'zoomed';
        close(true);
      });
      t.finished.finally(() => { src.style.viewTransitionName = ''; });
    };

    // Wrap each screen in a real button rather than hanging a click handler on
    // the <img>. An image is not focusable and answers no key, so the only way
    // to read a screenshot at legible size used to be the mouse. A button
    // brings the tab stop, Enter and Space, and a focus ring with it — none of
    // which has to be reimplemented here.
    shots.forEach((img) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zoom';
      // Leads with the action; the img's own alt still describes the picture.
      btn.setAttribute('aria-label', img.alt ? T.enlargeThis(img.alt) : T.enlarge);
      img.parentNode.insertBefore(btn, img);
      btn.appendChild(img);
      btn.addEventListener('click', () => openFrom(img));

      // The wrapper owns the frame, so it also owns the load state — the same
      // three-state machine the index plates run. These are lazily loaded and
      // the reader scrolls onto them, which is exactly when a hard pop shows.
      const settleShot = (state) => btn.setAttribute('data-state', state);
      if (img.complete) {
        settleShot(img.naturalWidth > 0 ? 'ready' : 'failed');
      } else {
        settleShot('loading');
        img.addEventListener('load', () => settleShot('ready'), { once: true });
        img.addEventListener('error', () => settleShot('failed'), { once: true });
      }
    });
    box.addEventListener('click', (e) => {
      // Anywhere outside the image closes, including the image itself — at
      // this size there is nothing to do but dismiss.
      if (e.target !== box && !e.target.closest('.lightbox-close') && e.target !== bigImg) return;
      closeTo();
    });
    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') closeTo();
      // Two stops inside, and Tab cycles between them. It used to pin focus to
      // the close button on every press, which trapped it there: once you
      // tabbed off the overlay you could never focus it again, and with it went
      // the only way to scroll a tall capture.
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === closeBtn ? box : closeBtn).focus();
      }
    });
  }

  /* ---------- projects index: skeleton, then the picture ---------- */
  // Wrapped here rather than in the markup so the no-script path keeps the
  // plates it already draws. The wrapper owns the frame; the image only fades.
  const plates = [...document.querySelectorAll('.index-shots img')];
  plates.forEach((img) => {
    const shot = document.createElement('span');
    shot.className = 'shot';
    // Decorative already (alt=""), and the wrapper adds no meaning of its own.
    shot.setAttribute('aria-hidden', 'true');
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);

    const settle = (state) => shot.setAttribute('data-state', state);

    // A cached image is already done before any listener could fire, and
    // naturalWidth separates "decoded" from "complete but broken".
    if (img.complete) {
      settle(img.naturalWidth > 0 ? 'ready' : 'failed');
      return;
    }
    settle('loading');
    img.addEventListener('load', () => settle('ready'), { once: true });
    img.addEventListener('error', () => settle('failed'), { once: true });
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

  /* ---------- one room to the next: the shared title ---------- */
  // Cross-document view transitions do the rest in CSS; this only decides which
  // element travels. The name has to be unique in the document, so on the index
  // exactly one card can carry it — the one just clicked.
  if (!reduceMotion && 'startViewTransition' in document) {
    const NAME = 'case-title';
    const KEY = 'vt-title';

    const claim = (el) => {
      document.querySelectorAll('.index-title').forEach((t) => { t.style.viewTransitionName = ''; });
      if (el) el.style.viewTransitionName = NAME;
    };

    document.querySelectorAll('a.index-item').forEach((card) => {
      // pointerdown, not click: the snapshot is taken as the navigation starts,
      // and this way the name is already set for a middle-click or a slow tap.
      card.addEventListener('pointerdown', () => {
        claim(card.querySelector('.index-title'));
        try { sessionStorage.setItem(KEY, card.getAttribute('href')); } catch { /* private mode */ }
      });
    });

    window.addEventListener('pagereveal', (e) => {
      if (!e.viewTransition) return;
      // Both entrances would run at once otherwise — the browser morphing the
      // page while page-in fades and lifts the children inside it.
      //
      // Set once and never cleared. Removing it when the transition finished
      // was a bug with teeth: `html.vt` suppresses page-in with
      // `animation: none`, so taking the class back off *restarted* the
      // animation from zero and the whole page faded and rose a second time,
      // after the route change had already landed. Measured at the time:
      // opacity 0.97 and climbing, 450ms after the transition was over. The
      // flag belongs to this document, and the document is replaced on the
      // next navigation anyway.
      document.documentElement.classList.add('vt');

      // Coming back to the index: hand the name to the card the reader left
      // from, so the return journey is the same one reversed rather than a
      // plain cross-fade.
      let from = null;
      try { from = sessionStorage.getItem(KEY); } catch { /* private mode */ }
      if (from) {
        const card = [...document.querySelectorAll('a.index-item')]
          .find((a) => a.getAttribute('href') === from);
        if (card) claim(card.querySelector('.index-title'));
      }
    });

    // The name must not outlive the transition, or the next one starts with two
    // elements claiming it and the browser skips the morph entirely.
    window.addEventListener('pageswap', (e) => {
      if (e.viewTransition) e.viewTransition.finished.finally(() => claim(null));
    });
  }

  /* ---------- the name: gooey blur that answers the pointer ---------- */
  // The filter is built here rather than declared in CSS on purpose: a CSS
  // `filter: url(#id)` pointing at a filter that does not exist stops the
  // element being rendered at all, so a script failure would delete the name
  // from the page. Built in JS, the worst case is plain sharp text.
  const nameEl = document.querySelector('.identity-name');
  if (nameEl && !reduceMotion) {
    // 3, not the 12 the effect was measured from: that figure was cut for a
    // drawn mark with thick strokes and wide counters. Golos 900 caps weld
    // shut well before it — the counters in S and A start closing at 3.2, and
    // by 3.5 the name has stopped reading. 3 is the last step that still
    // spends every bit of the effect without costing a letter.
    const MAX_BLUR = 3;    // stdDeviation at the centre of the name
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

    // The name also answers scroll speed, not just proximity: it liquefies
    // while the page is moving fast under it and re-solidifies the moment it
    // stops. Same filter, same ceiling — 3 is where the counters in S and A
    // start to weld shut, and no input is allowed past it.
    const VEL_FULL = 2.6;   // px/ms of scrolling that reaches the ceiling
    const DECAY = 0.86;     // per frame once the scrolling stops
    let velBlur = 0, lastY = window.scrollY, lastT = performance.now(), decaying = false;

    function decay() {
      velBlur *= DECAY;
      if (velBlur < 0.02) { velBlur = 0; decaying = false; }
      paint();
      if (decaying) requestAnimationFrame(decay);
    }

    function paint() {
      const r = nameEl.getBoundingClientRect();
      // Distance to the block, not to its centre: the name is far wider than
      // it is tall, and measuring from the centre would leave the ends dead.
      const dx = Math.max(r.left - px, 0, px - r.right);
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      const d = Math.hypot(dx, dy);
      const near = MAX_BLUR * Math.max(0, 1 - d / RADIUS);
      // Whichever input is asking for more, capped at the same ceiling. They
      // are not added: two effects stacking would take the name past legible.
      const v = +Math.min(MAX_BLUR, Math.max(near, velBlur)).toFixed(2);
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
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        const speed = Math.abs(window.scrollY - lastY) / dt;
        velBlur = Math.max(velBlur, MAX_BLUR * Math.min(1, speed / VEL_FULL));
        lastY = window.scrollY; lastT = now;
      }
      if (!decaying) { decaying = true; requestAnimationFrame(decay); }
      if (!pending) { pending = true; requestAnimationFrame(() => { paint(); pending = false; }); }
    }, { passive: true });
  }

  /* ---------- the ground answers the pointer ---------- */
  // CSS owns the wash; this only feeds it a position and decides whether it
  // exists at all. Gated on a real pointer for the same reason hover is: a
  // touch screen has no cursor to answer, and a wash left lit where a finger
  // last landed is worse than no wash.
  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const root = document.documentElement;
    let gx = 0, gy = 0, queued = false;
    window.addEventListener('pointermove', (e) => {
      gx = e.clientX; gy = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        root.style.setProperty('--glow-x', gx + 'px');
        root.style.setProperty('--glow-y', gy + 'px');
        // Lit on the first real movement, never on arrival: the page should
        // settle before the ground acquires any depth.
        if (!root.classList.contains('lit')) root.classList.add('lit');
        queued = false;
      });
    }, { passive: true });
  }
})();
