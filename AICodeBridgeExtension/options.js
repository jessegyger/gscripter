const defaults = {
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
  chrome.storage.sync.get(defaults, (settings) => {
    document.getElementById('grokMessaging').checked = settings.grokMessaging;
    document.getElementById('claudeMessaging').checked = settings.claudeMessaging;
    document.getElementById('chatgptMessaging').checked = settings.chatgptMessaging;
    document.getElementById('geminiMessaging').checked = settings.geminiMessaging;
    document.getElementById('grokPing').value = settings.grokPing;
    document.getElementById('claudePing').value = settings.claudePing;
    document.getElementById('chatgptPing').value = settings.chatgptPing;
    document.getElementById('geminiPing').value = settings.geminiPing;
    document.getElementById('targetUrls').value = settings.targetUrls;
  });
}

function saveSettings() {
  const settings = {
    grokMessaging: document.getElementById('grokMessaging').checked,
    claudeMessaging: document.getElementById('claudeMessaging').checked,
    chatgptMessaging: document.getElementById('chatgptMessaging').checked,
    geminiMessaging: document.getElementById('geminiMessaging').checked,
    grokPing: parseInt(document.getElementById('grokPing').value),
    claudePing: parseInt(document.getElementById('claudePing').value),
    chatgptPing: parseInt(document.getElementById('chatgptPing').value),
    geminiPing: parseInt(document.getElementById('geminiPing').value),
    targetUrls: document.getElementById('targetUrls').value.trim()
  };
  
  chrome.storage.sync.set(settings, () => {
    alert('Settings saved!');
    chrome.runtime.sendMessage({ action: "updateSettings" });
  });
}

function resetSettings() {
  chrome.storage.sync.set(defaults, () => {
    loadSettings();
    alert('Settings reset to defaults!');
    chrome.runtime.sendMessage({ action: "updateSettings" });
  });
}

document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings);

// Load settings on page open
loadSettings();