// chatgptContentScript.js
console.log('[ChatGPTExt CS] Content script loaded for ChatGPT at:', new Date().toISOString());
// Send ready event immediately to signal this script has loaded
window.postMessage({ type: 'chatgptExtensionReady' }, '*');
console.log('[ChatGPTExt CS] Sent chatgptExtensionReady event');

// Global variables
let processedMessages = new Set();
let observer = null;
let popupObserver = null;

// Main function to extract and send code blocks
function findAndSendCodeBlocks() {
  // Standard inline code blocks
  const codeBlocks = document.querySelectorAll('pre code');
  processCodeBlocks(codeBlocks);
  
  // Check for popup/modal code blocks
  const popupCodeBlocks = document.querySelectorAll('.cm-content .cm-line');
  if (popupCodeBlocks.length > 0) {
    console.log(`[ChatGPTExt CS] Found ${popupCodeBlocks.length} potential popup code lines`);
    
    // Get the entire code from the popup
    let fullCode = '';
    popupCodeBlocks.forEach(line => {
      fullCode += line.textContent + '\n';
    });
    
    if (fullCode.trim().length > 5) {
      // Determine language from context
      let language = detectLanguageFromCodePopup() || 'text';
      
      // Create a simple hash to avoid duplicates
      const hash = fullCode.substring(0, 20) + fullCode.length;
      if (!processedMessages.has(hash)) {
        console.log(`[ChatGPTExt CS] Sending popup code block (${language}):`, fullCode.substring(0, 30) + '...');
        processedMessages.add(hash);
        
        chrome.runtime.sendMessage({
          action: "sendMessageToIndex",
          message: fullCode,
          language: language,
          source: 'chatgpt'
        });
      }
    }
  }
}

// Function to process standard code blocks
function processCodeBlocks(codeBlocks) {
  console.log(`[ChatGPTExt CS] Found ${codeBlocks.length} potential code blocks`);
  
  codeBlocks.forEach(codeBlock => {
    const code = codeBlock.textContent.trim();
    if (!code || code.length < 5) return;
    
    // Create a simple hash to avoid duplicates
    const hash = code.substring(0, 20) + code.length;
    if (processedMessages.has(hash)) return;
    
    // Determine language
    let language = 'text';
    if (codeBlock.className && codeBlock.className.includes('language-')) {
      language = codeBlock.className.split('language-')[1].split(' ')[0];
    }
    
    // Send to background
    console.log(`[ChatGPTExt CS] Sending code block (${language}):`, code.substring(0, 30) + '...');
    processedMessages.add(hash);
    
    chrome.runtime.sendMessage({
      action: "sendMessageToIndex",
      message: code,
      language: language,
      source: 'chatgpt'
    });
  });
}

// Function to try to detect language from popup context
function detectLanguageFromCodePopup() {
  // Look for code editor language hints
  const cmEditor = document.querySelector('.cm-editor');
  if (cmEditor && cmEditor.dataset && cmEditor.dataset.language) {
    return cmEditor.dataset.language;
  }
  
  // Look for language in the title
  const popupTitle = document.querySelector('[data-message-author-role="assistant"] .markdown .popover h2');
  if (popupTitle) {
    const titleText = popupTitle.textContent.toLowerCase();
    // Extract language from title like "Daily Inspiration"
    // For more complex scenarios, you could implement a mapping of common file names to languages
    if (titleText.includes('html')) return 'html';
    if (titleText.includes('css')) return 'css';
    if (titleText.includes('javascript') || titleText.includes('js')) return 'javascript';
    if (titleText.includes('python')) return 'python';
    // Add more languages as needed
  }
  
  // Try to guess from content
  const content = document.querySelector('.cm-content');
  if (content) {
    const text = content.textContent;
    if (text.includes('<!DOCTYPE html>') || (text.includes('<html') && text.includes('<body'))) 
      return 'html';
    if (text.includes('function') && text.includes('{') && text.includes('const '))
      return 'javascript';
    if (text.includes('import ') && text.includes('def ') && text.includes(':'))
      return 'python';
    // Add more heuristics as needed
  }
  
  return null;
}

// Handle ping messages
window.addEventListener('message', event => {
  console.log(`[ChatGPTExt CS] Received message event:`, event.data.type);
  
  if (event.data.type === 'chatgptPing' || event.data.type === 'scanForCodeBlocks') {
    console.log(`[ChatGPTExt CS] Processing ${event.data.type} message`);
    
    // Clear the processed messages set when receiving a scan request
    if (event.data.type === 'scanForCodeBlocks') {
      processedMessages.clear();
      console.log('[ChatGPTExt CS] Cleared processed messages cache for fresh scan');
    }
    
    findAndSendCodeBlocks();
    
    // Also send a ready event in response to pings
    window.postMessage({ type: 'chatgptExtensionReady' }, '*');
  }
});

// Set up mutation observers
function setupObservers() {
  // Main page observer
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    findAndSendCodeBlocks();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Look for popup/modal elements that might contain code
  const popupTargets = document.querySelectorAll('.relative.mb-3, [role="button"][id^="textdoc-message"]');
  popupTargets.forEach(target => {
    const newObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Check specifically for CodeMirror editor which ChatGPT uses in popup
          if (document.querySelector('.cm-editor')) {
            console.log('[ChatGPTExt CS] Detected code popup/modal');
            findAndSendCodeBlocks();
          }
        }
      }
    });
    
    newObserver.observe(target, {
      childList: true,
      attributes: true,
      subtree: true
    });
  });
}

// Initial setup
setTimeout(() => {
  setupObservers();
  findAndSendCodeBlocks();
  
  // Also watch for dynamically added code popup nodes
  const bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasPopup = addedNodes.some(node => 
          node.nodeType === 1 && 
          (node.querySelector('.cm-editor') || 
           node.classList?.contains('fixed') ||
           node.querySelector('[id^="textdoc-message"]'))
        );
        
        if (hasPopup) {
          console.log('[ChatGPTExt CS] Detected new popup/code window added to DOM');
          setTimeout(findAndSendCodeBlocks, 500); // Small delay to ensure content is loaded
          
          // Re-setup observers to catch the new popup
          setupObservers();
        }
      }
    }
  });
  
  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Send ready event again after initial setup
  window.postMessage({ type: 'chatgptExtensionReady' }, '*');
}, 1000);

// Periodic refresh and ready event
setInterval(() => {
  findAndSendCodeBlocks();
  window.postMessage({ type: 'chatgptExtensionReady' }, '*');
}, 5000);

// Clean up
window.addEventListener('unload', () => {
  if (observer) observer.disconnect();
  if (popupObserver) popupObserver.disconnect();
});