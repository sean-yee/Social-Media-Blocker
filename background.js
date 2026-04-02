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

// --- NEW ANALYTICS & TIME TRACKING LOGIC ---

// state vars for time tracking
let activeSite = null;
let startTime = null;

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// 1. TRACK ATTEMPTS TO VISIT BLOCKED SITES
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; 

  const url = new URL(details.url);
  const prefs = await chrome.storage.sync.get(null);
  
  const sites = ["tiktok", "instagram", "x", "twitter", "snapchat", "twitch", "youtube"];
  let matchedSite = sites.find(site => url.hostname.includes(site));

  if (matchedSite && prefs[matchedSite]) {
    const dateKey = `analytics_${getTodayDate()}`;
    const localData = await chrome.storage.local.get(dateKey);
    
    // THIS IS WHERE THE DATA STRUCTURE IS INITIALIZED
    let todayData = localData[dateKey] || {};
    if (!todayData[matchedSite]) todayData[matchedSite] = { attempts: 0, timeSpent: 0 };
    
    todayData[matchedSite].attempts += 1;
    await chrome.storage.local.set({ [dateKey]: todayData });
  }
});

// 2. HELPER TO SAVE TIME WHEN LEAVING A SITE
async function flushTimeTracking() {
  if (activeSite && startTime) {
    const elapsedMs = Date.now() - startTime;
    const dateKey = `analytics_${getTodayDate()}`;
    const localData = await chrome.storage.local.get(dateKey);
    
    // THIS IS WHERE THE DATA STRUCTURE IS UPDATED
    let todayData = localData[dateKey] || {};
    if (!todayData[activeSite]) todayData[activeSite] = { attempts: 0, timeSpent: 0 };
    
    todayData[activeSite].timeSpent += elapsedMs;
    await chrome.storage.local.set({ [dateKey]: todayData });
  }
  activeSite = null;
  startTime = null;
}

// 3. TRACK ACTIVE TABS FOR UNBLOCKED SITES
async function handleTabChange(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url) return;

  const url = new URL(tab.url);
  const sites = ["tiktok", "instagram", "x", "twitter", "snapchat", "twitch", "youtube"];
  let matchedSite = sites.find(site => url.hostname.includes(site));
  
  const prefs = await chrome.storage.sync.get(null);

  if (matchedSite && !prefs[matchedSite]) {
    if (activeSite !== matchedSite) {
      await flushTimeTracking(); 
      activeSite = matchedSite;
      startTime = Date.now(); 
    }
  } else {
    await flushTimeTracking(); 
  }
}

// Listeners to trigger the time tracking
chrome.tabs.onActivated.addListener(activeInfo => handleTabChange(activeInfo.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) handleTabChange(tabId);
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await flushTimeTracking(); 
  } else {
    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tab) handleTabChange(tab.id);
  }
});