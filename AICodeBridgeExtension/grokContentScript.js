console.log('[GrokExt CS] Content script injected at:', new Date().toISOString());

let lastMessages = new Map();
let observer = null;
let lastSendTime = 0;

function setupObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    checkForChanges();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function checkForChanges() {
  const now = performance.now();
  const isXDomain = window.location.hostname === 'x.com';
  const isGrokDomain = window.location.hostname === 'grok.com';
  let codeBlocks = [];

  if (isXDomain) {
    codeBlocks = document.querySelectorAll('div[data-testid="markdown-code-block"]');
    for (let block of codeBlocks) {
      const blockId = block;
      const codeElement = block.querySelector('code');
      if (!codeElement) continue;

      const languageClass = codeElement.className;
      const language = languageClass.match(/language-(\w+)/)?.[1] || 'text';
      const code = codeElement.textContent.trim();

      if (!lastMessages.has(blockId) || lastMessages.get(blockId) !== code) {
        lastMessages.set(blockId, code);
        chrome.runtime.sendMessage({
          action: "sendMessageToIndex",
          message: code,
          language: language
        });
        console.log(`[GrokExt CS] Sent message at ${now}ms, delta: ${now - lastSendTime}ms`);
        lastSendTime = now;
      }
    }
  }

  if (isGrokDomain) {
    codeBlocks = document.querySelectorAll('div[style*="background: rgb(18, 19, 20)"] > code');
    for (let codeElement of codeBlocks) {
      const blockId = codeElement.parentElement;
      const code = codeElement.textContent.trim();
      const language = getLanguageForGrokCodeBlock(codeElement);

      if (!lastMessages.has(blockId) || lastMessages.get(blockId) !== code) {
        lastMessages.set(blockId, code);
        chrome.runtime.sendMessage({
          action: "sendMessageToIndex",
          message: code,
          language: language
        });
        console.log(`[GrokExt CS] Sent message at ${now}ms, delta: ${now - lastSendTime}ms`);
        lastSendTime = now;
      }
    }
  }
}

function getLanguageForGrokCodeBlock(codeElement) {
  const header = codeElement.closest('div.relative')?.previousElementSibling;
  if (header && header.classList.contains('flex')) {
    const langSpan = header.querySelector('span.font-mono.text-xs');
    return langSpan ? langSpan.textContent.trim() : 'text';
  }
  return 'text';
}

function scanAllCodeBlocks() {
  const isXDomain = window.location.hostname === 'x.com';
  const isGrokDomain = window.location.hostname === 'grok.com';
  let codeBlocks = [];

  if (isXDomain) {
    codeBlocks = document.querySelectorAll('div[data-testid="markdown-code-block"]');
    for (let block of codeBlocks) {
      const codeElement = block.querySelector('code');
      if (!codeElement) continue;

      const languageClass = codeElement.className;
      const language = languageClass.match(/language-(\w+)/)?.[1] || 'text';
      const code = codeElement.textContent.trim();

      chrome.runtime.sendMessage({
        action: "sendMessageToIndex",
        message: code,
        language: language
      });
      console.log(`[GrokExt CS] Manually sent code block:`, code.slice(0, 50) + '...');
    }
  }

  if (isGrokDomain) {
    codeBlocks = document.querySelectorAll('div[style*="background: rgb(18, 19, 20)"] > code');
    for (let codeElement of codeBlocks) {
      const code = codeElement.textContent.trim();
      const language = getLanguageForGrokCodeBlock(codeElement);

      chrome.runtime.sendMessage({
        action: "sendMessageToIndex",
        message: code,
        language: language
      });
      console.log(`[GrokExt CS] Manually sent code block:`, code.slice(0, 50) + '...');
    }
  }
}

window.addEventListener('message', (event) => {
  if (event.data.type === "scanForCodeBlocks") {
    scanAllCodeBlocks();
  }
});

setupObserver();
checkForChanges();

window.addEventListener('unload', () => {
  if (observer) observer.disconnect();
});