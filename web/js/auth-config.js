/*
 * Configuração pública do Supabase. Preencha estes valores no seu ambiente de
 * produção. A chave "anon"/"publishable" pode ficar no navegador; NUNCA use
 * aqui uma service_role key, token administrativo ou qualquer segredo.
 */
export const AUTH_CONFIG = {
  supabaseUrl: 'https://melzlusibtvkpvkjspzq.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbHpsdXNpYnR2a3B2a2pzcHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTMxNTgsImV4cCI6MjEwNTc4OTE1OH0.3pEK6Z98jsRdnQwzrUwkbyoCK1pcKEaArR-Xs9R6fMI',
  // Site key pública do Cloudflare Turnstile. Deixe vazio enquanto o CAPTCHA
  // estiver desligado no Supabase; a secret key vai SOMENTE no painel do Supabase.
  turnstileSiteKey: ''
};
