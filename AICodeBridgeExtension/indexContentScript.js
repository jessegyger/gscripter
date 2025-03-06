window.dispatchEvent(new CustomEvent('grokExtensionReady'));
window.dispatchEvent(new CustomEvent('claudeExtensionReady'));
window.dispatchEvent(new CustomEvent('chatgptExtensionReady'));
window.dispatchEvent(new CustomEvent('geminiExtensionReady'));
window.postMessage({ type: 'grokExtensionReady' }, '*');
window.postMessage({ type: 'claudeExtensionReady' }, '*');
window.postMessage({ type: 'chatgptExtensionReady' }, '*');
window.postMessage({ type: 'geminiExtensionReady' }, '*');

// Handle messages from index page
window.addEventListener('message', (event) => {
    if (event.origin !== "null" && event.origin !== "https://gygertech.com") return;
    
    if (event.data.type === 'openGrokTab') {
        chrome.runtime.sendMessage({
            action: "openGrokTabInBackground",
            url: event.data.url
        });
    } else if (event.data.type === 'openClaudeTab') {
        chrome.runtime.sendMessage({
            action: "openClaudeTabInBackground",
            url: event.data.url
        });
    } else if (event.data.type === 'openChatgptTab') {
        chrome.runtime.sendMessage({
            action: "openChatgptTabInBackground",
            url: event.data.url
        });
    } else if (event.data.type === 'openGeminiTab') {
        chrome.runtime.sendMessage({
            action: "openGeminiTabInBackground",
            url: event.data.url
        });
    } else if (event.data.type === 'refreshCodeBlocks') {
        // Determine which AI's code blocks to refresh based on the active tab
        const activeTabId = event.data.activeTab || 'grok'; // Default to grok if not specified
        
        chrome.runtime.sendMessage({
            action: "scanTabsForCode",
            source: activeTabId
        }, (response) => {
            if (response && response.success) {
                console.log(`[Index CS] Successfully triggered ${activeTabId} code block scan`);
            } else {
                console.error(`[Index CS] Failed to trigger ${activeTabId} scan:`, response?.error);
            }
        });
    }
});