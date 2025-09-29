document.addEventListener("DOMContentLoaded", () => {
  const sites = ["tiktok", "instagram", "x", "twitter", "snapchat", "twitch", "youtube"];

  // Load saved states safely
  chrome.storage.sync.get(sites, data => {
    sites.forEach(site => {
      const box = document.getElementById(site);
      if (box) {                        // ✅ only if element exists
        box.checked = data[site] || false;
      }
    });
  });

  // Listen for changes safely
  sites.forEach(site => {
    const box = document.getElementById(site);
    if (box) {                          // ✅ only if element exists
      box.addEventListener("change", e => {
        chrome.storage.sync.set({ [site]: e.target.checked });
        chrome.runtime.sendMessage({ type: "updateRules" });
      });
    }
  });
});