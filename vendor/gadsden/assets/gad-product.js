/* Gadsden: piezas de la ficha de producto (barra fija, variantes, galería, características, ofertas). */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- sincronizar con la variante elegida ---------- */
  // Dawn vuelve a pedir la sección al cambiar de variante; acá se reemplaza todo lo marcado con data-gad-sync.
  function syncFromHtml(html) {
    document.querySelectorAll('[data-gad-sync][id]').forEach((el) => {
      const fresh = html.getElementById(el.id);
      if (fresh) el.innerHTML = fresh.innerHTML;
    });
    if (window.Gadsden && Gadsden.refresh) Gadsden.refresh(document);
  }

  function onVariantChange({ data }) {
    if (!data || !data.html) return;
    syncFromHtml(data.html);
    skipSoldOut(data);
    filterGallery();
    document.querySelectorAll('gad-sticky-bar').forEach((bar) => bar.measure());
  }

  function subscribeVariant() {
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.variantChange, onVariantChange);
  }

  /* ---------- PX4: ocultar y saltear agotadas ---------- */
  function skipSoldOut(data) {
    const variant = data.variant;
    if (variant && variant.available) return;
    const selects = document.querySelector('variant-selects[data-gad-hide-sold-out]');
    if (!selects) return;
    // La opción que quedó en un valor agotado pasa al primer valor disponible.
    const groups = Array.from(selects.querySelectorAll(':scope > fieldset, :scope > .product-form__input--dropdown')).reverse();
    for (const group of groups) {
      const select = group.querySelector('select');
      if (select) {
        const current = select.selectedOptions[0];
        if (current && current.textContent.trim() !== current.value) {
          const next = Array.from(select.options).find((o) => o.textContent.trim() === o.value);
          if (next) {
            Array.from(select.options).forEach((o) => o.removeAttribute('selected'));
            next.setAttribute('selected', 'selected');
            select.value = next.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
        continue;
      }
      const checked = group.querySelector('input:checked');
      if (checked && (checked.classList.contains('disabled') || checked.classList.contains('visually-disabled'))) {
        const next = group.querySelector('input:not(.disabled):not(.visually-disabled)');
        if (next) {
          next.click();
          return;
        }
      }
    }
  }

  /* ---------- PX6: saltear carrito y "comprar ahora" ---------- */
  async function addAndCheckout(form, btn) {
    btn && btn.classList.add('loading');
    const spinner = btn && btn.querySelector('.loading__spinner');
    if (spinner) spinner.classList.remove('hidden');
    try {
      const res = await fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/javascript' },
        body: new FormData(form),
      });
      const json = await res.json();
      if (json.status) {
        const wrap = form.closest('product-form');
        const msg = wrap && wrap.querySelector('.product-form__error-message');
        if (msg) {
          msg.textContent = json.description || json.message || window.cartStrings.error;
          msg.closest('.product-form__error-message-wrapper').hidden = false;
        }
        return;
      }
      window.location.href = `${(window.Shopify && Shopify.routes && Shopify.routes.root) || '/'}checkout`;
    } finally {
      btn && btn.classList.remove('loading');
      if (spinner) spinner.classList.add('hidden');
    }
  }

  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      if (!form.matches || !form.matches('form[data-type="add-to-cart-form"]')) return;
      const buttons = form.querySelector('[data-gad-skip-cart="true"]');
      if (!buttons) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      addAndCheckout(form, form.querySelector('.product-form__submit'));
    },
    true
  );

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-gad-buy-now]');
    if (!btn) return;
    e.preventDefault();
    const form = btn.closest('form');
    if (form) addAndCheckout(form, btn);
  });

  /* ---------- P10: estrellas que llevan a una sección ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-gad-scroll]');
    if (!a) return;
    const id = decodeURIComponent((a.getAttribute('href') || '').replace('#', ''));
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (window.Gadsden && Gadsden.scrollToTarget) Gadsden.scrollToTarget(target);
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- PX1: galería (puntos en mobile, flechas en desktop, filtro por opción) ---------- */
  function initGallery(gallery) {
    if (gallery._gad) return;
    gallery._gad = true;
    const list = gallery.querySelector('.product__media-list');
    const dots = gallery.querySelector('.gad-gallery__dots');
    if (list && dots) {
      const build = () => {
        const items = Array.from(list.querySelectorAll(':scope > .product__media-item')).filter((li) => !li.hidden);
        dots.innerHTML = '';
        if (items.length < 2) return;
        items.forEach((item, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.tabIndex = -1;
          b.className = 'gad-gallery__dot';
          b.addEventListener('click', () => {
            if (single()) activate(gallery, item);
            else list.scrollTo({ left: item.offsetLeft - list.offsetLeft, behavior: 'smooth' });
          });
          dots.appendChild(b);
        });
        update();
      };
      const update = () => {
        const items = Array.from(list.querySelectorAll(':scope > .product__media-item')).filter((li) => !li.hidden);
        if (!items.length) return;
        if (single()) {
          const a = items.findIndex((li) => li.classList.contains('is-active'));
          Array.from(dots.children).forEach((d, i) => d.classList.toggle('is-active', i === Math.max(0, a)));
          return;
        }
        const center = list.scrollLeft + list.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        items.forEach((item, i) => {
          const mid = item.offsetLeft - list.offsetLeft + item.offsetWidth / 2;
          const d = Math.abs(mid - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        Array.from(dots.children).forEach((d, i) => d.classList.toggle('is-active', i === best));
      };
      // en desktop con miniaturas se ve una sola imagen: los puntos siguen a la activa
      const single = () => window.matchMedia('(min-width: 750px)').matches && (gallery.dataset.desktopLayout || '').includes('thumbnail');
      list.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
      new MutationObserver(() => requestAnimationFrame(update)).observe(list, { attributes: true, subtree: true, attributeFilter: ['class'] });
      gallery._gadBuildDots = build;
      build();
    }
    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gad-gallery-step]');
      if (!btn) return;
      const step = parseInt(btn.dataset.gadGalleryStep, 10);
      const items = Array.from(gallery.querySelectorAll('.product__media-list > .product__media-item')).filter((li) => !li.hidden);
      const activeIndex = Math.max(0, items.findIndex((li) => li.classList.contains('is-active')));
      const next = items[(activeIndex + step + items.length) % items.length];
      if (next) activate(gallery, next);
    });
    thumbsMotion(gallery);
    if (gallery.dataset.gadLoop === 'true') loopGallery(gallery);
  }

  /* galería en bucle (ajuste global): en el slider de mobile, pasar de la última vuelve a la primera y al revés,
     con las flechas y deslizando. En desktop las flechas de la foto principal ya dan la vuelta. */
  function loopGallery(gallery) {
    const viewer = gallery.querySelector('slider-component[id^="GalleryViewer"]');
    const list = viewer && viewer.querySelector('[id^="Slider-"]');
    if (!list) return;
    const max = () => list.scrollWidth - list.clientWidth;
    const go = (left) => list.scrollTo({ left, behavior: 'smooth' });
    viewer.enableSliderLooping = true;
    viewer.querySelectorAll('button[name="next"], button[name="previous"]').forEach((b) => b.removeAttribute('disabled'));
    viewer.addEventListener(
      'click',
      (e) => {
        const b = e.target.closest('button[name="next"], button[name="previous"]');
        if (!b || max() <= 0) return;
        const atEnd = list.scrollLeft >= max() - 2;
        const atStart = list.scrollLeft <= 2;
        if ((b.name === 'next' && atEnd) || (b.name === 'previous' && atStart)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          go(b.name === 'next' ? 0 : max());
        }
      },
      true
    );
    let x0 = null;
    let s0 = 0;
    list.addEventListener('touchstart', (e) => {
      x0 = e.touches[0].clientX;
      s0 = list.scrollLeft;
    }, { passive: true });
    list.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (max() <= 0) return;
      if (dx < -40 && s0 >= max() - 2) go(0);
      else if (dx > 40 && s0 <= 2) go(max());
    }, { passive: true });
  }

  function activate(gallery, item) {
    const thumb = Array.from(gallery.querySelectorAll('.thumbnail-list__item')).find((t) => !t.hidden && t.dataset.target === item.dataset.mediaId);
    if (thumb) thumb.querySelector('button').click();
    else if (gallery.setActiveMedia) gallery.setActiveMedia(item.dataset.mediaId, false);
  }

  /* tira de miniaturas: paso de las flechas y movimiento automático (continuo, va y vuelve, o de a una),
     con los valores de desktop o de mobile según el ancho; se frena al usarla */
  function thumbsMotion(gallery) {
    const list = gallery.querySelector('.thumbnail-list');
    if (!list) return;
    const ds = gallery.dataset;
    const mq = window.matchMedia('(max-width: 749px)');
    const cfg = () =>
      mq.matches
        ? { mode: ds.gadThumbsAutoM, speed: ds.gadThumbsSpeedM, interval: ds.gadThumbsIntervalM, step: ds.gadStepM }
        : { mode: ds.gadThumbsAuto, speed: ds.gadThumbsSpeed, interval: ds.gadThumbsInterval, step: ds.gadStepD };
    const setStep = () => {
      const s = cfg().step;
      if (s) gallery.querySelectorAll('.thumbnail-slider .slider-button').forEach((btn) => (btn.dataset.step = s));
    };
    setStep();
    mq.addEventListener('change', setStep);
    const on = (m) => m && m !== 'off';
    if (!on(ds.gadThumbsAuto) && !on(ds.gadThumbsAutoM)) return;
    if (window.Gadsden && Gadsden.reduceMotion()) return;
    let paused = false;
    let visible = true;
    ['pointerenter', 'touchstart', 'focusin'].forEach((ev) => list.addEventListener(ev, () => (paused = true), { passive: true }));
    ['pointerleave', 'focusout'].forEach((ev) => list.addEventListener(ev, () => (paused = false)));
    list.addEventListener('touchend', () => setTimeout(() => (paused = false), 3000), { passive: true });
    new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(list);
    const vertical = () => list.scrollHeight > list.clientHeight + 2 && list.scrollWidth <= list.clientWidth + 2;
    const max = () => (vertical() ? list.scrollHeight - list.clientHeight : list.scrollWidth - list.clientWidth);
    const get = () => (vertical() ? list.scrollTop : list.scrollLeft);
    const idle = () => paused || !visible || document.hidden || max() < 2;
    let mode = null;
    let pos = 0;
    let dir = 1;
    let last = 0;
    let since = 0;
    const tick = (t) => {
      const c = cfg();
      const m = on(c.mode) ? c.mode : null;
      if (m !== mode) {
        mode = m;
        list.style.scrollSnapType = mode === 'continuous' ? 'none' : '';
        list.style.scrollBehavior = mode === 'continuous' ? 'auto' : '';
        pos = get();
        since = 0;
      }
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      if (mode && !idle()) {
        if (mode === 'continuous') {
          if (Math.abs(get() - pos) > 3) pos = get();
          pos += dir * (parseFloat(c.speed) || 30) * dt;
          if (pos >= max()) (pos = max()), (dir = -1);
          if (pos <= 0) (pos = 0), (dir = 1);
          if (vertical()) list.scrollTop = pos;
          else list.scrollLeft = pos;
        } else if ((since += dt) >= (parseFloat(c.interval) || 2.5)) {
          since = 0;
          const items = Array.from(list.querySelectorAll('.thumbnail-list__item')).filter((li) => !li.hidden);
          if (items.length > 1) {
            const v = vertical();
            const r0 = items[0].getBoundingClientRect();
            const r1 = items[1].getBoundingClientRect();
            const size = v ? r1.top - r0.top : r1.left - r0.left;
            const at = get() >= max() - 2 ? 0 : get() + size;
            list.scrollTo(v ? { top: at, behavior: 'smooth' } : { left: at, behavior: 'smooth' });
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function filterGallery() {
    document.querySelectorAll('media-gallery[data-gad-filter-option]').forEach((gallery) => {
      const optionName = gallery.dataset.gadFilterOption.toLowerCase();
      const info = gallery.closest('product-info') || document;
      const selects = info.querySelector('variant-selects');
      if (!selects) return;
      let selected = null;
      const values = [];
      selects.querySelectorAll('fieldset, .product-form__input--dropdown').forEach((group) => {
        const input = group.querySelector('input[data-option-name], select');
        const name = (input && (input.dataset.optionName || (input.name || '').replace(/^options\[|\]$/g, ''))) || '';
        if (name.toLowerCase() !== optionName) return;
        group.querySelectorAll('input, option').forEach((o) => values.push((o.value || '').toLowerCase()));
        const checked = group.querySelector('input:checked') || (group.querySelector('select') && group.querySelector('select').selectedOptions[0]);
        if (checked) selected = (checked.value || '').toLowerCase();
      });
      if (!selected) return;
      const match = (alt) => {
        const a = (alt || '').toLowerCase().trim();
        return a === selected || !values.includes(a);
      };
      gallery.querySelectorAll('.product__media-list > .product__media-item, .thumbnail-list__item').forEach((li) => {
        li.hidden = !match(li.dataset.alt);
      });
      const active = gallery.querySelector('.product__media-list > .product__media-item.is-active');
      if (active && active.hidden) {
        const first = gallery.querySelector('.product__media-list > .product__media-item:not([hidden])');
        if (first && gallery.setActiveMedia) gallery.setActiveMedia(first.dataset.mediaId, false);
      }
      if (gallery._gadBuildDots) gallery._gadBuildDots();
    });
  }

  /* ---------- P08/P09: ventanas de las características ---------- */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest && e.target.closest('[data-gad-feature-open]');
    if (opener) {
      if (opener.closest('gad-carousel.is-dragging')) return;
      const dialog = document.getElementById(opener.dataset.gadFeatureOpen);
      if (!dialog) return;
      const video = dialog.querySelector('.gad-feature-modal__video');
      if (video && !video.querySelector('iframe')) {
        const iframe = document.createElement('iframe');
        iframe.src = video.dataset.src;
        iframe.title = video.dataset.title || '';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.loading = 'lazy';
        video.appendChild(iframe);
      }
      dialog.showModal();
      document.documentElement.classList.add('gad-modal-open');
      return;
    }
    const closer = e.target.closest && e.target.closest('[data-gad-feature-close]');
    const dialog = e.target.matches && e.target.matches('dialog.gad-feature-modal') ? e.target : null;
    if (closer) closer.closest('dialog').close();
    else if (dialog) dialog.close();
  });
  document.addEventListener(
    'close',
    (e) => {
      if (!e.target.matches || !e.target.matches('dialog.gad-feature-modal')) return;
      const iframe = e.target.querySelector('.gad-feature-modal__video iframe');
      if (iframe) iframe.remove();
      document.documentElement.classList.remove('gad-modal-open');
    },
    true
  );

  /* ---------- PX10: descuentos por cantidad ---------- */
  function applyOffer(input) {
    const box = input.closest('gad-quantity-offers');
    const qty = parseInt(input.value, 10) || 1;
    box.querySelectorAll('.gad-offers__item').forEach((item) => item.classList.toggle('is-selected', item.contains(input)));
    const info = box.closest('product-info') || document;
    const target = info.querySelector('.quantity__input') || box.querySelector('[data-gad-offers-qty]');
    if (target) {
      target.value = qty;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    box.dataset.qty = qty;
  }
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('.gad-offers__input')) applyOffer(e.target);
  });

  function initOffers() {
    document.querySelectorAll('gad-quantity-offers').forEach((box) => {
      const remembered = box.dataset.qty;
      let input = remembered && box.querySelector(`.gad-offers__input[value="${remembered}"]`);
      if (input) input.checked = true;
      input = input || box.querySelector('.gad-offers__input:checked');
      if (input) applyOffer(input);
    });
  }

  /* ---------- arranque ---------- */
  function init() {
    document.querySelectorAll('media-gallery.gad-gallery').forEach(initGallery);
    filterGallery();
    initOffers();
  }

  document.addEventListener('DOMContentLoaded', () => {
    subscribeVariant();
    init();
  });
  document.addEventListener('shopify:section:load', init);
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined')
    subscribe(PUB_SUB_EVENTS.variantChange, () => setTimeout(initOffers, 0));
  window.GadProduct = { syncFromHtml, filterGallery, sleep };
})();

/* ---------- P01: barra de compra fija ---------- */
class GadStickyBar extends HTMLElement {
  connectedCallback() {
    if (this._moved) return;
    if (this.closest('quick-add-modal, product-info[data-original-section]')) {
      this.remove();
      return;
    }
    // La barra vive al final del <body>: los ancestros con transformaciones romperían position: fixed.
    document.querySelectorAll(`body > gad-sticky-bar#${CSS.escape(this.id)}`).forEach((old) => old !== this && old.remove());
    this._moved = true;
    document.body.appendChild(this);
    this.section = this.dataset.section;
    this.form = document.getElementById(this.dataset.form);
    this.visible = this.dataset.show === 'always';
    this.addEventListener('click', (e) => this.onClick(e));
    this.addEventListener('change', (e) => this.onChange(e));
    this.onScroll = () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this.check();
      });
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    this.spacer = document.createElement('div');
    this.spacer.className = 'gad-sticky-spacer';
    this.spacer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.spacer);
    if (window.subscribe && typeof PUB_SUB_EVENTS !== 'undefined') {
      this.unsubCart = subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.stopLoading());
      this.unsubErr = subscribe(PUB_SUB_EVENTS.cartError, () => this.stopLoading());
    }
    document.addEventListener('shopify:section:unload', (e) => {
      if (e.target.id === `shopify-section-${this.section}`) this.destroy();
    });
    this.measure();
    this.check();
  }

  destroy() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.unsubCart) this.unsubCart();
    if (this.unsubErr) this.unsubErr();
    if (this.spacer) this.spacer.remove();
    document.documentElement.style.setProperty('--gad-sticky-bar-h', '0px');
    this.remove();
  }

  get anchor() {
    return document.getElementById(`ProductSubmitButton-${this.section}`) || document.getElementById(`ProductInfo-${this.section}`);
  }

  measure() {
    const h = this.offsetHeight;
    this.spacer.style.height = `${h}px`;
    const footer = document.querySelector('.footer') || document.querySelector('footer');
    if (footer) this.spacer.style.backgroundColor = getComputedStyle(footer).backgroundColor;
    document.documentElement.style.setProperty('--gad-sticky-bar-full-h', `${h}px`);
  }

  check() {
    let show = true;
    if (this.dataset.show !== 'always') {
      const anchor = this.anchor;
      show = anchor ? anchor.getBoundingClientRect().bottom < 0 : false;
    }
    this.classList.toggle('is-visible', show);
    this.setAttribute('aria-hidden', show ? 'false' : 'true');
    this.inert = !show;
    document.documentElement.style.setProperty('--gad-sticky-bar-h', show ? `${this.offsetHeight}px` : '0px');
  }

  scrollTarget() {
    const action = this.dataset.action;
    let target = null;
    if (action === 'scroll_variants') target = document.querySelector(`#variant-selects-${this.section}`);
    if (action === 'scroll_offers') target = document.querySelector('[data-gad-qty-offers]');
    if (action === 'scroll_plans') target = document.querySelector('[data-gad-plans]');
    return target || document.getElementById(`ProductInfo-${this.section}`);
  }

  onClick(e) {
    const btn = e.target.closest('[data-gad-sticky-btn]');
    if (!btn || btn.disabled) return;
    if (this.dataset.action !== 'add_to_cart') {
      const target = this.scrollTarget();
      if (target && window.Gadsden) Gadsden.scrollToTarget(target);
      return;
    }
    const form = document.getElementById(this.dataset.form);
    if (!form) return;
    btn.classList.add('loading');
    const spinner = btn.querySelector('.loading__spinner');
    if (spinner) spinner.classList.remove('hidden');
    clearTimeout(this._loadingTimer);
    this._loadingTimer = setTimeout(() => this.stopLoading(), 6000);
    if (form.requestSubmit) form.requestSubmit();
    else form.querySelector('[type="submit"]').click();
  }

  stopLoading() {
    clearTimeout(this._loadingTimer);
    this.querySelectorAll('[data-gad-sticky-btn]').forEach((btn) => {
      btn.classList.remove('loading');
      const spinner = btn.querySelector('.loading__spinner');
      if (spinner) spinner.classList.add('hidden');
    });
  }

  /* elegir una variante en la barra cambia la de la ficha (y viceversa, por la sincronización) */
  onChange(e) {
    const selects = document.querySelector(`#variant-selects-${this.section}`);
    if (!selects) return;
    let wanted = [];
    if (e.target.matches('[data-gad-sticky-variant]')) {
      const opt = e.target.selectedOptions[0];
      wanted = (opt.dataset.options || '').split('|||');
    } else if (e.target.matches('[data-gad-sticky-option]')) {
      wanted = [];
      wanted[parseInt(e.target.dataset.gadStickyOption, 10) - 1] = e.target.value;
    } else return;
    const groups = Array.from(selects.querySelectorAll(':scope > fieldset, :scope > .product-form__input--dropdown'));
    let last = null;
    groups.forEach((group, i) => {
      const value = wanted[i];
      if (value === undefined) return;
      const select = group.querySelector('select');
      if (select) {
        const option = Array.from(select.options).find((o) => o.value === value);
        if (!option || option.selected) return;
        Array.from(select.options).forEach((o) => o.removeAttribute('selected'));
        option.setAttribute('selected', 'selected');
        select.value = value;
        last = select;
      } else {
        const input = Array.from(group.querySelectorAll('input')).find((x) => x.value === value);
        if (!input || input.checked) return;
        input.checked = true;
        last = input;
      }
    });
    if (last) last.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

if (!customElements.get('gad-sticky-bar')) customElements.define('gad-sticky-bar', GadStickyBar);

/* ---------- Miniaturas: si entran todas, las flechas quedan apagadas ---------- */
(() => {
  const sync = (slider) => {
    const list = slider.querySelector('.thumbnail-list');
    if (!list) return;
    const fits = list.scrollWidth - list.clientWidth <= 2 && list.scrollHeight - list.clientHeight <= 2;
    slider.querySelectorAll('.slider-button').forEach((b) => {
      if (fits) b.setAttribute('disabled', 'disabled');
    });
  };
  const run = () =>
    document.querySelectorAll('media-gallery .thumbnail-slider').forEach((slider) => {
      sync(slider);
      if (!slider._gadFit && 'ResizeObserver' in window) {
        slider._gadFit = new ResizeObserver(() => sync(slider));
        slider._gadFit.observe(slider);
      }
    });
  if (window.customElements) customElements.whenDefined('slider-component').then(() => requestAnimationFrame(run));
  document.addEventListener('shopify:section:load', run);
})();

/* ---------- Ofertas por cantidad: variante de cada unidad ----------
   Al enviar el formulario de compra, si la opción elegida tiene listas por unidad, se agregan las unidades
   agrupadas por variante (items[n][id] / items[n][quantity]) en lugar de id + quantity, y después el formulario
   vuelve a quedar como estaba. form.id no sirve: el formulario tiene un campo "id" que tapa la propiedad. */
(() => {
  const unitIds = (box) => {
    const item = box.querySelector('.gad-offers__item.is-selected');
    const units = item ? item.querySelectorAll('.gad-offers__unit') : [];
    if (!units.length) return null;
    const data = box.querySelector('[data-gad-offer-variants]');
    const variants = data ? JSON.parse(data.textContent) : [];
    return Array.from(units).map((unit) => {
      const values = Array.from(unit.querySelectorAll('.gad-offers__variant')).map((s) => s.value);
      const v = variants.find((x) => values.every((val, i) => x.options[i] === val));
      return v ? v.id : null;
    });
  };
  // Las listas están dentro del <label> de la opción: un clic en ellas no tiene que cambiar de opción.
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.gad-offers__units')) e.preventDefault();
  });
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      const formId = form.getAttribute && form.getAttribute('id');
      if (!formId || !form.matches('form[data-type="add-to-cart-form"]')) return;
      const box = document.querySelector(`gad-quantity-offers[data-form="${formId}"]`);
      if (!box) return;
      const ids = unitIds(box);
      if (!ids || ids.some((id) => !id)) return;
      const counts = new Map();
      ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
      const off = Array.from(document.querySelectorAll(`[form="${formId}"][name="quantity"], #${formId} [name="quantity"], #${formId} [name="id"]`));
      off.forEach((el) => (el.disabled = true));
      const added = [];
      let n = 0;
      counts.forEach((qty, id) => {
        [['id', id], ['quantity', qty]].forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = `items[${n}][${key}]`;
          input.value = value;
          input.setAttribute('form', formId);
          box.appendChild(input);
          added.push(input);
        });
        n += 1;
      });
      // El formulario arma el FormData en el mismo tick; después se deja como estaba.
      setTimeout(() => {
        added.forEach((el) => el.remove());
        off.forEach((el) => (el.disabled = false));
      }, 0);
    },
    true
  );
})();
