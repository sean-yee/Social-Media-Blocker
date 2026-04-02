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

// --- NEW LOCAL STORAGE CODE (ANALYTICS) ---
  const statsDiv = document.getElementById("stats");
  
  // Create today's date key (e.g., "analytics_2026-04-01")
  const todayDate = new Date().toISOString().split('T')[0];
  const todayKey = `analytics_${todayDate}`;

  // Fetch the data structure from local storage
  chrome.storage.local.get(todayKey, (data) => {
    const todayData = data[todayKey];
    
    if (!todayData || Object.keys(todayData).length === 0) {
      statsDiv.innerHTML = "<p>No data recorded for today yet!</p>";
      return;
    }

    // Build the HTML list dynamically based on the stored data structure
    let html = "<h3>Today's Focus Stats</h3><ul>";
    for (const [site, stats] of Object.entries(todayData)) {
      const minutes = Math.floor(stats.timeSpent / 60000); 
      html += `<li><b>${site.charAt(0).toUpperCase() + site.slice(1)}</b>: <br> 
               ${stats.attempts} blocked attempts <br> 
               ${minutes} mins spent scrolling</li><br>`;
    }
    html += "</ul>";
    statsDiv.innerHTML = html;
  });
});