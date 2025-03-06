function updateSwitchStates() {
  chrome.storage.sync.get({
    grokMessaging: true,
    claudeMessaging: true,
    chatgptMessaging: true,
    geminiMessaging: true
  }, (settings) => {
    document.getElementById('grokSwitch').checked = settings.grokMessaging;
    document.getElementById('claudeSwitch').checked = settings.claudeMessaging;
    document.getElementById('chatgptSwitch').checked = settings.chatgptMessaging;
    document.getElementById('geminiSwitch').checked = settings.geminiMessaging;
    document.getElementById('allSwitch').checked = settings.grokMessaging && settings.claudeMessaging && settings.chatgptMessaging && settings.geminiMessaging;
  });
}

document.getElementById('grokSwitch').addEventListener('change', (e) => {
  const newState = e.target.checked;
  chrome.storage.sync.set({ grokMessaging: newState }, () => {
    chrome.runtime.sendMessage({ action: "updateSettings" });
    updateSwitchStates();
  });
});

document.getElementById('claudeSwitch').addEventListener('change', (e) => {
  const newState = e.target.checked;
  chrome.storage.sync.set({ claudeMessaging: newState }, () => {
    chrome.runtime.sendMessage({ action: "updateSettings" });
    updateSwitchStates();
  });
});

document.getElementById('chatgptSwitch').addEventListener('change', (e) => {
  const newState = e.target.checked;
  chrome.storage.sync.set({ chatgptMessaging: newState }, () => {
    chrome.runtime.sendMessage({ action: "updateSettings" });
    updateSwitchStates();
  });
});

document.getElementById('geminiSwitch').addEventListener('change', (e) => {
  const newState = e.target.checked;
  chrome.storage.sync.set({ geminiMessaging: newState }, () => {
    chrome.runtime.sendMessage({ action: "updateSettings" });
    updateSwitchStates();
  });
});

document.getElementById('allSwitch').addEventListener('change', (e) => {
  const newState = e.target.checked;
  chrome.storage.sync.set({
    grokMessaging: newState,
    claudeMessaging: newState,
    chatgptMessaging: newState,
    geminiMessaging: newState
  }, () => {
    chrome.runtime.sendMessage({ action: "updateSettings" });
    updateSwitchStates();
  });
});

document.getElementById('settingsCog').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initial update
updateSwitchStates();