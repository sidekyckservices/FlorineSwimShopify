/**
 * Florine Swim — Animation & Interaction Controller
 * Handles hero load animations, scroll-triggered reveals, and product page interactions.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // ---- Hero: staggered fade-in on page load ----
    var heroElements = document.querySelectorAll('.hero-fade, .hero-logo-fade');
    heroElements.forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-delay')) || 0;
      setTimeout(function () {
        el.classList.add('is-visible');
      }, delay * 1000);
    });

    // ---- Scroll-triggered animations via IntersectionObserver ----
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');

              // Trigger staggered children within this section
              var children = entry.target.querySelectorAll(
                '.animate-on-scroll-child, .animate-slide-left'
              );
              children.forEach(function (child) {
                var childDelay = parseFloat(child.getAttribute('data-delay')) || 0;
                setTimeout(function () {
                  child.classList.add('is-visible');
                }, childDelay * 1000);
              });

              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '-80px', threshold: 0 }
      );

      document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback
      var allAnimated = document.querySelectorAll(
        '.animate-on-scroll, .animate-on-scroll-child, .animate-slide-left'
      );
      allAnimated.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }

    // ---- Waitlist success auto-reveal ----
    var successEl = document.querySelector('.waitlist-success');
    if (successEl) {
      successEl.classList.add('is-visible');
      var waitlistSection = document.getElementById('waitlist');
      if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // ---- Product page: gallery thumbnail clicks ----
    var thumbs = document.querySelectorAll('[data-product-thumb]');
    var mainImageContainer = document.querySelector('[data-product-main-image]');
    if (thumbs.length > 0 && mainImageContainer) {
      var mainImage = mainImageContainer.querySelector('img');
      thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          thumbs.forEach(function (t) { t.classList.remove('is-active'); });
          thumb.classList.add('is-active');
          if (mainImage) {
            mainImage.src = thumb.getAttribute('data-image-src');
            mainImage.alt = thumb.getAttribute('data-image-alt') || '';
          }
        });
      });
    }

    // ---- Product page: quantity buttons ----
    var qtyInput = document.querySelector('[data-qty-input]');
    var qtyDecrement = document.querySelector('[data-qty-decrement]');
    var qtyIncrement = document.querySelector('[data-qty-increment]');
    if (qtyInput && qtyDecrement && qtyIncrement) {
      qtyDecrement.addEventListener('click', function () {
        var current = parseInt(qtyInput.value, 10) || 1;
        if (current > 1) qtyInput.value = current - 1;
      });
      qtyIncrement.addEventListener('click', function () {
        var current = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = current + 1;
      });
    }

    // ---- Product page: variant selection updates hidden id (basic single-option support) ----
    // For multi-option, this finds matching variant by reading all checked option radios.
    var productForm = document.querySelector('[data-product-form]');
    if (productForm) {
      var variantIdInput = productForm.querySelector('[data-product-variant-id]');
      var optionRadios = productForm.querySelectorAll('input[type="radio"][name^="options["]');
      var variantsScript = window.__florineProductVariants;
      // Variants payload optional — for full variant resolution, theme must inject window.__florineProductVariants
      optionRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
          if (!variantsScript || !variantIdInput) return;
          var selected = {};
          productForm.querySelectorAll('input[type="radio"][name^="options["]:checked').forEach(function (r) {
            var match = r.name.match(/options\[(.+)\]/);
            if (match) selected[match[1]] = r.value;
          });
          var found = variantsScript.find(function (v) {
            return Object.keys(selected).every(function (k) {
              return v.options[k] === selected[k];
            });
          });
          if (found) variantIdInput.value = found.id;
        });
      });
    }
  });
})();
