chrome.runtime.onInstalled.addListener(applyRules);
chrome.runtime.onStartup.addListener(applyRules);

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "updateRules") applyRules();
});

async function applyRules() {
  const siteRules = {
    tiktok:    { id: 1, filter: "||tiktok.com/" },
    instagram: { id: 2, filter: "||instagram.com/" },
    x:         { id: 3, filter: "||x.com/" },
    snapchat:  { id: 4, filter: "||snapchat.com/" },
    twitch:    { id: 5, filter: "||twitch.tv/" },
    youtube:   { id: 6, filter: "||youtube.com/"}
  };

  const prefs = await chrome.storage.sync.get(Object.keys(siteRules));

  const enabledRules = Object.entries(prefs)
    .filter(([_, on]) => on)
    .map(([key]) => ({
      id: siteRules[key].id,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked_page.html" }
      },
      condition: {
        urlFilter: siteRules[key].filter,
        resourceTypes: ["main_frame"]
      }
    }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Object.values(siteRules).map(r => r.id),
    addRules: enabledRules
  });
}