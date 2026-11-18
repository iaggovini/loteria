import { AUTH_CONFIG } from './auth-config.js';
import { showToast } from './ui.js';
import { openAccount, closeAccount } from './account.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let client;
let mode = 'signin';

const MODES = {
  signin: {
    title: 'Bem-vindo de volta',
    description: 'Acesse sua conta Bom de Sorte.',
    submit: 'Entrar', busy: 'Entrando…'
  },
  signup: {
    title: 'Crie sua conta',
    description: 'Leva menos de um minuto. Depois, é só confirmar pelo e-mail.',
    submit: 'Criar conta', busy: 'Criando conta…'
  },
  forgot: {
    title: 'Redefinir senha',
    description: 'Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.',
    submit: 'Enviar link de redefinição', busy: 'Enviando…'
  },
  recovery: {
    title: 'Crie uma nova senha',
    description: 'Escolha uma senha forte, diferente das que você já usou.',
    submit: 'Salvar nova senha', busy: 'Salvando…'
  }
};

export const PASSWORD_RULES = {
  length: (v) => v.length >= 12,
  upper: (v) => /[A-Z]/.test(v),
  lower: (v) => /[a-z]/.test(v),
  number: (v) => /\d/.test(v),
  symbol: (v) => /[^A-Za-z0-9]/.test(v)
};

function configured() {
  return /^https:\/\/.+\.supabase\.co$/i.test(AUTH_CONFIG.supabaseUrl) &&
    AUTH_CONFIG.supabaseAnonKey.length > 20;
}

const $ = (id) => document.getElementById(id);

function getElements() {
  return {
    area: $('authArea'), dialog: $('authDialog'), open: $('openAuthDialog'), close: $('closeAuthDialog'),
    tabs: $('authTabs'), back: $('authBack'), form: $('authForm'),
    title: $('authDialogTitle'), description: $('authDescription'),
    emailField: $('authEmailField'), email: $('authEmail'),
    passwordField: $('authPasswordField'), password: $('authPassword'), reveal: $('authReveal'),
    reset: $('authReset'), hint: $('authPasswordHint'),
    error: $('authError'), errorText: $('authErrorText'),
    submit: $('authSubmit'), submitLabel: $('authSubmitLabel'),
    done: $('authDone'), doneTitle: $('authDoneTitle'), doneText: $('authDoneText'), doneBack: $('authDoneBack')
  };
}

export async function getClient() {
  if (client) return client;
  const { createClient } = await import('./vendor/supabase.js');
  client = createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

let captchaWidget;
let captchaToken;
let captchaFailed = false;
const captchaWaiters = [];

// Espera o token do CAPTCHA (até `ms`), em vez de recusar o envio na hora.
function waitForCaptcha(ms = 10000) {
  if (!AUTH_CONFIG.turnstileSiteKey || captchaToken) return Promise.resolve(true);
  return new Promise((resolve) => {
    captchaWaiters.push(resolve);
    setTimeout(() => resolve(Boolean(captchaToken)), ms);
  });
}

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
  try {
    const turnstile = await loadTurnstile();
    captchaWidget = turnstile.render($('authCaptcha'), {
      sitekey: AUTH_CONFIG.turnstileSiteKey,
      language: 'pt-br',
      theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      size: 'flexible',
      // Só aparece quando o Cloudflare precisa de interação do usuário.
      appearance: 'interaction-only',
      callback: (token) => {
        captchaToken = token;
        captchaFailed = false;
        captchaWaiters.splice(0).forEach((resolve) => resolve(true));
      },
      'expired-callback': () => { captchaToken = undefined; },
      // O Turnstile tenta de novo sozinho; só registramos a falha.
      'error-callback': () => { captchaToken = undefined; captchaFailed = true; }
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
  const { error, errorText } = getElements();
  errorText.textContent = message;
  error.hidden = !message;
}

export function friendlyError(error, fallback) {
  const code = error?.code || '';
  if (error?.status === 429 || code.includes('rate_limit')) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (code === 'email_not_confirmed') return 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos para ativar a conta.';
  if (code === 'weak_password') return 'Essa senha é fraca ou já apareceu em vazamentos de dados. Escolha outra.';
  if (code === 'same_password') return 'A nova senha precisa ser diferente da atual.';
  if (code === 'email_address_not_authorized') return 'Não conseguimos enviar e-mails para esse endereço no momento. Tente novamente mais tarde.';
  if (code.includes('captcha')) return 'A verificação de segurança falhou. Tente novamente.';
  return fallback;
}

function setBusy(busy) {
  const { submit, submitLabel } = getElements();
  submit.disabled = busy;
  submit.classList.toggle('is-busy', busy);
  submitLabel.textContent = busy ? MODES[mode].busy : MODES[mode].submit;
}

function updateRules() {
  const { hint, password } = getElements();
  for (const item of hint.querySelectorAll('[data-rule]')) {
    item.classList.toggle('is-met', PASSWORD_RULES[item.dataset.rule](password.value));
  }
}

function validPassword(value) {
  return Object.values(PASSWORD_RULES).every((rule) => rule(value));
}

function setRevealed(revealed) {
  const { password, reveal } = getElements();
  password.type = revealed ? 'text' : 'password';
  reveal.setAttribute('aria-pressed', String(revealed));
  reveal.setAttribute('aria-label', revealed ? 'Ocultar senha' : 'Mostrar senha');
}

function setMode(nextMode) {
  mode = nextMode;
  const els = getElements();
  const texts = MODES[mode];
  const newPassword = mode === 'signup' || mode === 'recovery';

  els.form.hidden = false;
  els.done.hidden = true;
  els.tabs.hidden = !(mode === 'signin' || mode === 'signup');
  for (const tab of els.tabs.querySelectorAll('[data-auth-tab]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.authTab === mode));
  }
  els.back.hidden = mode !== 'forgot';
  els.title.textContent = texts.title;
  els.description.textContent = texts.description;
  els.emailField.hidden = mode === 'recovery';
  els.passwordField.hidden = mode === 'forgot';
  els.reset.hidden = mode !== 'signin';
  els.hint.hidden = !newPassword;
  els.password.autocomplete = newPassword ? 'new-password' : 'current-password';
  els.password.value = '';
  setRevealed(false);
  updateRules();
  setError();
  setBusy(false);
}

function showDone(title, email, message) {
  const { form, done, tabs, back, doneTitle, doneText, doneBack } = getElements();
  form.hidden = true;
  tabs.hidden = true;
  back.hidden = true;
  done.hidden = false;
  doneTitle.textContent = title;
  const strong = document.createElement('strong');
  strong.textContent = email;
  doneText.replaceChildren(message[0], strong, message[1]);
  doneBack.focus();
}

function renderUser(user) {
  window.dispatchEvent(new CustomEvent('auth:user', { detail: user || null }));
  const privacy = $('privacyAccount');
  if (privacy) privacy.hidden = !user;
  const { area } = getElements();
  area.replaceChildren();
  if (!user) {
    closeAccount();
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn-auth'; button.id = 'openAuthDialog';
    button.textContent = 'Entrar';
    button.addEventListener('click', openDialog);
    area.append(button);
    return;
  }
  const email = user.email || '';
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'auth-user';
  chip.title = email ? `Minha conta (${email})` : 'Minha conta';
  chip.setAttribute('aria-label', `Minha conta (${email})`);
  chip.addEventListener('click', () => openAccount());
  const avatar = document.createElement('span');
  avatar.className = 'auth-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = (email[0] || '?').toUpperCase();
  chip.append(avatar); // só a inicial; o e-mail fica no título e no painel Minha conta

  const logout = document.createElement('button');
  logout.type = 'button'; logout.className = 'btn-auth'; logout.textContent = 'Sair';
  logout.addEventListener('click', async () => {
    const supabase = await getClient();
    await supabase.auth.signOut();
    showToast('Você saiu da sua conta.', 'info');
  });
  area.append(chip, logout);
}

let captchaStarted = false;

function openDialog(nextMode = 'signin') {
  const { dialog, email } = getElements();
  setMode(typeof nextMode === 'string' ? nextMode : 'signin');
  if (!dialog.open) dialog.showModal();
  if (mode !== 'recovery') email.focus();
  if (!captchaStarted) { captchaStarted = true; initCaptcha(); }
  connect().catch(() => {});
}

async function submit(els) {
  await connect();
  const email = els.email.value.trim().toLowerCase();
  const password = els.password.value;
  const redirectTo = `${location.origin}${location.pathname}`;

  if (mode !== 'recovery' && !emailPattern.test(email)) return setError('Informe um e-mail válido.');
  if (mode === 'signin' && !password) return setError('Informe sua senha.');
  if ((mode === 'signup' || mode === 'recovery') && !validPassword(password)) {
    return setError('A senha ainda não cumpre todos os requisitos.');
  }
  if (mode !== 'recovery' && captchaMissing()) {
    if (captchaFailed) resetCaptcha();
    const ready = await waitForCaptcha();
    if (!ready) {
      return setError('A verificação de segurança não foi concluída. Recarregue a página e tente de novo; se continuar, desative bloqueadores de anúncio ou tente outro navegador.');
    }
  }

  const supabase = await getClient();

  if (mode === 'forgot') {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
    resetCaptcha();
    if (error) return setError(friendlyError(error, 'Não foi possível enviar o link agora. Tente novamente em instantes.'));
    return showDone('Verifique seu e-mail', email, [
      'Se houver uma conta associada a ',
      ', você receberá em instantes um link para redefinir sua senha.'
    ]);
  }

  if (mode === 'recovery') {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(friendlyError(error, 'O link de redefinição expirou ou é inválido. Solicite um novo.'));
    els.dialog.close();
    return showToast('Senha atualizada com sucesso.', 'success');
  }

  if (mode === 'signup') {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, captchaToken } });
    resetCaptcha();
    if (error) return setError(friendlyError(error, 'Não foi possível criar a conta. Verifique os dados e tente novamente.'));
    if (!data.session) {
      return showDone('Confirme seu e-mail', email, [
        'Enviamos um link de confirmação para ',
        '. Abra o e-mail e clique no link para ativar sua conta.'
      ]);
    }
    els.dialog.close();
    return showToast('Conta criada. Boas-vindas ao Bom de Sorte!', 'success');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
  resetCaptcha();
  if (error) return setError(friendlyError(error, 'E-mail ou senha incorretos.'));
  els.dialog.close();
  showToast('Login realizado.', 'success');
}

export async function initAuth() {
  const els = getElements();
  if (!configured()) {
    els.area.replaceChildren();
    return;
  }
  els.open?.addEventListener('click', () => openDialog());
  $('privacyOpenAccount')?.addEventListener('click', () => openAccount());
  els.close.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (event) => { if (event.target === els.dialog) els.dialog.close(); });
  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-auth-tab]');
    if (tab && tab.dataset.authTab !== mode) { setMode(tab.dataset.authTab); els.email.focus(); }
  });
  els.reset.addEventListener('click', () => { setMode('forgot'); els.email.focus(); });
  els.back.addEventListener('click', () => { setMode('signin'); els.email.focus(); });
  els.doneBack.addEventListener('click', () => { setMode('signin'); els.email.focus(); });
  els.reveal.addEventListener('click', () => setRevealed(els.password.type === 'password'));
  els.password.addEventListener('input', updateRules);
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError();
    setBusy(true);
    try {
      await submit(els);
    } catch {
      setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setBusy(false);
    }
  });

  // A biblioteca de login (≈220 KB) só é baixada quando há uma sessão salva,
  // um link de confirmação/recuperação na URL, ou quando a pessoa abre o login.
  if (hasStoredSession() || hasAuthParams()) await connect();
  else renderUser(null);
}

function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('sb-') && key.includes('-auth-token')) return true;
    }
  } catch {
    return true; // sem acesso ao armazenamento: conecta para não esconder a sessão
  }
  return false;
}

function hasAuthParams() {
  const hash = location.hash || '';
  const search = new URLSearchParams(location.search);
  return /access_token|refresh_token|error_description|type=recovery/.test(hash)
    || search.has('code') || search.has('token_hash') || search.has('error_description');
}

let connecting = null;
function connect() {
  if (!connecting) {
    connecting = (async () => {
      const supabase = await getClient();
      const { data } = await supabase.auth.getSession();
      renderUser(data.session?.user);
      supabase.auth.onAuthStateChange((event, session) => {
        renderUser(session?.user);
        if (event === 'PASSWORD_RECOVERY') openDialog('recovery');
      });
    })().catch((error) => {
      connecting = null;
      throw error;
    });
  }
  return connecting;
}
