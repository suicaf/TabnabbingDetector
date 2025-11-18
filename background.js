let captureIntervalId = null;
const CAPTURE_INTERVAL_MS = 1500; // 1.5 seconds

const OVERLAY_CSS = `
  .tabnab-overlay-box {
    background: rgba(255, 0, 0, 0.3);
    box-sizing: border-box;
  }
`;

async function injectCSS(tabId) {
  try {
    await chrome.scripting.removeCSS({
      target: { tabId: tabId },
      css: OVERLAY_CSS
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      css: OVERLAY_CSS
    });
  } catch (e) {
    console.error("Failed to inject CSS:", e);
  }
}

// Wait for offscreen page
async function hasOffscreenPage() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  return contexts.find(context => context.documentUrl.endsWith('offscreen.html'));
}

// make offscreen page if it doesnt exist
async function setupOffscreenPage() {
  if (await hasOffscreenPage()) {
    console.log('Offscreen page exists');
  } else {
    console.log('Creating offscreen page');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Image comparison requires document access to run resemble.js',
    });
  }
}

setupOffscreenPage();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getDiff(imageUrl1, imageUrl2, tabId) {
    await setupOffscreenPage();

    console.log(`[${tabId}] Sending images for comparison`);
    chrome.runtime.sendMessage({
        type: 'compareImages',
        imageUrl1: imageUrl1,
        imageUrl2: imageUrl2,
        tabId: tabId
    });
}

// Get image comparison results
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'compareResult') {
    const { changedBoxes, tabId } = message;
    console.log(`[${tabId}] Comparison found`, changedBoxes.length, "regions that changed");

    if (changedBoxes.length > 0) {
      console.log('Regions do NOT match! Tabnabbing detected!');
      chrome.action.setBadgeText({ text: '!', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });

      await injectCSS(tabId);

      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      await sleep(100);

      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_WARNING',
        changedBoxes: changedBoxes
      });

    } else {
      console.log('Images do match. Tab is deemed safe');
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});

function getTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(tab);
        });
    });
}

async function continuousCapture(tabId, windowId, tabUrl) {
    const tab = getTab(tabId);
    
    if (!tabUrl || BLOCKED_URLS.some(url => tabUrl.startsWith(url))) {
        console.log("Tab is on a blocked page for screenshotting");
        return;
    }

    await sleep(250);

    try {
        // captureVisibleTab requires some form of <all_urls> permission to still remain a passive extension
        const newScreenshotUrl = await chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100});
        //console.log("New screenshot recorded:", newScreenshotUrl);
        
        const result = await chrome.storage.local.get(['tabScreenshots']);
        const tabScreenshots = result.tabScreenshots || {};
        
        tabScreenshots[tabId] = newScreenshotUrl;

        await chrome.storage.local.set({ tabScreenshots }, function() {
            console.log(`[${tabId}] Saved new screenshot`);
        });
    } catch (e) {
        if (e.message.includes("Tabs cannot be edited right now") || 
            e.message.includes("activeTab' permission is not in effect")) {
            
            console.warn("Capture skipped due to timing/state error. Retrying on next cycle.");
            return; 
        }
        if (e.message.includes("No tab with id")) {
             console.warn(`[${tabId}] Tab closed during capture`);
             if (captureIntervalId) clearInterval(captureIntervalId);
             captureIntervalId = null;
             return;
        }
        console.error("Unknown error during capture:", e);
    }
}

const BLOCKED_URLS = ["chrome://", "chrome-extension://", "about:", "devtools://devtools/"];

// Tab Changed
chrome.tabs.onActivated.addListener(async function(activeInfo) {
    console.log("Active tab:", activeInfo.tabId);
    
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }

    try {
        const tab = await getTab(activeInfo.tabId);

        if (!tab.url || BLOCKED_URLS.some(url => tab.url.startsWith(url))) {
            console.log("Tab is on a blocked page for screenshotting");
            return;
        }
    
        await sleep(250);
        const newScreenshotUrl = await chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100});

        const result = await chrome.storage.local.get(['tabScreenshots']);
        const tabScreenshots = result.tabScreenshots || {};
        const oldScreenshotUrl = tabScreenshots[activeInfo.tabId];

        if (oldScreenshotUrl) {
            console.log(`[${activeInfo.tabId}] Comparing to last screenshot`);
            getDiff(oldScreenshotUrl, newScreenshotUrl, activeInfo.tabId);
        } else {
            console.log(`[${activeInfo.tabId}] First activation. Storing new screenshot`);
        }

        tabScreenshots[activeInfo.tabId] = newScreenshotUrl;
        await chrome.storage.local.set({ tabScreenshots });

        captureIntervalId = setInterval(() => {
            continuousCapture(activeInfo.tabId, activeInfo.windowId, tab.url);
        }, 1500);
        
        console.log(`Started continuous capture interval for tab: ${activeInfo.tabId}`);

    } catch (e) {
        console.error("Error during tab activation setup:", e.message);
    }

    
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }
    
    const result = await chrome.storage.local.get(['tabScreenshots']);
    const tabScreenshots = result.tabScreenshots || {};

    if (tabScreenshots[tabId]) {
        delete tabScreenshots[tabId];
        await chrome.storage.local.set({ tabScreenshots });
        console.log(`Cleaned up screenshot for closed tab: ${tabId}`);
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    console.log(`[${tab.id}] Extension icon clicked. Clearing warnings.`);

    await chrome.action.setBadgeText({ text: '', tabId: tab.id });

    try {
        await chrome.scripting.removeCSS({
            target: { tabId: tab.id },
            css: OVERLAY_CSS 
        });
    } catch (e) {
        if (!e.message.includes("No CSS found")) {
            console.error("Failed to remove CSS:", e);
        }
    }
});

