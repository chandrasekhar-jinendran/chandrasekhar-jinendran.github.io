/* ============================================================
   Chandrasekhar Jinendran — portfolio
   Shared behaviour, vanilla JS. Converted from the design's
   DCLogic scripts: scroll-reveal, count-up, skill-bar fill,
   article reading-progress, and the contact form.
   Feature-detected — each page only runs what it has.
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- count-up numbers ---- */
    function animateCount(node) {
      var target = parseFloat(node.getAttribute('data-count')) || 0;
      var suffix = node.getAttribute('data-suffix') || '';
      if (prefersReduced) { node.textContent = target + suffix; return; }
      var dur = 1300, start = performance.now();
      (function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else node.textContent = target + suffix;
      })(start);
    }

    /* ---- skill-bar fill ---- */
    function fillBar(bar) {
      var f = bar.querySelector('.cj-fill');
      if (f) f.style.width = (bar.getAttribute('data-pct') || 0) + '%';
    }

    /* ---- scroll reveal + triggers ---- */
    var targets = document.querySelectorAll('[data-reveal], .cj-count, .cj-bar');

    function trigger(el) {
      if (el.hasAttribute('data-reveal')) el.classList.add('cj-in');
      if (el.classList.contains('cj-count')) animateCount(el);
      if (el.classList.contains('cj-bar')) fillBar(el);
    }

    if (!('IntersectionObserver' in window)) {
      [].forEach.call(targets, trigger);
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          trigger(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
      [].forEach.call(targets, function (el) { io.observe(el); });
    }

    /* ---- article reading-progress bar ---- */
    var progress = document.getElementById('cj-progress');
    if (progress) {
      var onScroll = function () {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
        progress.style.width = pct + '%';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* ---- contact form (static, opens the visitor's mail client) ---- */
    var form = document.getElementById('cj-contact');
    if (form) {
      var emailAddr = ['chandrasekharjinendran', 'gmail.com'].join('@');
      var fields = form.querySelector('#cj-form-fields');
      var done = form.querySelector('#cj-form-done');
      var nameEl = form.querySelector('#cj-name');
      var emailEl = form.querySelector('#cj-email');
      var msgEl = form.querySelector('#cj-message');
      var err = form.querySelector('#cj-email-error');
      var submit = form.querySelector('#cj-submit');
      var again = form.querySelector('#cj-again');

      if (emailEl) emailEl.addEventListener('input', function () { if (err) err.style.display = 'none'; });

      if (submit) submit.addEventListener('click', function () {
        var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((emailEl.value || '').trim());
        if (!valid) { if (err) err.style.display = 'block'; emailEl.focus(); return; }
        var name = (nameEl.value || '').trim();
        var body = (msgEl.value || '').trim();
        var subject = 'Project enquiry' + (name ? ' from ' + name : '');
        var lines = [];
        if (name) lines.push('Name: ' + name);
        lines.push('Email: ' + (emailEl.value || '').trim());
        lines.push('', body);
        var href = 'mailto:' + emailAddr +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        window.location.href = href;
        if (fields) fields.style.display = 'none';
        if (done) done.style.display = 'block';
      });

      if (again) again.addEventListener('click', function () {
        if (nameEl) nameEl.value = '';
        if (emailEl) emailEl.value = '';
        if (msgEl) msgEl.value = '';
        if (err) err.style.display = 'none';
        if (done) done.style.display = 'none';
        if (fields) fields.style.display = 'block';
      });
    }
  });
})();
