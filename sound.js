(() => {
  "use strict";
  const toggle = document.querySelector("#soundToggle");
  const player = new Audio();
  player.preload = "none";
  player.volume = 0.65;
  const voices = new Set();
  let enabled = false;
  let library = [];
  let lastSound = "";
  let context;
  let generation = 0;
  try { localStorage.setItem("pig-sound-enabled", "false"); } catch { /* Default to muted when preferences are unavailable. */ }

  function updateToggle() {
    toggle.classList.toggle("is-muted", !enabled);
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("aria-label", enabled ? "关闭音效" : "开启音效");
    toggle.title = enabled ? "关闭音效" : "开启音效";
  }

  function stop() {
    generation++;
    player.pause();
    try { player.currentTime = 0; } catch { /* No media may be loaded yet. */ }
    voices.forEach(voice => { try { voice.oscillator.stop(); } catch { /* Already finished. */ } });
    voices.clear();
  }

  function unlockContext() {
    try {
      const AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!context && AudioContextType) context = new AudioContextType();
      if (context && context.state === "suspended") context.resume().catch(() => {});
      return context;
    } catch { return null; }
  }

  function chime() {
    if (!enabled) return;
    const audioContext = unlockContext();
    if (!audioContext) return;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.055, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      const voice = { oscillator: oscillator, gain: gain };
      voices.add(voice);
      oscillator.onended = () => {
        voices.delete(voice);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  }

  function play() {
    stop();
    if (!enabled) return;
    const turn = generation;
    // Unlock during the actual button click, before any network or image awaits.
    unlockContext();
    if (!library.length) {
      try { chime(); } catch { /* Sound must never block the photo. */ }
      return;
    }
    let candidates = library;
    if (library.length > 1) candidates = library.filter(item => item.id !== lastSound);
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    lastSound = item.id;
    player.src = item.url;
    const fallback = () => {
      if (turn === generation && enabled) {
        try { chime(); } catch { /* Sound must never block the photo. */ }
      }
    };
    try {
      const playback = player.play();
      if (playback && playback.catch) playback.catch(fallback);
    } catch { fallback(); }
  }

  toggle.addEventListener("click", () => {
    enabled = !enabled;
    stop();
    updateToggle();
    try { localStorage.setItem("pig-sound-enabled", String(enabled)); } catch { /* Preference is optional. */ }
  });
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.PIG_SOUND = {
    setLibrary: items => { library = Array.isArray(items) ? items : []; },
    play: play,
    stop: stop
  };
  updateToggle();
})();

