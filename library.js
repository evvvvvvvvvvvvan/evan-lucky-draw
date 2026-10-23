(() => {
  "use strict";
  function validFiles(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      if (!item || typeof item.id !== "string" || typeof item.url !== "string") return false;
      try {
        const url = new URL(item.url, document.baseURI);
        return url.origin === location.origin && ["http:", "https:"].includes(url.protocol);
      } catch { return false; }
    });
  }
  window.PHOTO_LIBRARY = {
    load: async () => {
      const response = await fetch("photos.json", { cache: "no-store" });
      if (!response.ok) throw new Error("无法读取素材清单");
      const manifest = await response.json();
      return { photos: validFiles(manifest.photos), sounds: validFiles(manifest.sounds), cover: validFiles([manifest.cover])[0] || null };
    }
  };
})();

