// Aplica o tema antes de a página aparecer (evita piscar no modo errado).
(function () {
  var theme = null;
  try { theme = localStorage.getItem('loteria-tema'); } catch (e) { /* ignora */ }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
