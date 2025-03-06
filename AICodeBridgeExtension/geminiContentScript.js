// geminiContentScript.js
console.log('[GeminiExt CS] Content script loaded for Gemini at:', new Date().toISOString());
// Send ready event immediately to signal this script has loaded
window.postMessage({ type: 'geminiExtensionReady' }, '*');
console.log('[GeminiExt CS] Sent geminiExtensionReady event');
// Global variables
let processedMessages = new Set();
let observer = null;
// Main function to extract and send code blocks
function findAndSendCodeBlocks() {
  // Targeting Gemini's code blocks based on your HTML example
  const codeBlocks = document.querySelectorAll('code[data-test-id="code-content"]');
  console.log(`[GeminiExt CS] Found ${codeBlocks.length} potential code blocks from primary selector`);
  
  // If nothing found with specific selector, try more general ones
  let blocksToProcess = codeBlocks;
  if (codeBlocks.length === 0) {
    blocksToProcess = document.querySelectorAll('pre code');
    console.log(`[GeminiExt CS] Found ${blocksToProcess.length} potential code blocks from fallback selector`);
  }
  
  blocksToProcess.forEach(codeBlock => {
    const code = codeBlock.textContent.trim();
    if (!code || code.length < 5) return;
    
    // Create a simple hash to avoid duplicates
    const hash = code.substring(0, 20) + code.length;
    if (processedMessages.has(hash)) return;
    
    // Determine language
    let language = 'text';
    
    // Try to get language from a nearby span (from your HTML structure)
    const headerDecoration = codeBlock.closest('.code-block')?.querySelector('.code-block-decoration span');
    if (headerDecoration) {
      language = headerDecoration.textContent.trim().toLowerCase();
    }
    
    // Send to background
    console.log(`[GeminiExt CS] Sending code block (${language}):`, code.substring(0, 30) + '...');
    processedMessages.add(hash);
    
    chrome.runtime.sendMessage({
      action: "sendMessageToIndex",
      message: code,
      language: language,
      source: 'gemini'
    });
  });
}
// Handle ping messages
window.addEventListener('message', event => {
  console.log(`[GeminiExt CS] Received message event:`, event.data.type);
  
  if (event.data.type === 'geminiPing' || event.data.type === 'scanForCodeBlocks') {
    console.log(`[GeminiExt CS] Processing ${event.data.type} message`);
    
    // Clear the processed messages set when receiving a scan request
    // This is the critical change that will make refresh work
    if (event.data.type === 'scanForCodeBlocks') {
      processedMessages.clear();
      console.log('[GeminiExt CS] Cleared processed messages cache for fresh scan');
    }
    
    findAndSendCodeBlocks();
    
    // Also send a ready event in response to pings
    window.postMessage({ type: 'geminiExtensionReady' }, '*');
  }
});
// Set up mutation observer
function setupObserver() {
  if (observer) observer.disconnect();
  
  observer = new MutationObserver(() => {
    findAndSendCodeBlocks();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
// Initial setup
setTimeout(() => {
  setupObserver();
  findAndSendCodeBlocks();
  
  // Send ready event again after initial setup
  window.postMessage({ type: 'geminiExtensionReady' }, '*');
}, 1000);
// Periodic refresh and ready event
setInterval(() => {
  findAndSendCodeBlocks();
  window.postMessage({ type: 'geminiExtensionReady' }, '*');
}, 5000);
// Clean up
window.addEventListener('unload', () => {
  if (observer) observer.disconnect();
});