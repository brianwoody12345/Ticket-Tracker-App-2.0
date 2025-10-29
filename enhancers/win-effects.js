/* Confetti + cheer (autoplay safe) for NEW winners. */
(function () {
  // Feature toggles via localStorage (for tests)
  const confettiEnabled = localStorage.getItem('confettiEnabled') !== 'false';
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

  // Keep track of rows we've already celebrated
  const celebrated = new Set();

  // --- Audio setup (uses #win-sfx, creates one if missing) ---
  let audioEl = document.getElementById('win-sfx');
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'win-sfx';
    audioEl.src = './win.mp3';
    audioEl.preload = 'auto';
    audioEl.setAttribute('playsinline', '');
    document.body.appendChild(audioEl);
  }
  // reasonable default volume, user can change via localStorage
  audioEl.volume = Number(localStorage.getItem('winVolume') ?? 0.8);

  // WebAudio tiny fallback chime (if mp3 play() is blocked/fails)
  let audioCtx = null;
  function fallbackChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 1244.5; // D#6
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.22);
    } catch {}
  }

  // Autoplay primer: after first user interaction, browsers allow play()
  function primeOnce() {
    // try to unlock media
    audioEl.play().then(() => {
      audioEl.pause(); audioEl.currentTime = 0;
    }).catch(() => {/* ignore */});

    // prepare WebAudio too (for fallback)
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !audioCtx) audioCtx = new Ctx();
    } catch {}

    window.removeEventListener('pointerdown', primeOnce, true);
    window.removeEventListener('keydown', primeOnce, true);
    window.removeEventListener('touchstart', primeOnce, true);
  }
  window.addEventListener('pointerdown', primeOnce, true);
  window.addEventListener('keydown', primeOnce, true);
  window.addEventListener('touchstart', primeOnce, true);

  // Play cheer with robust fallback + one-click retry if autoplay blocked
  function playWinSound() {
    if (!soundEnabled || !audioEl) return;
    try {
      audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // Wait for one user click then play
          const once = () => { audioEl.play().catch(fallbackChime); };
          document.body.addEventListener('click', once, { once: true });
          console.log('🔈 Autoplay blocked—will play after next click.');
        });
      }
    } catch {
      fallbackChime();
    }
  }

  // Simple color→hex for confetti palette
  const colorHexMap = {
    Red: '#e74c3c', Blue: '#3498db', Green: '#27ae60', Yellow: '#f39c12',
    Purple: '#9b59b6', Orange: '#e67e22', Pink: '#e91e63', Brown: '#795548',
    Black: '#2c3e50', Gray: '#7f8c8d', Teal: '#009688', Navy: '#34495e'
  };

  function celebrateOnce(key, colorName) {
    if (celebrated.has(key)) return;
    celebrated.add(key);

    // Confetti
    if (confettiEnabled && typeof window.confetti === 'function') {
      const c = colorHexMap[colorName] || '#22d3ee';
      const colors = [c, '#ffffff'];
      window.confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
      window.confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
      window.confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }

    // Sound
    playWinSound();
  }

  // Wrap existing addCalledTicket so your core logic stays untouched
  const originalAdd = window.addCalledTicket;
  if (typeof originalAdd !== 'function') {
    console.warn('[win-effects] addCalledTicket not found; effects idle.');
    return;
  }

  window.addCalledTicket = function () {
    // Call original logic
    originalAdd.apply(this, arguments);

    // After DOM renders the new row, detect and celebrate if winner
    setTimeout(() => {
      const first = document.querySelector('.called-tickets .ticket-item');
      if (!first || !first.classList.contains('winner')) return;

      const numText = first.querySelector('.ticket-number')?.textContent?.trim() || '';
      const colorText = first.querySelector('.ticket-color')?.textContent?.trim() || '';
      const key = `${colorText}::${numText}`;
      celebrateOnce(key, colorText);
    }, 60);
  };

  // Also handle page visibility—if the row appeared while tab hidden,
  // celebrate when the tab becomes visible (prevents missing the cheer)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const first = document.querySelector('.called-tickets .ticket-item');
    if (!first || !first.classList.contains('winner')) return;
    const numText = first.querySelector('.ticket-number')?.textContent?.trim() || '';
    const colorText = first.querySelector('.ticket-color')?.textContent?.trim() || '';
    const key = `${colorText}::${numText}`;
    if (!celebrated.has(key)) celebrateOnce(key, colorText);
  });
})();
