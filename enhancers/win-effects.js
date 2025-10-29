/* Confetti + MP3 cheer on NEW winning tickets (no stage mode). */
(function () {
  const confettiEnabled = localStorage.getItem('confettiEnabled') !== 'false';
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  const celebrated = new Set();

  // ---- MP3 sound (preferred) ----
  const audioEl = document.getElementById('win-sfx');
  if (audioEl) {
    // Set comfortable default volume; tweak as you like (0.0–1.0)
    audioEl.volume = Number(localStorage.getItem('winVolume') ?? 0.8);
  }

  // ---- Minimal WebAudio fallback (only if MP3 fails) ----
  let audioCtx = null;
  function playFallbackChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 1046.5; // C6
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.2);
    } catch {}
  }

  // Prime on first user gesture so browsers allow play()
  function prime() {
    if (audioEl) {
      audioEl.play().then(() => {
        audioEl.pause(); audioEl.currentTime = 0;
      }).catch(() => {/* ignore */});
    } else {
      // create AudioContext early so fallback is allowed
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx && !audioCtx) audioCtx = new Ctx();
      } catch {}
    }
    window.removeEventListener('pointerdown', prime, true);
    window.removeEventListener('keydown', prime, true);
  }
  window.addEventListener('pointerdown', prime, true);
  window.addEventListener('keydown', prime, true);

  function playWinSound() {
    if (!soundEnabled) return;
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(playFallbackChime);
    } else {
      playFallbackChime();
    }
  }

  function celebrateOnce(key, colorHex) {
    if (celebrated.has(key)) return;
    celebrated.add(key);

    if (confettiEnabled && window.confetti) {
      const colors = colorHex ? [colorHex, '#ffffff'] : ['#22d3ee', '#a78bfa', '#f97316', '#34d399'];
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }
    playWinSound();
  }

  // Color → hex map for confetti
  const colorHexMap = {
    Red: '#e74c3c', Blue: '#3498db', Green: '#27ae60', Yellow: '#f39c12',
    Purple: '#9b59b6', Orange: '#e67e22', Pink: '#e91e63', Brown: '#795548',
    Black: '#2c3e50', Gray: '#7f8c8d', Teal: '#009688', Navy: '#34495e'
  };

  // Wrap existing addCalledTicket to keep your core logic untouched
  const original = window.addCalledTicket;
  if (typeof original !== 'function') return;

  window.addCalledTicket = function () {
    original.apply(this, arguments);
    setTimeout(() => {
      const first = document.querySelector('.called-tickets .ticket-item');
      if (!first || !first.classList.contains('winner')) return;

      const numText = first.querySelector('.ticket-number')?.textContent?.trim() || '';
      const colorText = first.querySelector('.ticket-color')?.textContent?.trim() || '';
      const key = `${colorText}:${numText}`;
      const hex = colorHexMap[colorText];
      celebrateOnce(key, hex);
    }, 50);
  };
})();
