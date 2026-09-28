document.getElementById('btnPrint')?.addEventListener('click', () => {
  const mod = document.getElementById('modalitySelect');
  const nums = document.getElementById('selectedNumbers');
  document.getElementById('printModality').textContent = mod?.selectedOptions?.[0]?.text || '';
  document.getElementById('printNumbers').textContent = nums?.textContent || '';
});
