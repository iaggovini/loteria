import { AUTH_CONFIG } from './auth-config.js';
import { showToast } from './ui.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let client;
let mode = 'signin';

function configured() {
  return /^https:\/\/.+\.supabase\.co$/i.test(AUTH_CONFIG.supabaseUrl) &&
    AUTH_CONFIG.supabaseAnonKey.length > 20;
}

function getElements() {
  return {
    area: document.getElementById('authArea'), dialog: document.getElementById('authDialog'),
    open: document.getElementById('openAuthDialog'), close: document.getElementById('closeAuthDialog'),
    form: document.getElementById('authForm'), email: document.getElementById('authEmail'),
    password: document.getElementById('authPassword'), title: document.getElementById('authDialogTitle'),
    description: document.getElementById('authDescription'), submit: document.getElementById('authSubmit'),
    toggle: document.getElementById('authModeToggle'), reset: document.getElementById('authReset'),
    error: document.getElementById('authError'), hint: document.getElementById('authPasswordHint'),
    success: document.getElementById('authSuccess')
  };
}

async function getClient() {
  if (client) return client;
  const { createClient } = await import('./vendor/supabase.js');
  client = createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

let captchaWidget;
let captchaToken;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('turnstile'));
    document.head.append(script);
  });
}

async function initCaptcha() {
  if (!AUTH_CONFIG.turnstileSiteKey) return;
  const container = document.getElementById('authCaptcha');
  try {
    const turnstile = await loadTurnstile();
    container.hidden = false;
    captchaWidget = turnstile.render(container, {
      sitekey: AUTH_CONFIG.turnstileSiteKey,
      language: 'pt-br',
      callback: (token) => { captchaToken = token; },
      'expired-callback': () => { captchaToken = undefined; },
      'error-callback': () => { captchaToken = undefined; }
    });
  } catch {
    setError('Não foi possível carregar a verificação de segurança. Recarregue a página.');
  }
}

// Tokens do Turnstile valem para uma única requisição.
function resetCaptcha() {
  captchaToken = undefined;
  if (captchaWidget !== undefined) window.turnstile?.reset(captchaWidget);
}

function captchaMissing() {
  return Boolean(AUTH_CONFIG.turnstileSiteKey) && !captchaToken;
}

function setError(message = '') {
  const { error, success } = getElements();
  error.textContent = message;
  error.hidden = !message;
  if (message) success.hidden = true;
}

// Mensagens de sucesso ficam dentro do diálogo: o toast fica atrás do modal.
function setSuccess(message = '') {
  const { error, success } = getElements();
  success.textContent = message;
  success.hidden = !message;
  if (message) error.hidden = true;
}

function friendlyError(error, fallback) {
  const code = error?.code || '';
  if (error?.status === 429 || code.includes('rate_limit')) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (code === 'email_address_not_authorized') return 'O envio de e-mails ainda não está liberado para este endereço. Tente novamente mais tarde.';
  if (code.includes('captcha')) return 'A verificação de segurança falhou. Tente novamente.';
  return fallback;
}

const MODES = {
  signin: { title: 'Entrar', description: 'Acesse sua conta com segurança.', submit: 'Entrar', toggle: 'Criar conta' },
  signup: { title: 'Criar conta', description: 'Confirme seu e-mail para ativar a conta.', submit: 'Criar conta', toggle: 'Já tenho conta' },
  forgot: { title: 'Recuperar senha', description: 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.', submit: 'Enviar link', toggle: 'Voltar para o login' },
  recovery: { title: 'Definir nova senha', description: 'Escolha uma nova senha forte para sua conta.', submit: 'Salvar nova senha' }
};

function setMode(nextMode) {
  mode = nextMode;
  const { title, description, submit, toggle, reset, hint, password, email } = getElements();
  const texts = MODES[mode];
  const newPassword = mode === 'signup' || mode === 'recovery';
  title.textContent = texts.title;
  description.textContent = texts.description;
  submit.textContent = texts.submit;
  toggle.hidden = mode === 'recovery';
  toggle.textContent = texts.toggle || '';
  reset.hidden = mode !== 'signin';
  hint.hidden = !newPassword;
  password.autocomplete = newPassword ? 'new-password' : 'current-password';
  password.closest('label').hidden = mode === 'forgot';
  email.closest('label').hidden = mode === 'recovery';
  setError();
  setSuccess();
}

function validPassword(value) {
  return value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function renderUser(user) {
  const { area } = getElements();
  area.replaceChildren();
  if (!user) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn-auth'; button.id = 'openAuthDialog';
    button.textContent = 'Entrar';
    button.addEventListener('click', openDialog);
    area.append(button);
    return;
  }
  const label = document.createElement('span');
  label.className = 'auth-user'; label.textContent = user.email || 'Conta';
  const logout = document.createElement('button');
  logout.type = 'button'; logout.className = 'btn-auth'; logout.textContent = 'Sair';
  logout.addEventListener('click', async () => {
    const supabase = await getClient();
    await supabase.auth.signOut();
    showToast('Sessão encerrada.', 'info');
  });
  area.append(label, logout);
}

let captchaStarted = false;

function openDialog() {
  getElements().dialog.showModal();
  if (!captchaStarted) { captchaStarted = true; initCaptcha(); }
}

export async function initAuth() {
  const els = getElements();
  if (!configured()) {
    els.area.replaceChildren();
    return;
  }
  els.open?.addEventListener('click', openDialog);
  els.close?.addEventListener('click', () => els.dialog.close());
  els.dialog?.addEventListener('close', () => { if (mode !== 'signin') setMode('signin'); });
  els.dialog?.addEventListener('click', (event) => { if (event.target === els.dialog) els.dialog.close(); });
  els.toggle?.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
  els.reset?.addEventListener('click', () => { setMode('forgot'); els.email.focus(); });
  els.form?.addEventListener('submit', async (event) => {
    event.preventDefault(); setError();
    const email = els.email.value.trim().toLowerCase(); const password = els.password.value;
    if (mode !== 'recovery' && !emailPattern.test(email)) return setError('Informe um e-mail válido.');
    if ((mode === 'signup' || mode === 'recovery') && !validPassword(password)) return setError('A senha não atende aos requisitos de segurança.');
    if (mode !== 'recovery' && captchaMissing()) return setError('Conclua a verificação de segurança.');
    els.submit.disabled = true;
    try {
      const supabase = await getClient();
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}`, captchaToken });
        resetCaptcha();
        if (error) return setError(friendlyError(error, 'Não foi possível enviar o link. Tente novamente.'));
        return setSuccess('Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.');
      }
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}`, captchaToken } })
        : mode === 'recovery'
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (mode !== 'recovery') resetCaptcha();
      if (result.error) {
        const message = mode === 'signin'
          ? 'E-mail ou senha inválidos.'
          : mode === 'recovery'
            ? 'O link de recuperação expirou ou é inválido. Solicite um novo link.'
            : 'Não foi possível criar a conta. Tente outro e-mail.';
        return setError(friendlyError(result.error, message));
      }
      els.password.value = '';
      if (mode === 'recovery') { els.dialog.close(); setMode('signin'); return showToast('Senha atualizada com sucesso.', 'success'); }
      if (mode === 'signup' && !result.data.session) setSuccess('Conta criada! Enviamos um link de confirmação para o seu e-mail. Confira também a caixa de spam.');
      else { els.dialog.close(); showToast('Login realizado com segurança.', 'success'); }
    } finally { els.submit.disabled = false; }
  });
  const supabase = await getClient();
  const { data } = await supabase.auth.getSession();
  renderUser(data.session?.user);
  supabase.auth.onAuthStateChange((event, session) => {
    renderUser(session?.user);
    if (event === 'PASSWORD_RECOVERY') {
      els.dialog.showModal();
      setMode('recovery');
    }
  });
}
