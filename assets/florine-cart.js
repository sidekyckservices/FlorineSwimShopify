/**
 * Florine Swim — Cart Drawer
 * Intercepts Add-to-Cart submissions, talks to Shopify Cart API,
 * renders the line items into a slide-out drawer with a Checkout CTA.
 */
(function () {
  'use strict';

  function formatMoney(cents) {
    if (typeof cents !== 'number') return '';
    var amount = (cents / 100).toFixed(2);
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: currency
      }).format(cents / 100);
    } catch (e) {
      return '$' + amount;
    }
  }

  function fetchCart() {
    return fetch('/cart.js', {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    }).then(function (r) { return r.json(); });
  }

  function changeLine(lineKeyOrIndex, quantity) {
    var body = { quantity: quantity };
    if (typeof lineKeyOrIndex === 'string') {
      body.id = lineKeyOrIndex;
    } else {
      body.line = lineKeyOrIndex;
    }
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function addToCart(formData) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
      body: formData
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var err = new Error(data && data.description || data && data.message || 'Add to cart failed');
          err.payload = data;
          throw err;
        }
        return data;
      });
    });
  }

  function setHeaderCount(count) {
    var counter = document.querySelector('[data-cart-count]');
    var fallback = document.querySelector('.site-header__cart-count');
    var target = counter || fallback;
    if (!target) {
      // No counter rendered (cart was empty at page load) — try to inject one.
      var cartLink = document.querySelector('.site-header__cart');
      if (cartLink && count > 0) {
        var span = document.createElement('span');
        span.className = 'site-header__cart-count';
        span.setAttribute('data-cart-count', '');
        span.textContent = count;
        cartLink.appendChild(span);
        return;
      }
    }
    if (target) {
      if (count > 0) {
        target.textContent = count;
        target.hidden = false;
        target.style.display = '';
      } else {
        target.hidden = true;
        target.textContent = '';
      }
    }
  }

  function render(cart) {
    var drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    var itemsList = drawer.querySelector('[data-cart-items]');
    var emptyState = drawer.querySelector('[data-cart-empty]');
    var footer = drawer.querySelector('[data-cart-footer]');
    var subtotal = drawer.querySelector('[data-cart-subtotal]');
    var template = document.getElementById('CartDrawerItemTemplate');

    setHeaderCount(cart.item_count);

    if (!itemsList || !emptyState || !footer || !template) return;

    if (cart.item_count === 0) {
      itemsList.innerHTML = '';
      emptyState.hidden = false;
      footer.hidden = true;
      return;
    }

    emptyState.hidden = true;
    footer.hidden = false;
    if (subtotal) subtotal.textContent = formatMoney(cart.items_subtotal_price);

    itemsList.innerHTML = '';
    // Most recently added items appear at the top.
    var ordered = cart.items.slice().reverse();
    ordered.forEach(function (item) {
      // Original index (1-based) inside cart.items — needed for the line API.
      var originalIndex = cart.items.indexOf(item) + 1;
      var fragment = template.content.cloneNode(true);
      var root = fragment.querySelector('[data-cart-item]');
      root.setAttribute('data-line-key', item.key);
      root.setAttribute('data-line-index', originalIndex);

      var img = fragment.querySelector('[data-cart-item-image]');
      var mediaLink = fragment.querySelector('[data-cart-item-link]');
      var titleLink = fragment.querySelector('[data-cart-item-title-link]');
      var titleText = fragment.querySelector('[data-cart-item-title]');
      var variant = fragment.querySelector('[data-cart-item-variant]');
      var price = fragment.querySelector('[data-cart-item-price]');
      var qty = fragment.querySelector('[data-cart-item-qty]');

      var imgUrl = item.image || (item.featured_image && item.featured_image.url) || '';
      if (imgUrl) {
        img.src = imgUrl;
        img.alt = item.product_title || item.title || '';
      } else if (img && img.parentNode) {
        img.parentNode.removeChild(img);
      }
      if (mediaLink) mediaLink.href = item.url || '#';
      if (titleLink) titleLink.href = item.url || '#';
      if (titleText) titleText.textContent = item.product_title || item.title || '';

      if (variant) {
        var variantText = '';
        if (item.variant_title && item.variant_title.toLowerCase() !== 'default title') {
          variantText = item.variant_title;
        }
        if (variantText) {
          variant.textContent = variantText;
        } else {
          variant.parentNode.removeChild(variant);
        }
      }

      if (price) price.textContent = formatMoney(item.final_line_price);
      if (qty) qty.textContent = item.quantity;

      itemsList.appendChild(fragment);
    });
  }

  function refresh() {
    return fetchCart().then(render).catch(function () { /* swallow */ });
  }

  function openDrawer() {
    var drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    var panel = drawer.querySelector('.cart-drawer__panel');
    if (panel) panel.focus();
  }

  function closeDrawer() {
    var drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
  }

  function bindDrawerControls() {
    var drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    drawer.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-cart-drawer-close]');
      if (closeBtn) {
        e.preventDefault();
        closeDrawer();
        return;
      }

      var item = e.target.closest('[data-cart-item]');
      if (!item) return;
      var lineKey = item.getAttribute('data-line-key');
      var currentQty = parseInt(item.querySelector('[data-cart-item-qty]').textContent, 10) || 1;

      if (e.target.closest('[data-cart-item-decrement]')) {
        e.preventDefault();
        var nextDown = currentQty - 1;
        changeLine(lineKey, Math.max(0, nextDown)).then(render);
      } else if (e.target.closest('[data-cart-item-increment]')) {
        e.preventDefault();
        changeLine(lineKey, currentQty + 1).then(render);
      } else if (e.target.closest('[data-cart-item-remove]')) {
        e.preventDefault();
        changeLine(lineKey, 0).then(render);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  function bindCartTriggers() {
    document.querySelectorAll('[data-open-cart-drawer]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer();
      });
    });
  }

  function bindProductForm() {
    var forms = document.querySelectorAll('form[action*="/cart/add"]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        // If the user clicked a "checkout" submit button (express checkout / buy now), let it pass through.
        var submitter = e.submitter;
        if (submitter && submitter.name === 'checkout') return;

        e.preventDefault();
        var btn = form.querySelector('[type="submit"]');
        var originalText = btn ? btn.textContent : '';
        if (btn) {
          btn.disabled = true;
          btn.dataset.loading = 'true';
        }

        var formData = new FormData(form);
        addToCart(formData)
          .then(function () { return refresh(); })
          .then(function () {
            openDrawer();
            if (btn) {
              btn.disabled = false;
              delete btn.dataset.loading;
            }
          })
          .catch(function (err) {
            if (btn) {
              btn.disabled = false;
              delete btn.dataset.loading;
            }
            console.error('[Florine cart]', err);
            alert((err && err.message) || 'Sorry — something went wrong adding to cart.');
          });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindDrawerControls();
    bindCartTriggers();
    bindProductForm();
    // Hydrate drawer with current cart on first load
    refresh();
  });

  // Expose for theme-editor injected sections
  window.FlorineCart = {
    open: openDrawer,
    close: closeDrawer,
    refresh: refresh
  };
})();
