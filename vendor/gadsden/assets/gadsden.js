/* Gadsden: piezas globales que comparten las secciones (carrusel, enlaces, protección, anclas, efectos, íconos). */
(function () {
  const root = document.documentElement;
  const designMode = !!(window.Shopify && window.Shopify.designMode);

  window.Gadsden = window.Gadsden || {};
  Gadsden.reduceMotion = () => root.classList.contains('gad-reduce');
  Gadsden.designMode = designMode;

  /* ---------- T07: enlaces a otros sitios en pestaña nueva ---------- */
  const sameSite = new Set(
    [location.hostname, root.dataset.gadPrimaryHost, root.dataset.gadPermanentHost].filter(Boolean)
  );
  const keepInTab = /(^|\.)(myshopify\.com|shopify\.com|shop\.app|shopifycs\.com)$/i;

  function isExternal(a) {
    if (!a || !a.href || a.hasAttribute('download')) return false;
    if (!/^https?:$/.test(a.protocol)) return false;
    if (sameSite.has(a.hostname) || keepInTab.test(a.hostname)) return false;
    if (a.target && a.target !== '_self') return false;
    return true;
  }

  function markExternal(a) {
    a.target = '_blank';
    const rel = new Set((a.rel || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    a.rel = Array.from(rel).join(' ');
  }

  function markAllLinks(scope) {
    (scope || document).querySelectorAll('a[href]').forEach((a) => {
      if (isExternal(a)) markExternal(a);
    });
  }

  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (a && isExternal(a)) markExternal(a);
    },
    true
  );

  /* ---------- T06: protección de contenido ---------- */
  const editable = (el) =>
    !!(el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .gad-selectable'));

  if (root.classList.contains('gad-protect') && !designMode) {
    document.addEventListener('contextmenu', (e) => {
      if (!editable(e.target)) e.preventDefault();
    });
    document.addEventListener('dragstart', (e) => {
      if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'PICTURE' || e.target.tagName === 'A')) e.preventDefault();
    });
    document.addEventListener('selectstart', (e) => {
      if (!editable(e.target)) e.preventDefault();
    });
    document.addEventListener('keydown', (e) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const devtools =
        k === 'f12' ||
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) ||
        (mod && !e.shiftKey && ['u', 's'].includes(k));
      if (devtools) e.preventDefault();
    });
  }

  /* ---------- T10: anclas de sección con scroll suave ---------- */
  function headerOffset(goingUp) {
    const sticky = document.querySelector('sticky-header');
    if (!sticky) return 0;
    const type = sticky.getAttribute('data-sticky-type');
    if (type === 'always' || type === 'reduce-logo-size') return sticky.offsetHeight;
    if (type === 'on-scroll-up' && goingUp) return sticky.offsetHeight;
    return 0;
  }
  Gadsden.headerOffset = headerOffset;

  Gadsden.scrollToTarget = function (target) {
    if (!target) return;
    const rectTop = target.getBoundingClientRect().top;
    const top = rectTop + window.scrollY - headerOffset(rectTop < 0) - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: Gadsden.reduceMotion() ? 'auto' : 'smooth' });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash.length < 2) return;
    let target;
    try {
      target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch (err) {
      return;
    }
    if (!target || !target.hasAttribute('data-gad-anchor')) return;
    e.preventDefault();
    Gadsden.scrollToTarget(target);
    history.replaceState(null, '', url.hash);
  });

  /* ---------- T05: flecha de los botones (efecto "flecha") ---------- */
  const arrowSvg =
    '<svg viewBox="0 0 14 10" aria-hidden="true" focusable="false"><path d="M1 5h11M8.5 1.5 12 5 8.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function addButtonArrows(scope) {
    const linkArrow = root.classList.contains('gad-fx-link-arrow');
    const actionArrow = root.classList.contains('gad-fx-action-arrow');
    if (!linkArrow && !actionArrow) return;
    (scope || document).querySelectorAll('.button, .shopify-payment-button__button').forEach((btn) => {
      if (btn.querySelector(':scope > .gad-btn-arrow') || btn.classList.contains('button--tertiary')) return;
      const isLink = btn.tagName === 'A';
      if ((isLink && !linkArrow) || (!isLink && !actionArrow)) return;
      if (btn.closest('.drawer__close, .quantity, .gad-carousel__arrow')) return;
      const span = document.createElement('span');
      span.className = 'gad-btn-arrow';
      span.innerHTML = arrowSvg;
      btn.appendChild(span);
    });
  }

  /* ---------- D01: íconos por nombre que no existen ---------- */
  function checkIcons(scope) {
    const run = () => {
      (scope || document).querySelectorAll('.gad-icon.material-symbols-outlined:not(.gad-icon--checked)').forEach((el) => {
        const size = parseFloat(getComputedStyle(el).fontSize) || 24;
        el.classList.add('gad-icon--checked');
        if (el.scrollWidth > size * 1.4) el.classList.add('gad-icon--missing');
      });
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('24px "Material Symbols Outlined"').then(run, run);
    } else {
      run();
    }
  }

  /* ---------- T08: paneles de extensiones espía ---------- */
  const spyPattern =
    /(koala|ppspy|pp-spy|shophunter|shop-hunter|commerce-?inspector|shopify-?spy|shopspy|store-?spy|ali-?hunter|dropship-?(io|spy)|minea|ecomhunt|sell-?the-?trend|niche-?scraper|theme-?detector|store-?inspector|shopify-?inspector|spy-?tool|spybox|zikanalytics|winning-?hunter)/i;
  const ownNode = /^(shopify|gad-|gadsden|MainContent|PBarNextFrame|preview-bar|admin-bar|web-pixels|shopify-chat|judgeme|jdgm)/i;

  function looksLikeSpy(el) {
    if (!el || el.nodeType !== 1) return false;
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : '';
    const tag = el.tagName.toLowerCase();
    if (ownNode.test(id) || ownNode.test(tag)) return false;
    return spyPattern.test(id) || spyPattern.test(cls) || spyPattern.test(tag);
  }

  function hideSpy(el) {
    el.setAttribute('data-gad-hidden', '');
    el.style.setProperty('display', 'none', 'important');
  }

  function sweepSpies() {
    [document.body, root].forEach((parent) => {
      if (!parent) return;
      Array.from(parent.children).forEach((el) => {
        if (looksLikeSpy(el)) hideSpy(el);
      });
    });
  }

  if (!designMode) {
    const spyObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (looksLikeSpy(node)) hideSpy(node);
        })
      );
    });
    const startSpyWatch = () => {
      sweepSpies();
      spyObserver.observe(document.body, { childList: true });
      spyObserver.observe(root, { childList: true });
    };
    if (document.body) startSpyWatch();
    else document.addEventListener('DOMContentLoaded', startSpyWatch);
  }

  /* ---------- arranque y contenido que llega después ---------- */
  function refresh(scope) {
    markAllLinks(scope);
    addButtonArrows(scope);
    checkIcons(scope);
  }
  Gadsden.refresh = refresh;

  document.addEventListener('DOMContentLoaded', () => refresh(document));
  document.addEventListener('shopify:section:load', (e) => refresh(e.target));

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => setTimeout(() => refresh(document), 60));
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        subscribe(PUB_SUB_EVENTS.cartUpdate, () => setTimeout(() => refresh(document), 60));
      }
    });
  }
})();

/* ---------- T04: carrusel compartido ---------- */
class GadCarousel extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.viewport = this.querySelector('.gad-carousel__viewport');
    this.track = this.querySelector('.gad-carousel__track');
    this.prevBtn = this.querySelector('.gad-carousel__arrow--prev');
    this.nextBtn = this.querySelector('.gad-carousel__arrow--next');
    this.dotsEl = this.querySelector('.gad-carousel__dots');
    this.originals = Array.from(this.track.children).filter((el) => !/^(STYLE|SCRIPT|TEMPLATE)$/.test(el.tagName));
    this.originals.forEach((el) => el.classList.add('gad-carousel__slide'));
    this.type = this.dataset.type || 'classic';
    this.drag = this.dataset.drag || 'on';
    this.speed = parseFloat(this.dataset.autoplay) || 0;
    this.center = this.dataset.center === 'true';
    this.cfg = { d: this.readCfg('d'), m: this.readCfg('m') };
    this.index = 0;
    this.x = 0;
    this.paused = new Set();
    this.mq = window.matchMedia(`(min-width: ${document.documentElement.dataset.gadBp || '750'}px)`);

    this.onMq = () => this.setup();
    this.mq.addEventListener('change', this.onMq);
    this.prevBtn.addEventListener('click', () => this.move(-1, true));
    this.nextBtn.addEventListener('click', () => this.move(1, true));
    this.addEventListener('keydown', (e) => this.onKey(e));
    this.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.pause('hover'));
    this.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.resume('hover'));
    this.addEventListener('focusin', () => this.pause('focus'));
    this.addEventListener('focusout', (e) => {
      if (!this.contains(e.relatedTarget)) this.resume('focus');
    });
    this.track.addEventListener('transitionend', (e) => {
      if (e.target === this.track && e.propertyName === 'transform') this.normalize();
    });
    this.track.addEventListener('dragstart', (e) => e.preventDefault());
    this.track.addEventListener(
      'load',
      () => {
        if (this.isOn && this.c.ah) this.update();
      },
      true
    );
    this.viewport.addEventListener('pointerdown', (e) => this.onDown(e));
    this.viewport.addEventListener('click', (e) => this.onClickCapture(e), true);

    this.onVisibility = () => (document.hidden ? this.pause('hidden') : this.resume('hidden'));
    document.addEventListener('visibilitychange', this.onVisibility);
    this.io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? this.resume('offscreen') : this.pause('offscreen')));
    });
    this.io.observe(this);
    this.ro = new ResizeObserver(() => {
      if (!this.isOn) return;
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => this.layout());
    });
    this.ro.observe(this.viewport);

    this.addEventListener('shopify:block:select', (e) => {
      const i = this.originals.findIndex((el) => el.contains(e.target) || el === e.target);
      if (i < 0) return;
      this.pause('editor');
      this.goTo(i, !Gadsden.reduceMotion());
    });
    this.addEventListener('shopify:block:deselect', () => this.resume('editor'));

    this.setup();
  }

  disconnectedCallback() {
    this.stopTimer();
    if (this.mq) this.mq.removeEventListener('change', this.onMq);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    this._ready = false;
  }

  readCfg(prefix) {
    try {
      return JSON.parse(this.dataset[prefix]);
    } catch (e) {
      return { on: true, pv: 1, pm: 1, peek: 0, edge: false, ah: false };
    }
  }

  get loop() {
    return this.type === 'loop';
  }

  get fade() {
    return this.type === 'fade';
  }

  setup() {
    this.removeClones();
    this.stopTimer();
    this.c = this.mq.matches ? this.cfg.d : this.cfg.m;
    this.n = this.originals.length;
    this.pv = this.fade ? 1 : Math.max(1, parseInt(this.c.pv, 10) || 1);
    this.pm = Math.max(1, Math.min(parseInt(this.c.pm, 10) || 1, this.pv));
    this.isOn = !!this.c.on && (this.n > this.pv || (this.center && this.n > 1));
    this.classList.toggle('is-active', this.isOn);
    this.classList.toggle('is-static', !this.isOn);
    this.classList.toggle('is-draggable', this.isOn && this.drag !== 'off' && !this.fade);

    this.track.style.transform = '';
    this.track.style.transition = '';
    this.viewport.style.height = '';
    this.originals.forEach((el) => {
      el.inert = false;
      el.removeAttribute('aria-hidden');
      el.classList.remove('is-active', 'is-visible');
    });

    if (!this.isOn) {
      this.prevBtn.hidden = true;
      this.nextBtn.hidden = true;
      this.dotsEl.hidden = true;
      this.dotsEl.innerHTML = '';
      this.originals.forEach((el) => {
        el.removeAttribute('role');
        el.removeAttribute('aria-roledescription');
        el.removeAttribute('aria-label');
      });
      return;
    }

    this.originals.forEach((el) => this.stripReveal(el));

    const slideLabel = this.dataset.labelSlide || '[index] / [count]';
    this.originals.forEach((el, i) => {
      el.setAttribute('role', 'group');
      el.setAttribute('aria-roledescription', 'slide');
      el.setAttribute('aria-label', slideLabel.replace('[index]', i + 1).replace('[count]', this.n));
    });

    if (this.loop) this.addClones();
    this.prevBtn.hidden = false;
    this.nextBtn.hidden = false;
    this.buildDots();
    this.index = Math.min(this.index, this.maxIndex());
    this.layout();
    this.startTimer();
  }

  addClones() {
    const k = Math.min(this.n, this.pv + this.pm + 1);
    this.k = k;
    const head = this.originals.slice(-k).map((el) => this.cloneSlide(el));
    const tail = this.originals.slice(0, k).map((el) => this.cloneSlide(el));
    head.reverse().forEach((el) => this.track.insertBefore(el, this.track.firstChild));
    tail.forEach((el) => this.track.appendChild(el));
  }

  /* dentro de un carrusel activo la aparición animada la hace la sección, no cada ítem */
  stripReveal(el) {
    [el, ...el.querySelectorAll('.scroll-trigger')].forEach((node) => {
      node.classList.remove('scroll-trigger', 'scroll-trigger--offscreen', 'animate--slide-in', 'animate--fade-in');
    });
  }

  cloneSlide(el) {
    const clone = el.cloneNode(true);
    this.stripReveal(clone);
    clone.classList.add('is-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
    clone.removeAttribute('data-shopify-editor-block');
    clone.querySelectorAll('[data-shopify-editor-block]').forEach((child) => child.removeAttribute('data-shopify-editor-block'));
    return clone;
  }

  removeClones() {
    this.track.querySelectorAll(':scope > .is-clone').forEach((el) => el.remove());
    this.k = 0;
  }

  maxIndex() {
    if (this.loop || this.fade || this.center) return this.n - 1;
    return Math.max(0, this.n - this.pv);
  }

  pageCount() {
    if (this.loop || this.fade) return Math.ceil(this.n / this.pm);
    return Math.ceil(this.maxIndex() / this.pm) + 1;
  }

  buildDots() {
    const count = this.pageCount();
    const label = this.dataset.labelDot || '[index]';
    this.dotsEl.innerHTML = '';
    for (let p = 0; p < count; p++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gad-carousel__dot';
      b.setAttribute('aria-label', label.replace('[index]', p + 1));
      b.addEventListener('click', () => {
        this.goTo(Math.min(p * this.pm, this.maxIndex()), true);
        this.restartTimer();
      });
      this.dotsEl.appendChild(b);
    }
    this.dotsEl.hidden = count < 2;
  }

  measure() {
    const first = this.originals[0];
    const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
    // ancho de layout (sin transformaciones: en modo centrado las vecinas están escaladas)
    this.slideW = parseFloat(getComputedStyle(first).width) || first.offsetWidth;
    this.step = this.slideW + gap;
    this.viewW = this.viewport.clientWidth;
    this.peek = Math.max(0, parseFloat(this.c.peek) || 0);
    this.contentW = this.n * this.step - gap;
  }

  posFor(i) {
    if (this.fade) return 0;
    if (this.center) {
      const offset = (this.viewW - this.slideW) / 2;
      if (this.loop) return (i + this.k) * this.step - offset;
      return i * this.step - offset;
    }
    if (this.loop) return (i + this.k) * this.step - this.peek;
    let x = i * this.step;
    if (this.c.edge) return Math.min(Math.max(0, x), Math.max(0, this.contentW - this.viewW));
    return Math.min(Math.max(-this.peek, x - this.peek), Math.max(-this.peek, this.contentW - this.viewW + this.peek));
  }

  layout() {
    if (!this.isOn) return;
    this.measure();
    this.goTo(this.index, false);
  }

  setX(x, animate) {
    this.x = x;
    if (this.fade) return;
    const instant = !animate || Gadsden.reduceMotion();
    this.track.style.transition = instant ? 'none' : '';
    this.track.style.transform = `translate3d(${-x}px, 0, 0)`;
    clearTimeout(this._settle);
    if (instant) {
      void this.track.offsetWidth;
      this.track.style.transition = '';
      if (this.loop) this.normalize();
    } else if (this.loop) {
      // respaldo por si no llega transitionend (pestaña en segundo plano, transición interrumpida)
      this._settle = setTimeout(() => this.normalize(), 650);
    }
  }

  goTo(i, animate) {
    if (!this.isOn) return;
    if (this.loop) {
      const lo = 1 - this.k;
      const hi = this.n - 1 + this.k - this.pv;
      if (i < lo || i > hi) {
        const before = this.index;
        this.normalize(true);
        i += this.index - before;
      }
      i = Math.max(lo, Math.min(hi, i));
    } else if (this.fade) {
      i = ((i % this.n) + this.n) % this.n;
    } else {
      i = Math.max(0, Math.min(this.maxIndex(), i));
    }
    this.index = i;
    this.setX(this.posFor(i), animate);
    this.update();
  }

  normalize(force) {
    if (!this.loop || !this.isOn) return;
    if (this.index >= 0 && this.index < this.n && !force) return;
    const real = ((this.index % this.n) + this.n) % this.n;
    if (real === this.index) return;
    this.x += (real - this.index) * this.step;
    this.index = real;
    this.track.style.transition = 'none';
    this.track.style.transform = `translate3d(${-this.x}px, 0, 0)`;
    void this.track.offsetWidth;
    this.track.style.transition = '';
    this.update();
  }

  move(dir, user) {
    if (!this.isOn) return;
    let target = this.index + dir * this.pm;
    if (!this.loop && !this.fade) {
      if (dir > 0 && this.index >= this.maxIndex()) target = user ? this.maxIndex() : 0;
      if (dir < 0 && this.index <= 0) target = 0;
    }
    this.goTo(target, true);
    if (user) this.restartTimer();
  }

  update() {
    const real = this.loop ? ((this.index % this.n) + this.n) % this.n : this.index;
    const page = this.loop || this.fade ? Math.floor(real / this.pm) : Math.ceil(real / this.pm);
    Array.from(this.dotsEl.children).forEach((d, p) => {
      const on = p === Math.min(page, this.dotsEl.children.length - 1);
      d.classList.toggle('is-active', on);
      if (on) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    if (!this.loop && !this.fade) {
      this.prevBtn.disabled = this.index <= 0;
      this.nextBtn.disabled = this.index >= this.maxIndex();
    } else {
      this.prevBtn.disabled = false;
      this.nextBtn.disabled = false;
    }
    const visible = [];
    this.originals.forEach((el, i) => {
      let rel = i - real;
      let isVisible;
      if (this.center) {
        let dist = Math.abs(rel);
        if (this.loop) dist = Math.min(dist, this.n - dist);
        isVisible = dist <= Math.ceil((this.pv - 1) / 2);
      } else {
        if (this.loop && rel < 0) rel += this.n;
        isVisible = rel >= 0 && rel < this.pv;
      }
      el.classList.toggle('is-active', i === real);
      el.classList.toggle('is-visible', isVisible);
      el.inert = !isVisible;
      if (isVisible) {
        el.removeAttribute('aria-hidden');
        visible.push(el);
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });
    if (this.c.ah) {
      const h = Math.max(...visible.map((el) => el.offsetHeight), 0);
      if (h) this.viewport.style.height = `${h}px`;
    }
    this.dispatchEvent(new CustomEvent('gad:carousel:change', { bubbles: true, detail: { index: real, visible } }));
  }

  onKey(e) {
    if (!this.isOn || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.move(-1, true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.move(1, true);
    }
  }

  /* arrastre con mouse o dedo; el scroll vertical queda libre (touch-action: pan-y) */
  onDown(e) {
    if (!this.isOn || this.drag === 'off' || this.fade || e.button > 0) return;
    if (e.target.closest('input, textarea, select, button, .gad-no-drag')) return;
    this.dragState = { id: e.pointerId, x0: e.clientX, y0: e.clientY, startX: this.x, moved: false, decided: false, last: [] };
    this.onMoveBound = this.onMoveBound || ((ev) => this.onMove(ev));
    this.onUpBound = this.onUpBound || ((ev) => this.onUp(ev));
    window.addEventListener('pointermove', this.onMoveBound, { passive: false });
    window.addEventListener('pointerup', this.onUpBound);
    window.addEventListener('pointercancel', this.onUpBound);
  }

  onMove(e) {
    const s = this.dragState;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      s.decided = true;
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!s.horizontal) return this.endDrag();
      s.moved = true;
      this.classList.add('is-dragging');
      this.pause('drag');
      if (this.loop) {
        this.normalize(true);
        s.startX = this.x;
      }
    }
    if (!s.horizontal) return;
    e.preventDefault();
    let x = s.startX - dx;
    if (!this.loop) {
      const min = this.posFor(0);
      const max = this.posFor(this.maxIndex());
      if (x < min) x = min - (min - x) * 0.35;
      if (x > max) x = max + (x - max) * 0.35;
    }
    this.track.style.transition = 'none';
    this.x = x;
    this.track.style.transform = `translate3d(${-x}px, 0, 0)`;
    s.last.push({ t: e.timeStamp, x: e.clientX });
    if (s.last.length > 5) s.last.shift();
  }

  onUp(e) {
    const s = this.dragState;
    if (!s || (e && e.pointerId !== s.id)) return;
    if (s.moved) {
      this.track.style.transition = '';
      const pts = s.last;
      let v = 0;
      if (pts.length > 1) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        v = (b.x - a.x) / Math.max(1, b.t - a.t);
        v = Math.max(-2.5, Math.min(2.5, v));
      }
      const dx = s.startX - this.x;
      if (this.drag === 'free') {
        let target = this.x - v * 280;
        if (!this.loop) target = Math.min(Math.max(this.posFor(0), target), this.posFor(this.maxIndex()));
        const raw = this.loop ? (target + this.peek) / this.step - this.k : (target + (this.c.edge ? 0 : this.peek)) / this.step;
        this.index = Math.round(raw);
        if (this.loop) this.index = Math.max(1 - this.k, Math.min(this.n - 1 + this.k - this.pv, this.index));
        else this.index = Math.max(0, Math.min(this.maxIndex(), this.index));
        this.setX(target, true);
        this.update();
      } else {
        let delta = 0;
        const travelled = -dx / this.step;
        if (Math.abs(travelled) > 0.2 || Math.abs(v) > 0.35) {
          delta = Math.sign(travelled || -v) * Math.max(1, Math.round(Math.abs(travelled)));
        }
        this.goTo(this.index + delta, true);
      }
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false), 50);
      this.resume('drag');
      this.restartTimer();
    }
    this.endDrag();
  }

  endDrag() {
    this.classList.remove('is-dragging');
    this.dragState = null;
    window.removeEventListener('pointermove', this.onMoveBound);
    window.removeEventListener('pointerup', this.onUpBound);
    window.removeEventListener('pointercancel', this.onUpBound);
  }

  onClickCapture(e) {
    if (this.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      this.suppressClick = false;
    }
  }

  /* pase automático: se frena con el mouse encima, con foco, arrastrando, fuera de pantalla o en otra pestaña */
  startTimer() {
    this.stopTimer();
    if (!this.isOn || !this.speed || this.paused.size || Gadsden.reduceMotion()) return;
    this.timer = setTimeout(() => {
      this.move(1, false);
      this.startTimer();
    }, this.speed * 1000);
  }

  stopTimer() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  restartTimer() {
    if (this.speed) this.startTimer();
  }

  pause(reason) {
    this.paused.add(reason);
    this.stopTimer();
  }

  resume(reason) {
    this.paused.delete(reason);
    if (!this.paused.size) this.startTimer();
  }
}

if (!customElements.get('gad-carousel')) customElements.define('gad-carousel', GadCarousel);

/* ---------- video con carga diferida, play/pausa, sonido y línea de tiempo ---------- */
class GadVideo extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.video = this.querySelector('video');
    if (!this.video) return;
    this.autoplay = this.dataset.autoplay === 'true' && !Gadsden.reduceMotion();
    this.classList.toggle('gad-video--tap', this.classList.contains('gad-video--tap') || !this.autoplay);
    this.playBtn = this.querySelector('.gad-video__play');
    this.soundBtn = this.querySelector('.gad-video__sound');
    this.bar = this.querySelector('.gad-video__timeline span');
    this.inView = false;
    this.slideVisible = true;
    this.userPaused = false;

    if (this.playBtn) this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    if (this.classList.contains('gad-video--tap'))
      this.video.addEventListener('click', () => this.toggle());
    if (this.soundBtn) this.soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setMuted(!this.video.muted);
    });
    this.video.addEventListener('play', () => this.sync());
    this.video.addEventListener('pause', () => this.sync());
    if (this.bar)
      this.video.addEventListener('timeupdate', () => {
        const d = this.video.duration;
        this.bar.style.width = d ? `${(this.video.currentTime / d) * 100}%` : '0%';
      });

    this.slide = this.closest('.gad-carousel__slide');
    const carousel = this.closest('gad-carousel');
    if (carousel && this.slide) {
      this.onSlides = () => {
        this.slideVisible = this.slide.classList.contains('is-visible') || !carousel.classList.contains('is-active');
        this.decide();
      };
      carousel.addEventListener('gad:carousel:change', this.onSlides);
      this.carousel = carousel;
    }

    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.inView = entry.isIntersecting;
          if (this.inView && this.video.preload === 'none') this.video.preload = 'auto';
          this.decide();
        });
      },
      { rootMargin: '200px 0px' }
    );
    this.io.observe(this);
    this.sync();
  }

  disconnectedCallback() {
    if (this.io) this.io.disconnect();
    if (this.carousel && this.onSlides) this.carousel.removeEventListener('gad:carousel:change', this.onSlides);
    this._ready = false;
  }

  decide() {
    // Como el código propio: en un carrusel se reproducen todos los videos que están a la vista (copias del loop incluidas),
    // no sólo el de la diapositiva activa. inView ya cuenta el recorte del carrusel.
    const shouldPlay = this.inView;
    if (!shouldPlay) {
      if (!this.video.paused) this.video.pause();
      return;
    }
    if (this.autoplay && !this.userPaused && this.video.paused) {
      this.video.muted = this.soundBtn ? this.video.muted : true;
      const p = this.video.play();
      if (p && p.catch) p.catch(() => this.sync());
    }
  }

  toggle() {
    if (this.video.paused) {
      this.userPaused = false;
      if (this.video.preload === 'none') this.video.preload = 'auto';
      this.video.play().catch(() => {});
    } else {
      this.userPaused = true;
      this.video.pause();
    }
  }

  setMuted(muted) {
    this.video.muted = muted;
    if (!muted && this.video.paused) this.toggle();
    this.sync();
  }

  sync() {
    const playing = !this.video.paused;
    this.classList.toggle('is-playing', playing);
    if (this.playBtn) this.playBtn.setAttribute('aria-label', playing ? this.playBtn.dataset.labelPause : this.playBtn.dataset.labelPlay);
    if (this.soundBtn) {
      this.classList.toggle('is-muted', this.video.muted);
      this.soundBtn.setAttribute('aria-pressed', String(!this.video.muted));
      this.soundBtn.setAttribute('aria-label', this.video.muted ? this.soundBtn.dataset.labelUnmute : this.soundBtn.dataset.labelMute);
    }
  }
}

if (!customElements.get('gad-video')) customElements.define('gad-video', GadVideo);

/* ---------- T11: botón de agregar al carrito dentro de secciones ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('[data-gad-atc]');
  if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
  e.preventDefault();
  const skip = btn.dataset.skipCart === 'true';
  const box = btn.closest('.gad-atc');
  const errorEl = box && box.querySelector('.gad-atc__error');
  let body;

  if (btn.dataset.gadAtc === 'main') {
    const form = document.querySelector('product-form form[data-type="add-to-cart-form"]');
    if (!form) return;
    if (!skip) {
      if (form.requestSubmit) form.requestSubmit();
      else form.querySelector('[type="submit"]').click();
      return;
    }
    body = new FormData(form);
  } else {
    body = new FormData();
    body.append('id', btn.dataset.variantId);
    body.append('quantity', '1');
  }

  const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
  if (cart && !skip && cart.getSectionsToRender) {
    body.append('sections', cart.getSectionsToRender().map((s) => s.id));
    body.append('sections_url', window.location.pathname);
    if (cart.setActiveElement) cart.setActiveElement(btn);
  }

  if (errorEl) errorEl.hidden = true;
  btn.setAttribute('aria-disabled', 'true');
  btn.classList.add('loading');
  const spinner = btn.querySelector('.loading__spinner');
  if (spinner) spinner.classList.remove('hidden');

  fetch(window.routes.cart_add_url, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/javascript' },
    body,
  })
    .then((r) => r.json())
    .then((res) => {
      if (res.status) {
        if (errorEl) {
          errorEl.textContent = res.description || res.message || window.cartStrings.error;
          errorEl.hidden = false;
        }
        return;
      }
      if (skip) {
        window.location.href = `${(window.Shopify && Shopify.routes && Shopify.routes.root) || '/'}checkout`;
        return;
      }
      if (!cart || !cart.renderContents) {
        window.location.href = window.routes.cart_url;
        return;
      }
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined')
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gad-atc', productVariantId: body.get('id'), cartData: res });
      cart.classList.remove('is-empty');
      cart.renderContents(res);
    })
    .catch(() => {
      if (errorEl) {
        errorEl.textContent = window.cartStrings.error;
        errorEl.hidden = false;
      }
    })
    .finally(() => {
      btn.classList.remove('loading');
      btn.removeAttribute('aria-disabled');
      if (spinner) spinner.classList.add('hidden');
    });
});

/* ---------- S11: volver arriba ---------- */
(function () {
  const btn = document.querySelector('.gad-top');
  if (!btn) return;
  btn.hidden = false;
  const after = parseInt(btn.dataset.after, 10) || 0;
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.classList.toggle('is-visible', window.scrollY > after && document.documentElement.scrollHeight > window.innerHeight + after);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: Gadsden.reduceMotion() ? 'auto' : 'smooth' });
    const target = document.getElementById('MainContent');
    if (target) target.focus({ preventScroll: true });
  });
  update();
})();

/* ---------- H04: cupón de la barra de anuncios, se copia con un toque ---------- */
if (!customElements.get('gad-copy'))
  customElements.define(
    'gad-copy',
    class GadCopy extends HTMLElement {
      connectedCallback() {
        const button = this.querySelector('button');
        if (!button || button.dataset.gadReady) return;
        button.dataset.gadReady = '1';
        button.addEventListener('click', () => this.copy());
      }
      async copy() {
        const code = this.dataset.code || '';
        let ok = false;
        try {
          await navigator.clipboard.writeText(code);
          ok = true;
        } catch (e) {
          const area = document.createElement('textarea');
          area.value = code;
          area.setAttribute('readonly', '');
          area.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(area);
          area.select();
          try {
            ok = document.execCommand('copy');
          } catch (err) {}
          area.remove();
        }
        if (!ok) return;
        const label = this.querySelector('[data-gad-copy-label]');
        const status = this.querySelector('[data-gad-copy-status]');
        if (!this.original) this.original = label.textContent;
        label.textContent = this.dataset.copied || this.original;
        if (status) status.textContent = this.dataset.copied || '';
        this.classList.add('is-copied');
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          label.textContent = this.original;
          if (status) status.textContent = '';
          this.classList.remove('is-copied');
        }, 2000);
      }
    }
  );

/* ---------- E05: formulario de contacto, aviso por campo antes de enviar ---------- */
if (!customElements.get('gad-contact-form'))
  customElements.define(
    'gad-contact-form',
    class GadContactForm extends HTMLElement {
      connectedCallback() {
        const form = this.querySelector('form');
        if (!form || form.dataset.gadReady) return;
        form.dataset.gadReady = '1';
        form.noValidate = true;
        form.addEventListener('submit', (event) => {
          let first = null;
          this.querySelectorAll('[data-gad-required]').forEach((input) => {
            const value = input.value.trim();
            const bad = !value || (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
            this.mark(input, bad);
            if (bad && !first) first = input;
          });
          if (first) {
            event.preventDefault();
            first.focus();
          }
        });
        this.addEventListener('input', (event) => {
          if (event.target.matches('[data-gad-required]')) this.mark(event.target, false);
        });
      }
      mark(input, bad) {
        const error = document.getElementById(input.dataset.gadError);
        if (error) error.hidden = !bad;
        if (bad) {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', input.dataset.gadError);
        } else {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
        }
      }
    }
  );

/* ---------- E09/E10: la muestra de la tarjeta muestra la foto de su variante ---------- */
(() => {
  const swap = (link, on) => {
    const card = link.closest('.card-wrapper');
    const img = card && card.querySelector('.card__media img');
    if (!img) return;
    if (on) {
      if (!img.dataset.gadSrc) {
        img.dataset.gadSrc = img.getAttribute('src') || '';
        img.dataset.gadSrcset = img.getAttribute('srcset') || '';
      }
      img.removeAttribute('srcset');
      img.src = link.dataset.gadSwImg;
    } else if (img.dataset.gadSrc) {
      img.src = img.dataset.gadSrc;
      if (img.dataset.gadSrcset) img.setAttribute('srcset', img.dataset.gadSrcset);
    }
  };
  document.addEventListener('mouseover', (event) => {
    const link = event.target.closest && event.target.closest('[data-gad-sw-img]');
    if (link) swap(link, true);
  });
  document.addEventListener('mouseout', (event) => {
    const link = event.target.closest && event.target.closest('[data-gad-sw-img]');
    if (link && !link.contains(event.relatedTarget)) swap(link, false);
  });
})();

/* ---------- S12: seguimiento de pedido, abre el rastreador con el código ---------- */
if (!customElements.get('gad-track-order'))
  customElements.define(
    'gad-track-order',
    class GadTrackOrder extends HTMLElement {
      connectedCallback() {
        const form = this.querySelector('form');
        if (!form || form.dataset.gadReady) return;
        form.dataset.gadReady = '1';
        const input = form.querySelector('input');
        const error = this.querySelector('.gad-track__error');
        input.addEventListener('input', () => {
          error.hidden = true;
          input.removeAttribute('aria-invalid');
        });
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const code = input.value.trim();
          if (!code) {
            error.hidden = false;
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            return;
          }
          const url = (this.dataset.url || '').split('{codigo}').join(encodeURIComponent(code));
          if (!url) return;
          if (this.dataset.newTab === 'true') window.open(url, '_blank', 'noopener');
          else window.location.href = url;
        });
      }
    }
  );

/* ---------- T13: ventana para cambiar al idioma del navegador ---------- */
if (!customElements.get('gad-language-popup'))
  customElements.define(
    'gad-language-popup',
    class GadLanguagePopup extends HTMLElement {
      connectedCallback() {
        const key = 'gad-language-popup';
        const dialog = this.querySelector('dialog');
        if (!dialog || Gadsden.designMode) return;
        let seen = null;
        try {
          seen = localStorage.getItem(key);
        } catch (e) {}
        if (seen) return;
        const available = (this.dataset.languages || '').split(',').filter(Boolean);
        const current = (this.dataset.current || '').toLowerCase();
        const wanted = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])
          .map((l) => l.toLowerCase())
          .map((l) => available.find((a) => a.toLowerCase() === l) || available.find((a) => a.toLowerCase().split('-')[0] === l.split('-')[0]))
          .find(Boolean);
        if (!wanted || wanted.toLowerCase() === current || wanted.toLowerCase().split('-')[0] === current.split('-')[0]) return;
        const select = dialog.querySelector('select');
        if (select) select.value = wanted;
        const remember = () => {
          try {
            localStorage.setItem(key, '1');
          } catch (e) {}
        };
        dialog.querySelector('[data-gad-lang-stay]').addEventListener('click', () => {
          remember();
          dialog.close();
        });
        dialog.addEventListener('cancel', remember);
        dialog.querySelector('form').addEventListener('submit', remember);
        setTimeout(() => dialog.showModal(), 600);
      }
    }
  );

/* ---------- ventanas simples: [data-gad-dialog="id"] abre, [data-gad-dialog-close] o el fondo cierran.
   Los iframes cargan al abrir (data-src) y se descargan al cerrar, para cortar el video. ---------- */
(() => {
  const open = (dialog) => {
    dialog.querySelectorAll('iframe[data-src]').forEach((f) => (f.src = f.dataset.src));
    dialog.showModal();
    document.documentElement.classList.add('gad-modal-open');
  };
  const close = (dialog) => {
    dialog.close();
  };
  document.addEventListener('click', (event) => {
    const opener = event.target.closest && event.target.closest('[data-gad-dialog]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.gadDialog);
      if (dialog && typeof dialog.showModal === 'function') open(dialog);
      return;
    }
    const closer = event.target.closest && event.target.closest('[data-gad-dialog-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog) close(dialog);
      return;
    }
    if (event.target.tagName === 'DIALOG' && event.target.matches('.gad-gp__dialog, .gad-x-dialog')) close(event.target);
  });
  document.addEventListener(
    'close',
    (event) => {
      const dialog = event.target;
      if (!(dialog instanceof HTMLDialogElement) || !dialog.matches('.gad-gp__dialog, .gad-x-dialog')) return;
      dialog.querySelectorAll('iframe[data-src]').forEach((f) => f.removeAttribute('src'));
      if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('gad-modal-open');
    },
    true
  );
})();

/* ---------- S14: popup promocional ---------- */
if (!customElements.get('gad-promo-popup'))
  customElements.define(
    'gad-promo-popup',
    class GadPromoPopup extends HTMLElement {
      connectedCallback() {
        const dialog = this.querySelector('dialog');
        if (!dialog || this.dataset.ready) return;
        this.dataset.ready = '1';
        const key = 'gad-promo-closed';
        const sentKey = 'gad-promo-sent';
        const mode = this.dataset.mode;
        const form = dialog.querySelector('form');
        let sent = false;
        try {
          sent = sessionStorage.getItem(sentKey) === '1' && /customer_posted=true/.test(location.search);
          if (sent) sessionStorage.removeItem(sentKey);
        } catch (e) {}
        if (form)
          form.addEventListener('submit', () => {
            try {
              sessionStorage.setItem(sentKey, '1');
            } catch (e) {}
          });
        const showSuccess = sent || mode === 'success_testing';
        if (showSuccess) {
          dialog.querySelector('[data-gad-promo-offer]').hidden = true;
          dialog.querySelector('[data-gad-promo-success]').hidden = false;
        }
        const close = () => {
          dialog.close();
        };
        dialog.addEventListener('close', () => {
          if (mode === 'enabled') {
            try {
              localStorage.setItem(key, String(Date.now()));
            } catch (e) {}
          }
        });
        dialog.addEventListener('click', (event) => {
          if (event.target === dialog || event.target.closest('[data-gad-promo-close]')) close();
        });
        if (mode === 'enabled' && !showSuccess) {
          let last = 0;
          try {
            last = parseInt(localStorage.getItem(key) || '0', 10);
          } catch (e) {}
          const days = parseFloat(this.dataset.days || '30') * 86400000;
          if (last && Date.now() - last < days) return;
        }
        if (this.hasAttribute('data-design') && mode === 'enabled') return;
        const wait = showSuccess ? 0 : parseFloat(this.dataset.seconds || '5') * 1000;
        setTimeout(() => {
          if (document.querySelector('dialog[open]')) return;
          dialog.showModal();
          const timer = dialog.querySelector('[data-gad-promo-timer]');
          if (timer && !showSuccess) {
            const end = Date.now() + parseInt(timer.dataset.seconds, 10) * 1000;
            const out = timer.querySelector('[data-gad-promo-time]');
            const tick = () => {
              const left = Math.max(0, Math.round((end - Date.now()) / 1000));
              out.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
              if (left > 0 && dialog.open) setTimeout(tick, 1000);
            };
            tick();
          }
        }, wait);
      }
    }
  );

/* ---------- S15/S16: reproductor de música (nunca arranca solo) ---------- */
if (!customElements.get('gad-music'))
  customElements.define(
    'gad-music',
    class GadMusic extends HTMLElement {
      connectedCallback() {
        const audio = this.querySelector('audio');
        const button = this.querySelector('.gad-music__toggle');
        if (!audio || !button || this.dataset.ready) return;
        this.dataset.ready = '1';
        audio.volume = Math.min(1, Math.max(0, parseFloat(this.dataset.volume || '30') / 100));
        const seek = this.querySelector('[data-gad-music-seek]');
        const time = this.querySelector('[data-gad-music-time]');
        const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
        const sync = () => {
          const playing = !audio.paused;
          this.classList.toggle('is-playing', playing);
          button.setAttribute('aria-pressed', String(playing));
          button.setAttribute('aria-label', playing ? button.dataset.labelPause : button.dataset.labelPlay);
        };
        button.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
        audio.addEventListener('play', sync);
        audio.addEventListener('pause', sync);
        audio.addEventListener('timeupdate', () => {
          if (seek && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
          if (time) time.textContent = fmt(audio.currentTime);
        });
        if (seek)
          seek.addEventListener('input', () => {
            if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
          });
      }
    }
  );

/* ---------- plata con el formato de la tienda ---------- */
Gadsden.formatMoney = function (cents, format) {
  const fmt = format || '${{amount}}';
  const value = Number(cents) || 0;
  const group = (n, dec, thousands, decimal) => {
    const fixed = (n / 100).toFixed(dec);
    const [int, frac] = fixed.split('.');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (frac ? decimal + frac : '');
  };
  return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (m, key) => {
    switch (key) {
      case 'amount_no_decimals':
        return group(value, 0, ',', '.');
      case 'amount_with_comma_separator':
        return group(value, 2, '.', ',');
      case 'amount_no_decimals_with_comma_separator':
        return group(value, 0, '.', ',');
      case 'amount_with_apostrophe_separator':
        return group(value, 2, "'", '.');
      case 'amount_with_space_separator':
        return group(value, 2, ' ', ',');
      default:
        return group(value, 2, ',', '.');
    }
  });
};

/* ---------- agregar varios al carrito y mostrar el cajón (S17, S28) ---------- */
Gadsden.addItems = async function (items) {
  const drawer = document.querySelector('cart-drawer');
  const body = { items };
  if (drawer && drawer.getSectionsToRender) {
    body.sections = drawer.getSectionsToRender().map((s) => s.id);
    body.sections_url = window.location.pathname;
  }
  const response = await fetch(window.routes.cart_add_url, { ...fetchConfig(), body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.status) throw new Error(data.description || data.message || 'error');
  if (drawer && drawer.renderContents) {
    drawer.classList.remove('is-empty');
    drawer.renderContents(data);
  } else {
    window.location.href = window.routes.cart_url;
  }
  return data;
};

/* ---------- S17: ofertas combinadas ---------- */
if (!customElements.get('gad-bundle'))
  customElements.define(
    'gad-bundle',
    class GadBundle extends HTMLElement {
      connectedCallback() {
        if (this.dataset.ready) return;
        this.dataset.ready = '1';
        this.addEventListener('change', () => this.update());
        const button = this.querySelector('[data-gad-bundle-add]');
        button.addEventListener('click', async () => {
          const items = this.selected().map((r) => ({ id: Number(r.id), quantity: 1 }));
          const error = this.querySelector('.gad-bundle__error');
          error.hidden = true;
          if (!items.length) return;
          button.setAttribute('aria-busy', 'true');
          button.disabled = true;
          try {
            await Gadsden.addItems(items);
          } catch (e) {
            error.textContent = (window.cartStrings && window.cartStrings.error) || e.message;
            error.hidden = false;
          } finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
          }
        });
        this.update();
      }
      selected() {
        return [...this.querySelectorAll('.gad-bundle__item')]
          .filter((row) => row.querySelector('[data-gad-bundle-check]').checked)
          .map((row) => {
            const v = row.querySelector('[data-gad-bundle-variant]');
            const price = v.tagName === 'SELECT' ? v.selectedOptions[0].dataset.price : v.dataset.price;
            return { id: v.value, price: Number(price) || 0 };
          });
      }
      update() {
        const list = this.selected();
        const full = list.reduce((n, r) => n + r.price, 0);
        const keep = Number(this.dataset.keep || 100);
        const fmt = this.dataset.moneyFormat;
        const total = this.querySelector('[data-gad-bundle-total]');
        const strike = this.querySelector('[data-gad-bundle-full]');
        if (total) total.textContent = Gadsden.formatMoney(Math.round((full * keep) / 100), fmt);
        if (strike) strike.textContent = keep < 100 && full ? Gadsden.formatMoney(full, fmt) : '';
        this.querySelector('[data-gad-bundle-add]').disabled = list.length === 0;
      }
    }
  );

/* ---------- S18: cambiador de colores (pisa la combinación 1, la principal) ---------- */
(() => {
  const key = 'gad-palette';
  const apply = (data) => {
    let style = document.getElementById('GadPalette');
    if (!data) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = 'GadPalette';
      document.head.appendChild(style);
    }
    style.textContent =
      ':root, body, .color-scheme-1 { --color-background: ' + data.bg + '; --gradient-background: rgb(' + data.bg + '); --color-foreground: ' + data.fg +
      '; --color-button: ' + data.btn + '; --color-button-text: ' + data.btnText + '; --color-secondary-button-text: ' + data.btn + '; --color-link: ' + data.btn + '; } body { background-color: rgb(' + data.bg + '); }';
  };
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(key) || 'null');
  } catch (e) {}
  if (saved) apply(saved);
  if (customElements.get('gad-color-switcher')) return;
  customElements.define(
    'gad-color-switcher',
    class GadColorSwitcher extends HTMLElement {
      connectedCallback() {
        const items = [...this.querySelectorAll('[data-gad-palette]')];
        const mark = (id) => items.forEach((b) => {
          const on = b.dataset.gadPalette === (id || '');
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
        mark(saved && saved.id);
        items.forEach((b) =>
          b.addEventListener('click', () => {
            const data = b.dataset.gadPalette ? { id: b.dataset.gadPalette, bg: b.dataset.bg, fg: b.dataset.fg, btn: b.dataset.btn, btnText: b.dataset.btnText } : null;
            apply(data);
            saved = data;
            mark(data && data.id);
            try {
              if (data) localStorage.setItem(key, JSON.stringify(data));
              else localStorage.removeItem(key);
            } catch (e) {}
          })
        );
      }
    }
  );
})();

/* ---------- S22: historias ---------- */
if (!customElements.get('gad-stories'))
  customElements.define(
    'gad-stories',
    class GadStories extends HTMLElement {
      connectedCallback() {
        if (this.dataset.ready) return;
        this.dataset.ready = '1';
        this.dialog = this.querySelector('dialog');
        this.slides = [...this.querySelectorAll('.gad-st__slide')];
        this.bars = [...this.querySelectorAll('.gad-st__bar i')];
        this.seconds = parseFloat(this.dataset.seconds || '5');
        this.querySelectorAll('[data-gad-story]').forEach((b) => b.addEventListener('click', () => this.open(Number(b.dataset.gadStory))));
        this.querySelector('[data-gad-story-next]').addEventListener('click', () => this.go(this.index + 1));
        this.querySelector('[data-gad-story-prev]').addEventListener('click', () => this.go(this.index - 1));
        this.querySelector('[data-gad-story-close]').addEventListener('click', () => this.dialog.close());
        this.dialog.addEventListener('close', () => this.stop());
        this.dialog.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') this.go(this.index + 1);
          if (e.key === 'ArrowLeft') this.go(this.index - 1);
        });
      }
      open(i) {
        this.dialog.showModal();
        document.documentElement.classList.add('gad-modal-open');
        this.go(i);
      }
      stop() {
        cancelAnimationFrame(this.raf);
        this.slides.forEach((s) => {
          const v = s.querySelector('video');
          if (v) v.pause();
        });
        if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('gad-modal-open');
      }
      go(i) {
        if (i < 0) i = 0;
        if (i >= this.slides.length) {
          this.dialog.close();
          return;
        }
        cancelAnimationFrame(this.raf);
        this.index = i;
        this.slides.forEach((s, n) => {
          s.hidden = n !== i;
          const v = s.querySelector('video');
          if (v && n !== i) v.pause();
        });
        this.bars.forEach((b, n) => (b.style.width = n < i ? '100%' : '0'));
        const video = this.slides[i].querySelector('video');
        const start = performance.now();
        const step = () => {
          let p;
          if (video) {
            p = video.duration ? video.currentTime / video.duration : 0;
          } else {
            p = (performance.now() - start) / (this.seconds * 1000);
          }
          this.bars[i].style.width = Math.min(100, p * 100) + '%';
          if (p >= 1 || (video && video.ended)) return this.go(i + 1);
          this.raf = requestAnimationFrame(step);
        };
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
        this.raf = requestAnimationFrame(step);
      }
    }
  );

/* ---------- P12: cupón con un clic ---------- */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest && e.target.closest('[data-gad-apply-code]');
  if (!btn || btn.disabled) return;
  const code = btn.dataset.gadApplyCode;
  btn.disabled = true;
  btn.classList.add('loading');
  try {
    await fetch(`${window.Shopify && Shopify.routes ? Shopify.routes.root : '/'}discount/${encodeURIComponent(code)}`, { credentials: 'same-origin' });
    try {
      sessionStorage.setItem('gad-code-' + code, '1');
    } catch (err) {}
    Gadsden.markCodes(document);
  } catch (err) {
    btn.disabled = false;
  }
  btn.classList.remove('loading');
});
Gadsden.markCodes = function (scope) {
  scope.querySelectorAll('[data-gad-apply-code]').forEach((btn) => {
    let done = false;
    try {
      done = sessionStorage.getItem('gad-code-' + btn.dataset.gadApplyCode) === '1';
    } catch (err) {}
    const box = btn.closest('.gad-p-code');
    if (box) box.classList.toggle('is-applied', done);
    btn.disabled = done;
  });
};
Gadsden.markCodes(document);
document.addEventListener('shopify:section:load', (e) => Gadsden.markCodes(e.target));

/* ---------- P14 y P18: lo que se suma junto con el producto principal ---------- */
Gadsden.mainQuantity = function (formId) {
  const input = document.querySelector(`input[name="quantity"][form="${formId}"]`) || document.querySelector(`#${formId} input[name="quantity"]`);
  return Math.max(1, parseInt(input && input.value, 10) || 1);
};
if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
  subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
    if (!event || event.source !== 'product-form') return;
    const items = [];
    document.querySelectorAll('[data-gad-with-main]').forEach((box) => {
      const form = document.getElementById(box.dataset.form);
      const idInput = form && form.querySelector('[name="id"]');
      if (!idInput || String(idInput.value) !== String(event.productVariantId)) return;
      box.querySelectorAll('input[data-gad-addon]:checked').forEach((c) => items.push({ id: Number(c.value), quantity: 1 }));
      const qty = Gadsden.mainQuantity(box.dataset.form);
      box.querySelectorAll('[data-gad-qgift]').forEach((g) => {
        if (qty >= Number(g.dataset.min)) items.push({ id: Number(g.dataset.variant), quantity: 1, properties: { _gad_extra: 'regalo' } });
      });
    });
    if (items.length) setTimeout(() => Gadsden.addItems(items).catch(() => {}), 150);
  });
}

if (!customElements.get('gad-qty-gifts'))
  customElements.define(
    'gad-qty-gifts',
    class extends HTMLElement {
      connectedCallback() {
        this.update = () => {
          const qty = Gadsden.mainQuantity(this.dataset.form);
          this.querySelectorAll('[data-gad-qgift]').forEach((g) => g.classList.toggle('is-unlocked', qty >= Number(g.dataset.min)));
        };
        this.onChange = (e) => {
          if (e.target && e.target.name === 'quantity') this.update();
        };
        document.addEventListener('change', this.onChange);
        document.addEventListener('click', this.onClick = () => setTimeout(this.update, 50));
        this.update();
      }
      disconnectedCallback() {
        document.removeEventListener('change', this.onChange);
        document.removeEventListener('click', this.onClick);
      }
    }
  );

/* ---------- P19 y P20: fechas estimadas de entrega ---------- */
Gadsden.addDays = function (days, skipWeekends) {
  const d = new Date();
  let left = Number(days) || 0;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (skipWeekends && (d.getDay() === 0 || d.getDay() === 6)) continue;
    left--;
  }
  return d;
};
Gadsden.fillDates = function (scope) {
  scope.querySelectorAll('[data-gad-days]').forEach((el) => {
    const box = el.closest('[data-gad-dates]');
    const skip = box && box.dataset.skipWeekends === 'true';
    const style = (box && box.dataset.format) || 'short';
    const opts = style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' };
    el.textContent = Gadsden.addDays(el.dataset.gadDays, skip).toLocaleDateString(document.documentElement.lang || undefined, opts);
  });
};
Gadsden.fillDates(document);
document.addEventListener('shopify:section:load', (e) => Gadsden.fillDates(e.target));

/* ---------- Menú mobile como panel: el botón de cerrar cierra el menú entero ----------
   El componente del menú de Dawn le da a todos los botones del panel el cierre de submenú; acá se corta
   en la captura y se cierra por el summary principal (libera el scroll y el estado de la cabecera). */
document.addEventListener(
  'click',
  (event) => {
    const button = event.target.closest('.gad-menu-drawer__close');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const details = button.closest('details.gad-drawer--panel');
    const summary = details && details.querySelector(':scope > summary');
    if (summary && details.hasAttribute('open')) summary.click();
  },
  true
);
