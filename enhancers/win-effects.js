/* Confetti + WebAudio chime on NEW winning tickets only (no Stage Mode, no files) */
(function () {
  const confettiEnabled = localStorage.getItem('confettiEnabled') !== 'false';
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  const celebrated = new Set();

  // ---- WebAudio setup (no MP3 needed) ----
  let audioCtx = null;
  function ensureAudioCtx() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    // Some browsers start suspended; resume on gesture
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Prime on first user gesture so playback is allowed everywhere
  function prime() {
    ensureAudioCtx();
    window.removeEventListener('pointerdown', prime, true);
    window.removeEventListener('keydown', prime, true);
  }
  window.addEventListener('pointerdown', prime, true);
  window.addEventListener('keydown', prime, true);

  // Short celebratory chime: two quick notes with soft envelope
  function playWinChime() {
    const ctx = ensureAudioCtx();
    if (!ctx) return; // audio not supported or disabled

    const now = ctx.currentTime;

    function tone(freq, start, dur, gainPeak) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      // Simple attack/decay envelope
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    }

    // Two notes: A5 then E6 (pleasant “cha-ching” vibe)
    tone(880, 0.00, 0.14, 0.25);   // A5
    tone(1319.88, 0.12, 0.16, 0.22); // E6
  }

  function celebrate(key, colorHex) {
    if (celebrated.has(key)) return;
    celebrated.add(key);

    if (confettiEnabled && window.confetti) {
      const colors = colorHex ? [colorHex, '#ffffff'] : ['#22d3ee', '#a78bfa', '#f97316', '#34d399'];
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }
    if (soundEnabled) playWinChime();
  }

  const colorHexMap = {
    Red: '#e74c3c', Blue: '#3498db', Green: '#27ae60', Yellow: '#f39c12',
    Purple: '#9b59b6', Orange: '#e67e22', Pink: '#e91e63', Brown: '#795548',
    Black: '#2c3e50', Gray: '#7f8c8d', Teal: '#009688', Navy: '#34495e'
  };

  // Wrap addCalledTicket so we don’t touch your core logic
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
      celebrate(key, colorHexMap[colorText]);
    }, 50);
  };
})();
