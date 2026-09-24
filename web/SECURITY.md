# Login seguro

O login usa Supabase Auth. O navegador recebe somente a chave **anon/publishable**, que é pública por projeto. Nunca coloque uma `service_role`, senha de banco, chave privada ou token administrativo em `js/auth-config.js`.

## Ativação

1. Crie um projeto no Supabase e, em **Authentication > Providers**, mantenha Email ativado.
2. Em **Authentication > URL Configuration**, cadastre a URL final do site em `Site URL` e em `Redirect URLs`.
3. Em **Authentication > Email**, habilite `Confirm email`; configure SMTP próprio em produção para entrega confiável.
4. Em **Authentication > Security**, ative proteção contra senha vazada e CAPTCHA (Turnstile/hCaptcha), além de ajustar limite de tentativas. Isso reduz força bruta e criação automatizada de contas.
5. Copie a Project URL e a chave anon/publishable para `js/auth-config.js`. Não use a `service_role`.
6. Execute `supabase/schema.sql` no SQL Editor. A tabela exemplo já usa Row Level Security (RLS); novas tabelas de dados de usuário precisam seguir esse padrão.
7. Publique o `_headers` se a hospedagem suportar esse formato (Cloudflare Pages, Netlify). Em outro provedor, replique os cabeçalhos no servidor/CDN.

## Limites importantes

Nenhum login do lado do navegador, sozinho, torna dados invioláveis. A proteção depende de HTTPS, confirmação de e-mail, RLS em todo dado privado, chaves administrativas somente no servidor e atualização regular de dependências. Este site continua guardando favoritos e bolões apenas no `localStorage`; eles não são enviados para o Supabase.
