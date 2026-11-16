'use strict';
// Benchmark example: the two hops and the answer appear in order, and the matching highlights light up, once.
(function () {
  const root = document.getElementById('ex2');
  if (!root) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    root.classList.add('is-on'); return;
  }
  root.classList.add('is-armed');
  const io = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { io.disconnect(); root.classList.add('is-on'); }
  }, { threshold: 0.35 });
  io.observe(root);
})();
