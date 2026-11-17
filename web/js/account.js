/*
 * Painel "Minha conta": informações da conta, troca de senha e e-mail,
 * encerramento de sessões e exclusão da conta.
 */
import { getClient, PASSWORD_RULES, friendlyError } from './auth.js';
import { showToast } from './ui.js';

const $ = (id) => document.getElementById(id);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let currentUser = null;
let bound = false;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

function setError(message = '') {
  $('accountErrorText').textContent = message;
  $('accountError').hidden = !message;
}

function setBusy(button, busy, busyText) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.label;
}

function selectTab(name, focus = false) {
  document.querySelectorAll('[data-account-tab]').forEach((tab) => {
    const active = tab.dataset.accountTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
    $(`accountPanel-${tab.dataset.accountTab}`).hidden = !active;
  });
  setError();
}

function updateRules() {
  const value = $('accountNewPassword').value;
  $('accountPasswordRules').querySelectorAll('[data-rule]').forEach((item) => {
    item.classList.toggle('is-met', PASSWORD_RULES[item.dataset.rule](value));
  });
}

function fillProfile(user) {
  const email = user.email || '';
  $('accountAvatar').textContent = (email[0] || '?').toUpperCase();
  $('accountEmail').textContent = email;
  const badge = $('accountBadge');
  if (user.new_email) {
    badge.textContent = `Troca pendente para ${user.new_email}`;
    badge.dataset.state = 'pending';
  } else if (user.email_confirmed_at) {
    badge.textContent = 'E-mail confirmado';
    badge.dataset.state = 'ok';
  } else {
    badge.textContent = 'E-mail não confirmado';
    badge.dataset.state = 'pending';
  }
  $('accountCreated').textContent = formatDate(user.created_at);
  $('accountLastSignIn').textContent = formatDate(user.last_sign_in_at);
}

async function loadCloudSummary(supabase) {
  $('accountFavorites').textContent = 'Carregando…';
  $('accountPool').textContent = 'Carregando…';
  const [fav, pool] = await Promise.all([
    supabase.from('favorites').select('id', { count: 'exact', head: true }),
    supabase.from('pools').select('data, updated_at').maybeSingle()
  ]);
  $('accountFavorites').textContent = fav.error
    ? 'Indisponível'
    : `${fav.count ?? 0} de 20`;
  if (pool.error) {
    $('accountPool').textContent = 'Indisponível';
  } else if (!pool.data) {
    $('accountPool').textContent = 'Nenhum';
  } else {
    const data = pool.data.data || {};
    const bets = Array.isArray(data.bets) ? data.bets.length : 0;
    const name = data.name ? `${data.name} · ` : '';
    $('accountPool').textContent = `${name}${bets} aposta(s)`;
  }
}

export async function openAccount(tab = 'perfil') {
  const dialog = $('accountDialog');
  if (!dialog) return;
  bindOnce();
  selectTab(tab);
  $('accountNewPassword').value = '';
  $('accountNewEmail').value = '';
  $('accountDeleteConfirm').value = '';
  $('accountDelete').disabled = true;
  updateRules();
  if (!dialog.open) dialog.showModal();

  try {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error || new Error('sem usuário');
    currentUser = data.user;
    fillProfile(currentUser);
    await loadCloudSummary(supabase);
  } catch {
    setError('Não foi possível carregar os dados da conta. Verifique sua internet e tente novamente.');
  }
}

export function closeAccount() {
  const dialog = $('accountDialog');
  if (dialog?.open) dialog.close();
}

async function changePassword(event) {
  event.preventDefault();
  setError();
  const input = $('accountNewPassword');
  const password = input.value;
  if (!Object.values(PASSWORD_RULES).every((rule) => rule(password))) {
    setError('A nova senha ainda não cumpre todos os requisitos.');
    input.focus();
    return;
  }
  const button = $('accountPasswordSubmit');
  setBusy(button, true, 'Salvando…');
  try {
    const supabase = await getClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === 'reauthentication_needed') {
        setError('Por segurança, saia e entre novamente na conta antes de trocar a senha. Se preferir, use "Esqueceu a senha?" no login.');
      } else {
        setError(friendlyError(error, 'Não foi possível alterar a senha agora. Tente novamente.'));
      }
      return;
    }
    input.value = '';
    updateRules();
    showToast('Senha alterada com sucesso.', 'success');
  } catch {
    setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
  } finally {
    setBusy(button, false);
  }
}

async function changeEmail(event) {
  event.preventDefault();
  setError();
  const input = $('accountNewEmail');
  const email = input.value.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    setError('Informe um e-mail válido.');
    input.focus();
    return;
  }
  if (email === currentUser?.email) {
    setError('Esse já é o e-mail da sua conta.');
    return;
  }
  const button = $('accountEmailSubmit');
  setBusy(button, true, 'Enviando…');
  try {
    const supabase = await getClient();
    const redirectTo = `${location.origin}${location.pathname}`;
    const { data, error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    if (error) {
      setError(friendlyError(error, 'Não foi possível alterar o e-mail. Verifique o endereço e tente novamente.'));
      return;
    }
    input.value = '';
    if (data?.user) fillProfile(data.user);
    showToast('Enviamos o link de confirmação. Confira sua caixa de entrada.', 'success');
  } catch {
    setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
  } finally {
    setBusy(button, false);
  }
}

async function signOut(scope) {
  setError();
  try {
    const supabase = await getClient();
    const { error } = await supabase.auth.signOut({ scope });
    if (error) throw error;
    closeAccount();
    showToast(scope === 'global' ? 'Você saiu de todos os aparelhos.' : 'Você saiu da sua conta.', 'info');
  } catch {
    setError('Não foi possível sair agora. Tente novamente.');
  }
}

async function deleteAccount() {
  setError();
  if ($('accountDeleteConfirm').value.trim().toUpperCase() !== 'EXCLUIR') return;
  const button = $('accountDelete');
  setBusy(button, true, 'Excluindo…');
  try {
    const supabase = await getClient();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'local' });
    closeAccount();
    showToast('Sua conta e seus dados foram excluídos.', 'info');
  } catch {
    setError('Não foi possível excluir a conta agora. Tente novamente em instantes.');
  } finally {
    setBusy(button, false);
    button.disabled = $('accountDeleteConfirm').value.trim().toUpperCase() !== 'EXCLUIR';
  }
}

function bindOnce() {
  if (bound) return;
  bound = true;
  const dialog = $('accountDialog');
  $('closeAccountDialog').addEventListener('click', closeAccount);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeAccount(); });

  const tabs = $('accountTabs');
  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-account-tab]');
    if (tab) selectTab(tab.dataset.accountTab);
  });
  tabs.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const list = [...tabs.querySelectorAll('[data-account-tab]')];
    const index = list.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const next = list[(index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    selectTab(next.dataset.accountTab, true);
  });

  $('accountNewPassword').addEventListener('input', updateRules);
  $('accountPasswordForm').addEventListener('submit', changePassword);
  $('accountEmailForm').addEventListener('submit', changeEmail);
  $('accountSignOut').addEventListener('click', () => signOut('local'));
  $('accountSignOutAll').addEventListener('click', () => signOut('global'));
  $('accountDeleteConfirm').addEventListener('input', (event) => {
    $('accountDelete').disabled = event.target.value.trim().toUpperCase() !== 'EXCLUIR';
  });
  $('accountDelete').addEventListener('click', deleteAccount);
}
