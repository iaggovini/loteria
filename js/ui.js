let toastTimer = null;

export function showToast(message, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.className = `toast toast-${type} visible`;
  el.setAttribute('role', 'alert');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 4000);
}

export function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

export function initThemeToggle(onChange) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    onChange(next);
    btn.setAttribute(
      'aria-label',
      next === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
    );
  });
}

export function initScrollSpy() {
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...document.querySelectorAll('#mainNav a')];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${id}`
          );
        });
      });
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

export function setLoading(container, message = 'Carregando…') {
  if (!container) return;
  container.innerHTML = `<p class="state-message" role="status">${message}</p>`;
}

export function setError(container, message) {
  if (!container) return;
  container.innerHTML = `<p class="state-message state-error" role="alert">${message}</p>`;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

export function showConfirm(message, {
  title = 'Confirmar',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 class="modal-title" id="modal-title">${title}</h3>
        <p class="modal-message">${message}</p>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-cancel">${cancelText}</button>
          <button type="button" class="modal-btn modal-confirm${danger ? ' modal-confirm-danger' : ''}">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const close = (result) => {
      overlay.classList.remove('modal-visible');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };

    overlay.querySelector('.modal-confirm').addEventListener('click', () => close(true));
    overlay.querySelector('.modal-cancel').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.modal-confirm').focus();
  });
}
