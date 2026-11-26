let toastTimer = null;

export function showToast(message, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.className = `toast toast-${type} visible`;
  el.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');

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

  initAutoHideHeader(nav);
}

// Esconde o topo ao rolar para baixo e mostra de novo ao rolar para cima.
function initAutoHideHeader(nav) {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < 8) return;
    const keepVisible = y < 120 || nav.classList.contains('open') || header.contains(document.activeElement);
    header.classList.toggle('is-hidden', delta > 0 && !keepVisible);
    lastY = y;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}

export function initThemeToggle(onChange) {
  const btn = document.getElementById('themeToggle');
  const text = document.getElementById('themeToggleLabel');
  if (!btn) return;
  const sync = (theme) => {
    const label = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    if (text) text.textContent = label;
    btn.setAttribute('aria-label', `Ativar ${label.toLowerCase()}`);
  };
  sync(document.documentElement.getAttribute('data-theme') || 'dark');

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    onChange(next);
    sync(next);
  });
}

// ---------------------------------------------------------------------------
// Telas do site (Início, Resultados, Simulador, Bolão, Ajuda). O endereço
// continua usando âncoras (#simulador, #faq...), então links antigos funcionam.
// ---------------------------------------------------------------------------
const TITLES = {
  inicio: 'Turma do Bolão — Resultados, estatísticas e simulador de loterias',
  resultados: 'Resultados e estatísticas — Turma do Bolão',
  simulador: 'Simulador de apostas — Turma do Bolão',
  bolao: 'Gerenciador de bolão — Turma do Bolão',
  ajuda: 'Como jogar e dúvidas — Turma do Bolão'
};

function route() {
  const views = [...document.querySelectorAll('.view[data-view]')];
  if (!views.length) return;
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
  if (id === 'main-content') return; // link "Ir para o conteúdo"

  let target = id && /^[\w-]+$/.test(id) ? document.getElementById(id) : null;
  let view = target?.closest('.view[data-view]');
  if (!view) {
    view = views.find((v) => v.dataset.view === id) || views[0];
    target = null;
  }

  const changed = view.hidden;
  views.forEach((v) => { v.hidden = v !== view; });
  const name = view.dataset.view;
  document.body.dataset.view = name;
  if (TITLES[name]) document.title = TITLES[name];

  const links = [...document.querySelectorAll('#mainNav a')];
  const exact = links.find((a) => a.getAttribute('href') === `#${id}`);
  links.forEach((a) => {
    const el = document.getElementById(a.getAttribute('href').slice(1));
    const inView = el?.closest('.view') === view;
    const active = exact ? a === exact : inView && a === links.find((l) => document.getElementById(l.getAttribute('href').slice(1))?.closest('.view') === view);
    a.classList.toggle('active', Boolean(active));
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  const first = view.querySelector('section');
  if (!target || target === first) {
    if (changed || !target) window.scrollTo({ top: 0, behavior: 'auto' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: changed ? 'auto' : 'smooth' });
  }
}

export function initRouter() {
  window.addEventListener('hashchange', route);
  route();
}

/** Vai para uma seção (trocando de tela se preciso). */
export function goTo(id) {
  if (location.hash === `#${id}`) route();
  else location.hash = id;
}

export function setLoading(container, message = 'Carregando…') {
  if (!container) return;
  container.innerHTML = `<p class="state-message" role="status">${message}</p>`;
}

export function setError(container, message) {
  if (!container) return;
  container.innerHTML = `<p class="state-message state-error" role="alert">${message}</p>`;
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

    const previousFocus = document.activeElement;
    let closed = false;
    const close = (result) => {
      if (closed) return;
      closed = true;
      overlay.classList.remove('modal-visible');
      setTimeout(() => overlay.remove(), 400); // caso a transição não dispare
      previousFocus?.focus?.();
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    // Enter aciona o botão em foco (comportamento nativo); Tab fica preso no modal.
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        e.preventDefault();
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };

    overlay.querySelector('.modal-confirm').addEventListener('click', () => close(true));
    overlay.querySelector('.modal-cancel').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.modal-confirm').focus();
  });
}
