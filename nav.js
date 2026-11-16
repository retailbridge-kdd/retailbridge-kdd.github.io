'use strict';
// Sticky-header shadow, header link highlight, and the left section rail.
(function () {
  const header = document.querySelector('header');
  const rail = document.querySelector('.sec-rail');
  const fill = rail.querySelector('.sec-rail-fill');
  const nameEl = rail.querySelector('.sec-rail-name');
  const railLinks = [...rail.querySelectorAll('a')];
  const navLinks = [...document.querySelectorAll('header nav a')];
  const sections = railLinks.map(a => document.getElementById(a.dataset.sec));
  const names = navLinks.map(a => a.textContent);
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const probe = window.innerHeight * 0.35;
    let current = -1;
    sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= probe) current = i; });
    const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = sections.length - 1;
    rail.classList.toggle('is-visible', current >= 0);
    railLinks.forEach((a, i) => { a.classList.toggle('is-active', i === current); a.classList.toggle('is-past', i < current); });
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === current));
    if (current >= 0) nameEl.textContent = names[current];
    fill.style.transform = `scaleY(${current <= 0 ? 0 : current / (sections.length - 1)})`;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
