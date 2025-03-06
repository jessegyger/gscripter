console.log('[AICodeBridge BG] Background script loaded at:', new Date().toISOString());

let settings = {
  grokMessaging: true,
  claudeMessaging: true,
  chatgptMessaging: true,
  geminiMessaging: true,
  grokPing: 2000,
  claudePing: 2000,
  chatgptPing: 2000,
  geminiPing: 2000,
  targetUrls: "file:///*/index.html\nhttps://gygertech.com/gscripter/*"
};

function loadSettings() {
  chrome.storage.sync.get({
    grokMessaging: true,
    claudeMessaging: true,
    chatgptMessaging: true,
    geminiMessaging: true,
    grokPing: 2000,
    claudePing: 2000,
    chatgptPing: 2000,
    geminiPing: 2000,
    targetUrls: "file:///*/index.html\nhttps://gygertech.com/gscripter/*"
  }, (loadedSettings) => {
    settings = loadedSettings;
    updatePings();
  });
}

let grokPingInterval, claudePingInterval, chatgptPingInterval, geminiPingInterval;
function updatePings() {
  if (grokPingInterval) clearInterval(grokPingInterval);
  if (claudePingInterval) clearInterval(claudePingInterval);
  if (chatgptPingInterval) clearInterval(chatgptPingInterval);
  if (geminiPingInterval) clearInterval(geminiPingInterval);

  const targetPatterns = settings.targetUrls.trim()
    .split('\n')
    .map(url => url.trim())
    .filter(url => url);

  if (settings.grokMessaging) {
    grokPingInterval = setInterval(() => {
      chrome.tabs.query({ url: ["https://x.com/i/grok*", "https://grok.com/*"] }, (grokTabs) => {
        if (grokTabs.length > 0) {
          chrome.tabs.query({ url: targetPatterns }, (indexTabs) => {
            indexTabs.forEach(tab => {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.postMessage({ type: 'grokPing' }, '*')
              }).catch(() => {});
            });
          });
        }
      });
    }, settings.grokPing);
  }

  if (settings.claudeMessaging) {
    claudePingInterval = setInterval(() => {
      chrome.tabs.query({ url: "https://claude.ai/*" }, (claudeTabs) => {
        if (claudeTabs.length > 0) {
          chrome.tabs.query({ url: targetPatterns }, (indexTabs) => {
            indexTabs.forEach(tab => {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.postMessage({ type: 'claudePing' }, '*')
              }).catch(() => {});
            });
          });
        }
      });
    }, settings.claudePing);
  }

  if (settings.chatgptMessaging) {
    chatgptPingInterval = setInterval(() => {
      chrome.tabs.query({ url: "https://chatgpt.com/*" }, (chatgptTabs) => {
        if (chatgptTabs.length > 0) {
          chrome.tabs.query({ url: targetPatterns }, (indexTabs) => {
            indexTabs.forEach(tab => {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.postMessage({ type: 'chatgptPing' }, '*')
              }).catch(() => {});
            });
          });
        }
      });
    }, settings.chatgptPing);
  }

  if (settings.geminiMessaging) {
    geminiPingInterval = setInterval(() => {
      chrome.tabs.query({ url: "https://gemini.google.com/*" }, (geminiTabs) => {
        if (geminiTabs.length > 0) {
          chrome.tabs.query({ url: targetPatterns }, (indexTabs) => {
            indexTabs.forEach(tab => {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.postMessage({ type: 'geminiPing' }, '*')
              }).catch(() => {});
            });
          });
        }
      });
    }, settings.geminiPing);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const now = performance.now();
  const targetPatterns = settings.targetUrls.trim()
    .split('\n')
    .map(url => url.trim())
    .filter(url => url);

  if (request.action === "sendMessageToIndex" && !request.source && settings.grokMessaging) {
    chrome.tabs.query({ url: targetPatterns }, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message, language) => {
            window.postMessage({
              type: "grokMessage",
              message: message,
              language: language
            }, "*");
          },
          args: [request.message, request.language]
        }).catch(() => {});
      });
      console.log(`[AICodeBridge BG] Processed grok message at ${now}ms`);
    });
  }

  if (request.action === "sendMessageToIndex" && request.source === 'claude' && settings.claudeMessaging) {
    chrome.tabs.query({ url: targetPatterns }, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message, language) => {
            window.postMessage({
              type: "claudeMessage",
              message: message,
              language: language
            }, "*");
          },
          args: [request.message, request.language]
        }).catch(() => {});
      });
      console.log(`[AICodeBridge BG] Processed claude message at ${now}ms`);
    });
  }

  if (request.action === "sendMessageToIndex" && request.source === 'chatgpt' && settings.chatgptMessaging) {
    chrome.tabs.query({ url: targetPatterns }, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message, language) => {
            window.postMessage({
              type: "chatgptMessage",
              message: message,
              language: language
            }, "*");
          },
          args: [request.message, request.language]
        }).catch(() => {});
      });
      console.log(`[AICodeBridge BG] Processed chatgpt message at ${now}ms`);
    });
  }

  if (request.action === "sendMessageToIndex" && request.source === 'gemini' && settings.geminiMessaging) {
    chrome.tabs.query({ url: targetPatterns }, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message, language) => {
            window.postMessage({
              type: "geminiMessage",
              message: message,
              language: language
            }, "*");
          },
          args: [request.message, request.language]
        }).catch(() => {});
      });
      console.log(`[AICodeBridge BG] Processed gemini message at ${now}ms`);
    });
  }

  if (request.action === "openGrokTabInBackground") {
    chrome.tabs.create({ 
      url: request.url,
      active: false
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "openClaudeTabInBackground") {
    chrome.tabs.create({ 
      url: request.url,
      active: false
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "openChatgptTabInBackground") {
    chrome.tabs.create({ 
      url: request.url,
      active: false
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "openGeminiTabInBackground") {
    chrome.tabs.create({ 
      url: request.url,
      active: false
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "updateSettings") {
    loadSettings();
  }

  if (request.action === "scanTabsForCode") {
    const source = request.source || 'grok'; // Default to grok if no source specified
    let urlPatterns;
    switch (source) {
      case 'claude':
        urlPatterns = ["https://claude.ai/*"];
        break;
      case 'chatgpt':
        urlPatterns = ["https://chatgpt.com/*"];
        break;
      case 'gemini':
        urlPatterns = ["https://gemini.google.com/*"];
        break;
      default:
        urlPatterns = ["https://x.com/i/grok*", "https://x.com/*grok*", "https://grok.com/*"];
    }

    chrome.tabs.query({ url: urlPatterns }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: `No matching ${source} tabs found` });
        return;
      }

      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.postMessage({ type: "scanForCodeBlocks" }, "*");
          }
        }).catch(err => {
          console.error(`[AICodeBridge BG] Error scanning tab ${tab.id}:`, err);
        });
      });

      sendResponse({ success: true });
    });
    return true;
  }
});

loadSettings();