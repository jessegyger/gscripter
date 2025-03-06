// claudeContentScript.js

let claudeLastMessages = new Map();
let lastSendTime = 0;
let observer = null;

function setupObserver() {
  if (observer) observer.disconnect();
  
  observer = new MutationObserver(() => {
    checkClaudeChanges();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function checkClaudeChanges() {
  const codeBlocks = document.querySelectorAll('.prismjs.code-block__code code');
  processCodeBlocks(codeBlocks);
}

function processCodeBlocks(blocks) {
  const now = performance.now();
  blocks.forEach((block, index) => {
    // Use the DOM element itself as the blockId, similar to Grok implementation
    const blockId = block;
    
    const languageClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
    const language = languageClass ? languageClass.replace('language-', '') : 'text';
    
    let code = block.textContent.trim();
    
    if (!claudeLastMessages.has(blockId) || claudeLastMessages.get(blockId) !== code) {
      claudeLastMessages.set(blockId, code);
      chrome.runtime.sendMessage({
        action: "sendMessageToIndex",
        message: code,
        language: language,
        source: 'claude'
      });
      console.log(`[Claude CS] Sent message at ${now}ms, delta: ${now - lastSendTime}ms`);
      lastSendTime = now;
    }
  });
}

function scanAllCodeBlocks() {
  console.log('[Claude CS] Manually scanning all code blocks');
  const codeBlocks = document.querySelectorAll('.prismjs.code-block__code code');
  
  // Reset the map to ensure all code blocks are sent regardless of prior state
  claudeLastMessages.clear();
  
  processCodeBlocks(codeBlocks);
}

// Listen for scanForCodeBlocks message
window.addEventListener('message', (event) => {
  if (event.data.type === "scanForCodeBlocks") {
    scanAllCodeBlocks();
  }
});

// Initial setup
setupObserver();
checkClaudeChanges();

// Cleanup on page unload
window.addEventListener('unload', () => {
  if (observer) observer.disconnect();
});