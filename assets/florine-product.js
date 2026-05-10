/**
 * Florine Swim — Product Variant Selector
 * Wires radio-style option selectors to the hidden variant id, the price,
 * the main gallery image, and the add-to-cart button availability.
 */
(function () {
  'use strict';

  function formatMoney(cents) {
    if (typeof cents !== 'number') return '';
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    var amount = cents / 100;
    try {
      var formatted = new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      }).format(amount);
      return formatted;
    } catch (e) {
      return '$' + (amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2));
    }
  }

  function init(productRoot) {
    var variantsScript = productRoot.querySelector('[data-product-variants]');
    var optionsScript = productRoot.querySelector('[data-product-options]');
    var form = productRoot.querySelector('[data-product-form]');
    if (!variantsScript || !optionsScript || !form) return;

    var variants;
    var optionsMeta;
    try {
      variants = JSON.parse(variantsScript.textContent);
      optionsMeta = JSON.parse(optionsScript.textContent);
    } catch (e) {
      console.error('[Florine product] variant JSON parse failed', e);
      return;
    }
    if (!Array.isArray(variants) || variants.length === 0) return;

    var variantIdInput = form.querySelector('[data-product-variant-id]');
    var priceTarget = productRoot.querySelector('[data-product-price]');
    var addBtn = form.querySelector('[data-add-to-cart]');
    var mainImage = productRoot.querySelector('[data-product-main-image] img');

    var addToCartLabel = (addBtn && addBtn.dataset.addToCartLabel) || (addBtn ? addBtn.textContent.trim() : 'Add to Cart');
    var soldOutLabel = (addBtn && addBtn.dataset.soldOutLabel) || 'Sold Out';
    var unavailableLabel = (addBtn && addBtn.dataset.unavailableLabel) || 'Unavailable';
    if (addBtn) {
      addBtn.dataset.addToCartLabel = addToCartLabel;
      addBtn.dataset.soldOutLabel = soldOutLabel;
      addBtn.dataset.unavailableLabel = unavailableLabel;
    }

    function getSelectedOptions() {
      var picked = [];
      // Iterate option order from the product (Shopify's canonical position order)
      var optionNames = optionsMeta.map(function (o) {
        // Shopify product.options can be array of strings (legacy) or objects with `name`.
        return typeof o === 'string' ? o : o.name;
      });

      optionNames.forEach(function (name) {
        var radio = form.querySelector('input[type="radio"][name="options[' + name + ']"]:checked');
        if (radio) {
          picked.push(radio.value);
        } else {
          // Fall back to first radio for this option group if nothing checked
          var firstRadio = form.querySelector('input[type="radio"][name="options[' + name + ']"]');
          if (firstRadio) {
            firstRadio.checked = true;
            picked.push(firstRadio.value);
          } else {
            picked.push(null);
          }
        }
      });

      return picked;
    }

    function findVariant(selectedOptions) {
      return variants.find(function (variant) {
        var variantOpts = [variant.option1, variant.option2, variant.option3];
        // A variant matches when, for every option position the user has selected, the variant has the same value.
        return selectedOptions.every(function (val, idx) {
          if (val == null) return true;
          return variantOpts[idx] === val;
        });
      });
    }

    function updateUI(variant) {
      if (!variant) {
        if (variantIdInput) variantIdInput.value = '';
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.textContent = unavailableLabel;
        }
        return;
      }

      if (variantIdInput) variantIdInput.value = variant.id;

      if (priceTarget && typeof variant.price === 'number') {
        priceTarget.textContent = formatMoney(variant.price);
      }

      if (mainImage && variant.featured_image && variant.featured_image.src) {
        var src = variant.featured_image.src;
        if (src.indexOf('//') === 0) src = window.location.protocol + src;
        // Add a width transformation for sharper rendering
        if (src.indexOf('?') === -1) {
          src = src + '?width=1400';
        } else if (src.indexOf('width=') === -1) {
          src = src + '&width=1400';
        }
        mainImage.src = src;
        mainImage.alt = variant.featured_image.alt || mainImage.alt;
      }

      if (addBtn) {
        if (variant.available) {
          addBtn.disabled = false;
          addBtn.textContent = addToCartLabel;
        } else {
          addBtn.disabled = true;
          addBtn.textContent = soldOutLabel;
        }
      }

      // Reflect selected variant in the URL for shareable links — without reload.
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      } catch (e) { /* noop */ }
    }

    function handleChange() {
      var selected = getSelectedOptions();
      var variant = findVariant(selected);
      updateUI(variant);
    }

    form.addEventListener('change', function (e) {
      if (e.target && e.target.matches('input[type="radio"][name^="options["]')) {
        handleChange();
      }
    });

    // Quantity stepper
    var qtyInput = form.querySelector('[data-qty-input]');
    var qtyDec = form.querySelector('[data-qty-decrement]');
    var qtyInc = form.querySelector('[data-qty-increment]');
    if (qtyInput && qtyDec && qtyInc) {
      qtyDec.addEventListener('click', function () {
        var v = parseInt(qtyInput.value, 10) || 1;
        if (v > 1) qtyInput.value = v - 1;
      });
      qtyInc.addEventListener('click', function () {
        var v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = v + 1;
      });
    }

    // Initial sync — make sure hidden id and UI match what's selected on load
    handleChange();
  }

  function start() {
    document.querySelectorAll('[data-product-handle]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
