chrome.runtime.onInstalled.addListener(applyRules);
chrome.runtime.onStartup.addListener(applyRules);

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "updateRules") applyRules();
});

async function applyRules() {
  const siteRules = {
    tiktok:    { id: 1, filter: "tiktok.com" },
    instagram: { id: 2, filter: "instagram.com" },
    x:         { id: 3, filter: "x.com" },
    twitter:   { id: 7, filter: "twitter.com" }, // Needs a unique ID to avoid conflict with 'x'
    snapchat:  { id: 4, filter: "snapchat.com" },
    twitch:    { id: 5, filter: "twitch.tv" },
    youtube:   { id: 6, filter: "youtube.com"}
  };

  const prefs = await chrome.storage.sync.get(Object.keys(siteRules));

  // Collect all potential rule IDs to remove them first
  const allRuleIds = Object.values(siteRules).map(r => r.id);

  // Collect rules to add
  const rulesToAdd = [];

  Object.entries(prefs).forEach(([key, isEnabled]) => {
    if (isEnabled) {
      // Logic for x and twitter is handled separately because they share a UI checkbox but need separate rules.
      if (key === 'x') {
        // Add rule for x.com
        rulesToAdd.push({
          id: siteRules.x.id,
          priority: 1,
          action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } },
          condition: { urlFilter: siteRules.x.filter, resourceTypes: ["main_frame"] }
        });
        // Add rule for twitter.com (using the separate twitter ID)
        rulesToAdd.push({
          id: siteRules.twitter.id,
          priority: 1,
          action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } },
          condition: { urlFilter: siteRules.twitter.filter, resourceTypes: ["main_frame"] }
        });
      } else if (key !== 'twitter') { // Skip 'twitter' since it's covered by 'x' logic
        // Add rules for all other sites
        rulesToAdd.push({
          id: siteRules[key].id,
          priority: 1,
          action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } },
          condition: { urlFilter: siteRules[key].filter, resourceTypes: ["main_frame"] }
        });
      }
    }
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds,
    addRules: rulesToAdd
  });
}