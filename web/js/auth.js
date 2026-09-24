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
    error: document.getElementById('authError'), hint: document.getElementById('authPasswordHint')
  };
}

async function getClient() {
  if (client) return client;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
  client = createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

function setError(message = '') {
  const { error } = getElements();
  error.textContent = message;
  error.hidden = !message;
}

function setMode(nextMode) {
  mode = nextMode;
  const { title, description, submit, toggle, hint, password, email } = getElements();
  const signup = mode === 'signup';
  const recovery = mode === 'recovery';
  title.textContent = recovery ? 'Definir nova senha' : (signup ? 'Criar conta' : 'Entrar');
  description.textContent = recovery ? 'Escolha uma nova senha forte para sua conta.' : (signup ? 'Confirme seu e-mail para ativar a conta.' : 'Acesse sua conta com segurança.');
  submit.textContent = recovery ? 'Salvar nova senha' : (signup ? 'Criar conta' : 'Entrar');
  toggle.hidden = recovery;
  hint.hidden = !(signup || recovery);
  password.autocomplete = signup || recovery ? 'new-password' : 'current-password';
  email.required = !recovery;
  email.closest('label').hidden = recovery;
  setError();
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

function openDialog() { getElements().dialog.showModal(); }

export async function initAuth() {
  const els = getElements();
  if (!configured()) {
    els.area.replaceChildren();
    return;
  }
  els.open?.addEventListener('click', openDialog);
  els.close?.addEventListener('click', () => els.dialog.close());
  els.dialog?.addEventListener('click', (event) => { if (event.target === els.dialog) els.dialog.close(); });
  els.toggle?.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
  els.reset?.addEventListener('click', async () => {
    const email = els.email.value.trim().toLowerCase();
    if (!emailPattern.test(email)) return setError('Informe seu e-mail para receber o link de redefinição.');
    const supabase = await getClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
    if (error) return setError('Não foi possível solicitar a redefinição. Tente novamente.');
    setError(); showToast('Se existir uma conta, enviaremos instruções para o e-mail informado.', 'success');
  });
  els.form?.addEventListener('submit', async (event) => {
    event.preventDefault(); setError();
    const email = els.email.value.trim().toLowerCase(); const password = els.password.value;
    if (mode !== 'recovery' && !emailPattern.test(email)) return setError('Informe um e-mail válido.');
    if ((mode === 'signup' || mode === 'recovery') && !validPassword(password)) return setError('A senha não atende aos requisitos de segurança.');
    els.submit.disabled = true;
    try {
      const supabase = await getClient();
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } })
        : mode === 'recovery'
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        const message = mode === 'signin'
          ? 'E-mail ou senha inválidos.'
          : mode === 'recovery'
            ? 'O link de recuperação expirou ou é inválido. Solicite um novo link.'
            : 'Não foi possível criar a conta. Tente outro e-mail.';
        return setError(message);
      }
      els.password.value = '';
      if (mode === 'recovery') { els.dialog.close(); setMode('signin'); return showToast('Senha atualizada. Faça login com a nova senha.', 'success'); }
      if (mode === 'signup' && !result.data.session) showToast('Confira seu e-mail para confirmar a conta.', 'success');
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
