/**
 * Florine Swim — Animation Controller
 * Handles hero staggered load animations and scroll-triggered reveals.
 */
(function () {
  'use strict';

  function showAllAnimated() {
    var allAnimated = document.querySelectorAll(
      '.animate-on-scroll, .animate-on-scroll-child, .animate-slide-left, .hero-fade, .hero-logo-fade'
    );
    allAnimated.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // In Shopify theme editor, skip animations and show everything immediately
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('DOMContentLoaded', function () {
      showAllAnimated();
      var successEl = document.querySelector('.waitlist-success');
      if (successEl) { successEl.classList.add('is-visible'); }
    });
    return;
  }

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

              // Also trigger staggered children within this section
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
        { rootMargin: '-50px', threshold: 0.1 }
      );

      document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback: show everything immediately
      showAllAnimated();
    }

    // ---- Safety net: reveal everything after 3 seconds ----
    setTimeout(showAllAnimated, 3000);

    // ---- Waitlist success auto-reveal ----
    var successEl = document.querySelector('.waitlist-success');
    if (successEl) {
      successEl.classList.add('is-visible');

      // Scroll to waitlist section after form submission
      var waitlistSection = document.getElementById('waitlist');
      if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
})();
