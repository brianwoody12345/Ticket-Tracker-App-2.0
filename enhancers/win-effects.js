/* Confetti + cheer (autoplay safe) for NEW winners using DOM observer. */
(function () {
  // Feature toggles via localStorage (handy during tests)
  const confettiEnabled = localStorage.getItem('confettiEnabled') !== 'false';
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

  // Track which tickets we’ve already celebrated (avoid double-trigger)
  const celebrated = new Set();

  // ---------- AUDIO ----------
  let audioEl = document.getElementById('win-sfx');
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'win-sfx';
    audioEl.src = './win.mp3';        // file should live next to index.html
    audioEl.preload = 'auto';
    audioEl.setAttribute('playsinline', '');
    document.body.appendChild(audioEl);
  }
  audioEl.volume = Number(localStorage.getItem('winVolume') ?? 0.8);

  // Minimal WebAudio fallback chime (only if mp3 play() fails)
  function fallbackChime() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const ctx = new C();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 1244.5; // D#6
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.22);
    } catch {}
  }

  // Autoplay primer: after first user gesture, browsers allow play()
  function primeOnce() {
    audioEl.play().then(() => {
      audioEl.pause(); audioEl.currentTime = 0;
    }).catch(() => { /* ignore — user gesture still whitelists */ });
    window.removeEventListener('pointerdown', primeOnce, true);
    window.removeEventListener('keydown', primeOnce, true);
    window.removeEventListener('touchstart', primeOnce, true);
  }
  window.addEventListener('pointerdown', primeOnce, true);
  window.addEventListener('keydown', primeOnce, true);
  window.addEventListener('touchstart', primeOnce, true);

  function playWinSound() {
    if (!soundEnabled) return;
    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        // If autoplay blocked, play on next click
        const once = () => { audioEl.play().catch(fallbackChime); };
        document.body.addEventListener('click', once, { once: true });
        console.log('🔈 Autoplay blocked — will play after next click.');
      });
    }
  }

  // ---------- CONFETTI ----------
  const colorHexMap = {
    Red:'#e74c3c', Blue:'#3498db', Green:'#27ae60', Yellow:'#f39c12',
    Purple:'#9b59b6', Orange:'#e67e22', Pink:'#e91e63', Brown:'#795548',
    Black:'#2c3e50', Gray:'#7f8c8d', Teal:'#009688', Navy:'#34495e'
  };

  function celebrate(key, colorName) {
    if (celebrated.has(key)) return;
    celebrated.add(key);

    if (confettiEnabled && typeof window.confetti === 'function') {
      const c = colorHexMap[colorName] || '#22d3ee';
      const colors = [c, '#ffffff'];
      window.confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
      window.confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
      window.confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }

    playWinSound();
  }

  // ---------- DOM OBSERVER (no reliance on addCalledTicket being global) ----------
  const container = document.getElementById('calledTickets');
  if (!container) {
    console.warn('[win-effects] #calledTickets not found; effects idle.');
    return;
  }

  // Helper: celebrate a given ticket node if it’s a winner
  function celebrateNode(node) {
    if (!node.classList?.contains('winner')) return;
    const numText   = node.querySelector('.ticket-number')?.textContent?.trim() || '';
    const colorText = node.querySelector('.ticket-color')?.textContent?.trim() || '';
    const key = `${colorText}::${numText}`;
    if (!key) return;
    celebrate(key, colorText);
  }

  // Celebrate any existing winners (e.g., after refresh)
  container.querySelectorAll('.ticket-item.winner').forEach(celebrateNode);

  // Watch for newly added winners
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.classList?.contains('ticket-item')) celebrateNode(n);
        n.querySelectorAll?.('.ticket-item.winner')?.forEach(celebrateNode);
      });
    }
  });
  obs.observe(container, { childList: true, subtree: true });

  // If tab was hidden when winner appeared, celebrate on return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const first = container.querySelector('.ticket-item.winner');
    if (first) celebrateNode(first);
  });
})();
