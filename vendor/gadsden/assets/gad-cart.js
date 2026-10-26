/* Gadsden: carrito lateral. Cuenta regresiva (C05), cupón (C07 y C17), productos para sumar (C10),
   regalo (C11), casilla de términos (C15) y modo prueba del editor (C00).
   El cajón se vuelve a dibujar entero con cada cambio: lo que tiene que sobrevivir vive en Gadsden.cart. */
(() => {
  if (window.Gadsden && window.Gadsden.cartReady) return;
  const G = (window.Gadsden = window.Gadsden || {});
  G.cartReady = true;
  const state = (G.cart = G.cart || { timerEnd: 0, terms: false, busy: false });
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const drawer = () => document.querySelector('cart-drawer');

  /* ---------- C05 cuenta regresiva ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    if (!state.timerEnd) return;
    let left = Math.round((state.timerEnd - Date.now()) / 1000);
    if (left <= 0) {
      state.timerEnd = Date.now() + 90000;
      left = 90;
    }
    const text = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
    document.querySelectorAll('gad-cart-timer .gad-cart-timer__value').forEach((v) => {
      if (v.textContent !== text) v.textContent = text;
    });
  }
  function startTimer() {
    if (state.timerEnd) return;
    const timer = document.querySelector('cart-drawer gad-cart-timer');
    if (!timer) return;
    state.timerEnd = Date.now() + (parseInt(timer.dataset.seconds, 10) || 300) * 1000;
    tick();
    setInterval(tick, 1000);
  }
  document.addEventListener('gad:cart-open', startTimer);
  if (!customElements.get('gad-cart-timer'))
    customElements.define(
      'gad-cart-timer',
      class extends HTMLElement {
        connectedCallback() {
          if (drawer()?.classList.contains('active')) startTimer();
          tick();
        }
      }
    );

  /* ---------- C15 casilla de términos ---------- */
  function termsOk(from) {
    const scope = from.closest('cart-drawer') || document;
    const terms = scope.querySelector('gad-cart-terms');
    if (!terms || !terms.box || terms.box.checked) return true;
    terms.warn();
    return false;
  }
  if (!customElements.get('gad-cart-terms'))
    customElements.define(
      'gad-cart-terms',
      class extends HTMLElement {
        connectedCallback() {
          this.box = this.querySelector('.gad-cart-terms__box');
          this.box.checked = state.terms;
          this.box.addEventListener('change', () => {
            state.terms = this.box.checked;
            if (this.box.checked) this.querySelector('.gad-cart-terms__warn').hidden = true;
            this.sync();
          });
          this.sync();
        }
        sync() {
          const button = (this.closest('cart-drawer') || document).querySelector('[name="checkout"]');
          if (button) button.classList.toggle('gad-dim', this.hasAttribute('data-dim') && !this.box.checked);
        }
        warn() {
          this.querySelector('.gad-cart-terms__warn').hidden = false;
          this.box.focus();
        }
      }
    );
  document.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('cart-drawer [name="checkout"]');
      if (button && !termsOk(button)) event.preventDefault();
    },
    true
  );

  /* ---------- C07 y C17 cupón: al checkout con el código, sin validarlo acá ---------- */
  if (!customElements.get('gad-coupon'))
    customElements.define(
      'gad-coupon',
      class extends HTMLElement {
        connectedCallback() {
          const input = this.querySelector('input');
          const error = this.querySelector('.gad-coupon__error');
          input.addEventListener('input', () => (error.hidden = true));
          this.querySelector('form').addEventListener('submit', (event) => {
            event.preventDefault();
            const code = input.value.trim();
            if (!code) {
              error.hidden = false;
              input.focus();
              return;
            }
            if (!termsOk(this)) return;
            window.location.href = root + 'discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(root + 'checkout');
          });
        }
      }
    );

  /* ---------- pedidos al carrito desde el cajón (C10, C11) ---------- */
  async function cartRequest(url, body) {
    const d = drawer();
    if (!d || state.busy) return;
    state.busy = true;
    const inner = d.querySelector('.drawer__inner');
    inner?.classList.add('gad-cart-busy');
    try {
      const sections = d.getSectionsToRender().map((section) => section.id);
      const response = await fetch(url, {
        ...fetchConfig(),
        body: JSON.stringify({ ...body, sections, sections_url: window.location.pathname }),
      });
      const data = await response.json();
      if (!response.ok || data.status) throw new Error(data.description || data.message || response.status);
      state.busy = false;
      d.renderContents(data);
    } catch (error) {
      const errors = document.getElementById('CartDrawer-CartErrors');
      if (errors && window.cartStrings) errors.textContent = window.cartStrings.error;
    } finally {
      state.busy = false;
      inner?.classList.remove('gad-cart-busy');
    }
  }
  const addExtra = (variantId, kind) =>
    cartRequest(routes.cart_add_url, { items: [{ id: Number(variantId), quantity: 1, properties: { _gad_extra: kind } }] });
  const removeLine = (key) => cartRequest(routes.cart_change_url, { id: key, quantity: 0 });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('cart-drawer input[data-gad-upsell]');
    if (!input) return;
    if (input.checked) addExtra(input.dataset.variant, 'sumar');
    else if (input.dataset.key) removeLine(input.dataset.key);
  });
  document.addEventListener('click', (event) => {
    const upsell = event.target.closest('cart-drawer button[data-gad-upsell]');
    if (upsell) addExtra(upsell.dataset.variant, 'sumar');
    const giftButton = event.target.closest('cart-drawer [data-gad-gift-add]');
    if (giftButton) addExtra(giftButton.closest('gad-cart-gift').dataset.variant, 'regalo');
  });

  /* ---------- C11 regalo: se suma al desbloquearse y se saca si deja de cumplir ---------- */
  // Recuerda qué regalos ya se sumaron solos: si el comprador lo quita, aparece el botón en vez de volver a sumarlo.
  const giftKey = 'gad-gifts-added';
  const giftsAdded = () => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(giftKey) || '[]'));
    } catch (e) {
      return new Set(state.gifts || []);
    }
  };
  const markGift = (variant, on) => {
    const set = giftsAdded();
    if (on) set.add(variant);
    else set.delete(variant);
    state.gifts = [...set];
    try {
      sessionStorage.setItem(giftKey, JSON.stringify(state.gifts));
    } catch (e) {}
  };
  if (!customElements.get('gad-cart-gift'))
    customElements.define(
      'gad-cart-gift',
      class extends HTMLElement {
        connectedCallback() {
          setTimeout(() => this.sync());
        }
        sync() {
          if (!this.isConnected || state.busy) return;
          const { variant, key } = this.dataset;
          const unlocked = this.hasAttribute('data-unlocked');
          if (unlocked && !key) {
            if (this.hasAttribute('data-auto') && !giftsAdded().has(variant)) {
              markGift(variant, true);
              addExtra(variant, 'regalo');
            } else {
              this.querySelector('[data-gad-gift-add]')?.removeAttribute('hidden');
            }
          } else if (!unlocked) {
            markGift(variant, false);
            if (key) removeLine(key);
          }
        }
      }
    );

  /* ---------- C00 modo prueba: el cajón queda abierto en el editor ---------- */
  if (window.Shopify && window.Shopify.designMode) {
    const testMode = () => {
      const d = drawer();
      if (d && d.hasAttribute('data-gad-test-mode') && typeof d.open === 'function') d.open();
    };
    document.addEventListener('DOMContentLoaded', testMode);
    document.addEventListener('shopify:section:load', (event) => {
      if (event.target.querySelector && event.target.querySelector('cart-drawer')) setTimeout(testMode);
    });
    const openFromEditor = (event) => {
      const d = drawer();
      if (d && event.target.closest && event.target.closest('#shopify-section-cart-drawer') && typeof d.open === 'function') d.open();
    };
    document.addEventListener('shopify:section:select', openFromEditor);
    document.addEventListener('shopify:block:select', openFromEditor);
  }
})();
