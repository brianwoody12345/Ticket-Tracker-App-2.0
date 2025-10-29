/* Confetti + Sound on NEW winning tickets only (no Stage Mode) */
(function(){
  const confettiEnabled = localStorage.getItem('confettiEnabled') !== 'false';
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  const celebrated = new Set();

  // Simple sound; replace with your own file if desired
  const audio = new Audio('https://cdn.jsdelivr.net/gh/itsrealfarhan/sfx/cash-register.mp3');
  audio.preload = 'auto';

  function celebrate(key, colorHex) {
    if (celebrated.has(key)) return;
    celebrated.add(key);

    if (confettiEnabled && window.confetti) {
      const colors = colorHex ? [colorHex, '#ffffff'] : ['#22d3ee','#a78bfa','#f97316','#34d399'];
      // Center blast + side bursts
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }
    if (soundEnabled) {
      audio.currentTime = 0;
      audio.play().catch(()=>{});
    }
  }

  // Map visible color label -> hex for confetti tint
  const colorHexMap = {
    Red:'#e74c3c', Blue:'#3498db', Green:'#27ae60', Yellow:'#f39c12',
    Purple:'#9b59b6', Orange:'#e67e22', Pink:'#e91e63', Brown:'#795548',
    Black:'#2c3e50', Gray:'#7f8c8d', Teal:'#009688', Navy:'#34495e'
  };

  // Wrap addCalledTicket so we don’t touch your core logic
  const original = window.addCalledTicket;
  if (typeof original !== 'function') return;

  window.addCalledTicket = function(){
    original.apply(this, arguments);
    // After DOM updates, detect the newest item
    setTimeout(() => {
      const first = document.querySelector('.called-tickets .ticket-item');
      if (!first) return;
      if (!first.classList.contains('winner')) return;

      const numText = first.querySelector('.ticket-number')?.textContent?.trim() || '';
      const colorText = first.querySelector('.ticket-color')?.textContent?.trim() || '';
      const key = `${colorText}:${numText}`;
      celebrate(key, colorHexMap[colorText]);
    }, 50);
  };
})();
