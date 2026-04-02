document.addEventListener("DOMContentLoaded", () => {
  const defaultSites = ["tiktok", "instagram", "x", "twitter", "snapchat", "twitch", "youtube"];
  const customSitesList = document.getElementById("custom-sites-list");
  const addSiteBtn = document.getElementById("add-site-btn");
  const newSiteInput = document.getElementById("new-site-input");

  // 1. Load everything from storage
  chrome.storage.sync.get(null, (data) => {
    // Handle default sites
    defaultSites.forEach(site => {
      const box = document.getElementById(site);
      if (box) box.checked = data[site] || false;
    });

    // Handle custom sites array (default to empty array if none exist)
    const customSites = data.customSites || [];
    customSites.forEach(site => renderCustomSite(site, data[site]));
  });

  // 2. Listen for clicks on the default checkboxes
  defaultSites.forEach(site => {
    const box = document.getElementById(site);
    if (box) {
      box.addEventListener("change", e => {
        chrome.storage.sync.set({ [site]: e.target.checked });
        chrome.runtime.sendMessage({ type: "updateRules" });
      });
    }
  });

  // 3. Logic to render a custom site checkbox dynamically
  function renderCustomSite(domain, isChecked) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    
    checkbox.type = "checkbox";
    checkbox.checked = isChecked || false;
    
    // Listen for changes on the new custom checkbox
    checkbox.addEventListener("change", (e) => {
      chrome.storage.sync.set({ [domain]: e.target.checked });
      chrome.runtime.sendMessage({ type: "updateRules" });
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + domain));
    customSitesList.appendChild(label);
  }

  // 4. Handle adding a new site
  addSiteBtn.addEventListener("click", () => {
    let domain = newSiteInput.value.trim().toLowerCase();
    
    // Basic validation to strip out "https://" or "www."
    domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    if (!domain || defaultSites.includes(domain)) return; // Don't add if empty or already a default

    chrome.storage.sync.get(["customSites"], (data) => {
      const customSites = data.customSites || [];
      if (!customSites.includes(domain)) {
        customSites.push(domain);
        
        // Save the new list, set it to checked by default, and update UI
        chrome.storage.sync.set({ 
          customSites: customSites,
          [domain]: true 
        }, () => {
          renderCustomSite(domain, true);
          newSiteInput.value = "";
          chrome.runtime.sendMessage({ type: "updateRules" });
        });
      }
    });
  });

  // 5. ANALYTICS: Load local storage stats (No changes needed here!)
  const statsDiv = document.getElementById("stats");
  const todayKey = `analytics_${new Date().toISOString().split('T')[0]}`;

  chrome.storage.local.get(todayKey, (data) => {
    const todayData = data[todayKey];
    if (!todayData || Object.keys(todayData).length === 0) {
      statsDiv.innerHTML = "<p>No data recorded for today yet!</p>";
      return;
    }

    let html = "<h3>Today's Focus Stats</h3><ul>";
    for (const [site, stats] of Object.entries(todayData)) {
      html += `<li><b>${site}</b>: ${stats.attempts} blocked attempts</li>`;
    }
    html += "</ul>";
    statsDiv.innerHTML = html;
  });
});