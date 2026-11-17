/*
 * Registra o Service Worker. Fica separado (script comum, sem imports) para
 * funcionar mesmo que os módulos do site falhem ao carregar: quando uma versão
 * nova assume, a página recarrega uma vez para não misturar arquivos antigos
 * e novos.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var hadController = Boolean(navigator.serviceWorker.controller);
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
  });
})();
