'use strict';
// Figures 1 and 2: regions light up once, in pipeline order, the first time each figure scrolls into view.
// Figure 1's regions are below; other figures carry theirs in a data-beats attribute.
(function () {
  const BEATS = {"steps":[0.0,1.2,2.4,3.6],"total":4.1,"beats":[{"s":0,"t":0.0,"k":"fade","r":[[12,64,744,1229]]},{"s":1,"t":1.2,"k":"fade","r":[[761,70,2076,1229],[738,681,802,741]]},{"s":2,"t":2.4,"k":"fade","r":[[2093,76,3402,1229],[2000,545,2115,1097]]},{"s":3,"t":3.6,"k":"fade","r":[[3414,73,3895,1229],[3353,281,3450,1093]]}]};
  document.querySelectorAll('.fw-anim').forEach(root => animate(root, root.dataset.beats ? JSON.parse(root.dataset.beats) : BEATS));

  function animate(root, BEATS) {
  const NS = 'http://www.w3.org/2000/svg';
  const layer = root.querySelector('.fw-mask-rects');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const items = [];
  BEATS.beats.forEach(b => b.r.forEach(([x0, y0, x1, y1]) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x0); r.setAttribute('y', y0);
    r.setAttribute('width', x1 - x0); r.setAttribute('height', y1 - y0);
    r.setAttribute('fill', '#fff');
    r.setAttribute('class', 'fw-r');
    layer.append(r);
    items.push({ el: r, t: b.t });
  }));

  let t = 0, last = null, running = false;

  function paint(instant) {
    if (instant) root.classList.add('fw-instant');
    items.forEach(it => it.el.classList.toggle('on', t >= it.t));
    if (instant) { root.getBoundingClientRect(); requestAnimationFrame(() => root.classList.remove('fw-instant')); }
  }

  function frame(now) {
    if (last !== null) t += (now - last) / 1000;
    last = now;
    paint(false);
    if (t < BEATS.total) requestAnimationFrame(frame);
    else { running = false; last = null; }
  }
  function play(from) {
    t = from; paint(true);
    if (!running) { running = true; last = null; requestAnimationFrame(frame); }
  }


  if (reduce) { t = BEATS.total; paint(true); return; }
  t = -0.3; paint(true);
  const io = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { io.disconnect(); play(-0.3); }
  }, { threshold: 0.4 });
  io.observe(root);
  }
})();
