chrome.runtime.onInstalled.addListener(applyRules);
chrome.runtime.onStartup.addListener(applyRules);
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "updateRules") applyRules();
});

// Helper function to turn a domain string into a unique integer ID
function generateRuleId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash) + 1000; // Add 1000 to avoid conflicts with 1-7
}

async function applyRules() {
  const siteRules = {
    tiktok:    { id: 1, filter: "tiktok.com" },
    instagram: { id: 2, filter: "instagram.com" },
    x:         { id: 3, filter: "x.com" },
    twitter:   { id: 7, filter: "twitter.com" },
    snapchat:  { id: 4, filter: "snapchat.com" },
    twitch:    { id: 5, filter: "twitch.tv" },
    youtube:   { id: 6, filter: "youtube.com"}
  };

  const prefs = await chrome.storage.sync.get(null);
  const customSites = prefs.customSites || [];
  const rulesToAdd = [];

  // 1. Process Default Sites
  Object.keys(siteRules).forEach(key => {
    if (prefs[key]) {
      if (key === 'x') {
        rulesToAdd.push({ id: siteRules.x.id, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } }, condition: { urlFilter: siteRules.x.filter, resourceTypes: ["main_frame"] } });
        rulesToAdd.push({ id: siteRules.twitter.id, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } }, condition: { urlFilter: siteRules.twitter.filter, resourceTypes: ["main_frame"] } });
      } else if (key !== 'twitter') {
        rulesToAdd.push({ id: siteRules[key].id, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } }, condition: { urlFilter: siteRules[key].filter, resourceTypes: ["main_frame"] } });
      }
    }
  });

  // 2. Process Custom Sites
  customSites.forEach(domain => {
    if (prefs[domain]) {
      rulesToAdd.push({
        id: generateRuleId(domain),
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked_page.html" } },
        condition: { urlFilter: domain, resourceTypes: ["main_frame"] }
      });
    }
  });

  // 3. Clear ALL old rules, then apply the new ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const allRuleIds = existingRules.map(rule => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds,
    addRules: rulesToAdd
  });
}

// --- ANALYTICS: TRACK ATTEMPTS ---
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; 

  const url = new URL(details.url);
  const prefs = await chrome.storage.sync.get(null);
  
  const defaultSites = ["tiktok", "instagram", "x", "twitter", "snapchat", "twitch", "youtube"];
  const customSites = prefs.customSites || [];
  const allSitesToCheck = [...defaultSites, ...customSites];

  // Find if the current URL matches ANY of our sites (default or custom)
  let matchedSite = allSitesToCheck.find(site => url.hostname.includes(site));

  if (matchedSite && prefs[matchedSite]) {
    const dateKey = `analytics_${getTodayDate()}`;
    const localData = await chrome.storage.local.get(dateKey);
    
    let todayData = localData[dateKey] || {};
    if (!todayData[matchedSite]) todayData[matchedSite] = { attempts: 0 };
    
    todayData[matchedSite].attempts += 1;
    await chrome.storage.local.set({ [dateKey]: todayData });
  }
});