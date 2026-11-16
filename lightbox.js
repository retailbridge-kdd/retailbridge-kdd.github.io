'use strict';
// In-page figure viewer for links marked data-lightbox. Esc, the close button, or a click outside the image closes it.
(function () {
  const links = document.querySelectorAll('a[data-lightbox]');
  if (!links.length) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Figure viewer');
  dlg.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close figure viewer">' +
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<figure class="lightbox-body"><img alt=""><figcaption></figcaption></figure>';
  document.body.append(dlg);
  const img = dlg.querySelector('img');
  const cap = dlg.querySelector('figcaption');
  links.forEach(link => link.addEventListener('click', e => {
    if (typeof dlg.showModal !== 'function') return; // very old browsers: follow the link
    e.preventDefault();
    const source = link.closest('figure');
    const original = source && source.querySelector('img');
    img.src = link.getAttribute('href');
    img.alt = link.dataset.alt || (original ? original.alt : '');
    const fc = source && source.querySelector('figcaption');
    cap.innerHTML = fc ? fc.innerHTML : '';
    cap.hidden = !fc;
    dlg.showModal();
    document.documentElement.classList.add('lightbox-open');
  }));
  dlg.querySelector('.lightbox-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => document.documentElement.classList.remove('lightbox-open'));
})();
