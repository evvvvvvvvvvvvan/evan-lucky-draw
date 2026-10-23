(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const samples = [1, 2, 3].map(n => ({ id: "demo-" + n, url: "assets/demo-" + n + ".svg" }));
  const state = { pool: [], signature: "", currentId: "", coverSignature: null, busy: false };
  const seen = new Set();

  function announce(message, error) {
    $("#drawStatus").textContent = message;
    $("#drawStatus").className = error ? "error-message" : "sr-only";
  }

  function resetDraw() {
    state.currentId = "";
    seen.clear();
    $("#drawImage").removeAttribute("src");
    $("#result").hidden = true;
    $("#readyCard").hidden = false;
    $("#drawButtonText").textContent = "领取一只小猪";
    $("#drawButton").disabled = false;
    announce("ready");
  }

  async function loadPool() {
    let library = { photos: [], sounds: [], cover: null };
    try { library = await PHOTO_LIBRARY.load(); } catch { /* The local prototype can use sample images and a soft chime. */ }
    PIG_SOUND.setLibrary(library.sounds);
    updateCover(library.cover);
    const photos = library.photos;
    const pool = photos.length ? photos : samples;
    const signature = pool.map(item => item.id).join(",");
    if (signature === state.signature) return;
    if (state.busy) { setTimeout(loadPool, 350); return; }
    state.pool = pool;
    state.signature = signature;
    resetDraw();
  }

  function updateCover(cover) {
    const key = cover ? cover.id + "|" + cover.url : "";
    if (key === state.coverSignature) return;
    state.coverSignature = key;
    const image = $("#coverImage");
    const placeholder = $("#coverPlaceholder");
    image.hidden = true;
    placeholder.hidden = false;
    if (!cover) { image.removeAttribute("src"); return; }
    image.onload = () => {
      if (state.coverSignature !== key) return;
      image.hidden = false;
      placeholder.hidden = true;
    };
    image.onerror = () => {
      if (state.coverSignature !== key) return;
      image.hidden = true;
      placeholder.hidden = false;
    };
    image.src = cover.url;
  }

  async function draw() {
    if (state.busy || !state.pool.length) return;
    state.busy = true;
    PIG_SOUND.play();
    $("#drawButton").disabled = true;
    $("#drawButtonText").textContent = "小猪准备中";
    $("#drawSurface").classList.add("is-drawing");
    $("#drawSurface").setAttribute("aria-busy", "true");
    announce("正在挑选一只小猪");

    let candidates = state.pool.filter(item => !seen.has(item.id));
    if (!candidates.length) {
      seen.clear();
      candidates = state.pool.slice();
    }
    if (candidates.length > 1) candidates = candidates.filter(item => item.id !== state.currentId);
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const url = item.url;

    try {
      const image = new Image();
      image.src = url;
      await Promise.all([image.decode(), new Promise(resolve => setTimeout(resolve, 280))]);
      $("#drawImage").src = url;
      $("#readyCard").hidden = true;
      $("#result").hidden = false;
      state.currentId = item.id;
      seen.add(item.id);
      announce("小猪准备中");
    } catch {
      seen.add(item.id);
      announce("小猪丢失TT", true);
    } finally {
      state.busy = false;
      $("#drawButton").disabled = false;
      $("#drawButtonText").textContent = state.currentId ? "再领一只" : "领取一只";
      $("#drawSurface").classList.remove("is-drawing");
      $("#drawSurface").setAttribute("aria-busy", "false");
    }
  }

  $("#drawButton").addEventListener("click", draw);
  window.addEventListener("focus", loadPool);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadPool(); });
  loadPool();
})();

