//claudeContentScript.js

(function() {
  'use strict';

  console.log('[Claude CS V1.2] Content script injected - Inline & Artifact Streaming Enabled');

  // --- GLOBAL VARIABLES ---
  let claudeLastMessages = new Map(); // Key: DOM Element (for inline), Value: Last sent code string
  let artifactStreamStates = new Map(); // Key: streamId, Value: { lastContent: string, language: string }
  let processedFinalBlocks = new Set(); // Track final blocks (both inline and artifact) to prevent duplicates
  let lastSendTime = 0;
  let observer = null;
  let artifactButtons = new Set(); // Track artifact buttons with attached listeners

  // --- CORE LOGIC ---

  // Simple hash function for generating IDs/fingerprints
  function hashString(str) {
    // Normalize string - remove trailing backticks for hashing consistency
    let normalized = str;
    if (normalized.endsWith('`') || normalized.endsWith('``') || normalized.endsWith('```')) {
      normalized = normalized.replace(/`+$/, '');
    }

    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'hash-' + Math.abs(hash).toString(16);
  }

  // Helper to determine language from element context
  function determineLanguage(element) {
    if (!element) return 'text';

    // 1. Check element's own class
    const languageClass = Array.from(element.classList || [])
      .find(cls => cls.startsWith('language-'));
    if (languageClass) return languageClass.replace('language-', '');

    // 2. Check parent container attributes or classes
    const container = element.closest('[data-language], [data-type], .language-python, .language-javascript, .language-html, .language-css, .language-json, .language-typescript');
    if (container) {
      const dataLang = container.getAttribute('data-language') || container.getAttribute('data-type');
      if (dataLang) {
          // Normalize common types
          if (dataLang.toLowerCase().includes('python')) return 'python';
          if (dataLang.toLowerCase().includes('javascript')) return 'javascript';
          if (dataLang.toLowerCase().includes('typescript')) return 'typescript';
          if (dataLang.toLowerCase().includes('html')) return 'html';
          if (dataLang.toLowerCase().includes('css')) return 'css';
          if (dataLang.toLowerCase().includes('json')) return 'json';
          if (dataLang.toLowerCase().includes('text')) return 'text';
          // Return the attribute value if specific known types aren't found
          return dataLang.split(/[-_\s]/)[0].toLowerCase(); // Basic cleanup
      }

      // Check common language classes on container
      if (container.classList.contains('language-python')) return 'python';
      if (container.classList.contains('language-javascript')) return 'javascript';
      if (container.classList.contains('language-typescript')) return 'typescript';
      if (container.classList.contains('language-html')) return 'html';
      if (container.classList.contains('language-css')) return 'css';
      if (container.classList.contains('language-json')) return 'json';
    }

    // 3. Check for language label used for inline blocks (might appear near artifacts too)
    const preWrapper = element.closest('pre')?.parentElement;
    const languageLabel = preWrapper?.querySelector('.text-text-500.absolute, span[class*="code-block-language"]'); // Adjust selector as needed
      if (languageLabel) {
         const labelText = languageLabel.textContent.trim().toLowerCase();
         if (labelText && !labelText.includes('clipboard') && labelText.length < 15) return labelText;
     }

    // 4. Guess from content as a last resort
    const content = element.textContent || '';
    if (content.includes('def ') && content.includes(':') && !content.includes('function')) return 'python';
    if (content.includes('<html>') || content.includes('</div>') || content.includes('<!DOCTYPE')) return 'html';
    if (content.includes('.css') || (content.includes('{') && content.includes('}') && content.includes(':') && !content.includes('=>'))) return 'css';
    if (content.includes('function') || content.includes('const ') || content.includes('let ') || content.includes('=>')) return 'javascript';
    if ((content.startsWith('{') && content.endsWith('}')) || (content.startsWith('[') && content.endsWith(']'))) {
        try { JSON.parse(content); return 'json'; } catch(e) { /* ignore json parse error */ }
    }


    return 'text'; // Default
  }

  // Helper: Get a stable ID for an artifact stream
  function getArtifactStreamId(element) {
    const artifactContainer = element.closest('.artifact-block-cell, [data-artifact="true"], [data-artifact-id]');
    if (!artifactContainer) {
      return null; // Not part of a recognizable artifact
    }

    // Prefer explicit ID from container
    let id = artifactContainer.id || artifactContainer.getAttribute('data-artifact-id');
    if (id && id.trim()) {
      return `artifact-${id.trim()}`;
    }

    // Fallback: Generate ID based on hash of initial content (less stable but better than nothing)
    // We need *some* way to associate updates to the same logical block.
    // Note: If the *very beginning* of the content changes drastically, this might create a new stream.
    const content = element.textContent?.substring(0, 50) || '';
    const fallbackId = hashString(artifactContainer.outerHTML.substring(0,100) + content); // Use outerHTML start + content start
    // console.warn(`[Claude CS] No stable ID found for artifact, using generated ID: ${fallbackId}`, artifactContainer);
    return `artifact-gen-${fallbackId}`; // Mark as generated
  }

  // --- NEW: SIMPLIFIED ARTIFACT STREAMING APPROACH ---
  function processArtifactStreams() {
    // Direct approach: find code blocks inside streaming artifacts
    const streamingMessages = document.querySelectorAll('[data-is-streaming="true"]');
    streamingMessages.forEach(message => {
      // Find all artifact containers in this currently streaming message
      const artifactContainers = message.querySelectorAll('.artifact-block-cell, [data-artifact="true"]');
      
      artifactContainers.forEach(artifactContainer => {
        // Find the actual code display element - handling both the complex token structure and simpler styles
        const codeDisplays = [];
        
        // First: check for HTML/CSS style artifacts like from your paste.txt (these have token spans)
        const codeDisplayDivs = artifactContainer.querySelectorAll('div.code-block__code, div[style*="background"]');
        codeDisplayDivs.forEach(div => {
          if (div.querySelectorAll('span.token').length > 0 || div.textContent.trim().length > 5) {
            codeDisplays.push(div);
          }
        });
        
        // Second: look for more traditional code/pre elements
        const codeElements = artifactContainer.querySelectorAll('code, pre');
        codeElements.forEach(el => {
          // Avoid duplicates and very small content
          if (el.textContent.trim().length > 5 && !codeDisplays.includes(el)) {
            codeDisplays.push(el);
          }
        });
        
        // Process each code display we found
        codeDisplays.forEach(element => {
          // Get a unique ID for this artifact stream
          const streamId = getArtifactStreamId(element);
          if (!streamId) return;
          
          // Get the code content - directly use textContent (handles both tokens and normal text)
          const currentCode = element.textContent.trim();
          if (!currentCode || currentCode.length < 5) return;
          
          // Handle language detection
          let language = determineLanguage(element);
          
          // Check if this is different from what we've seen before
          const currentState = artifactStreamStates.get(streamId);
          const lastSentCode = currentState?.lastContent;
          
          // Check if content is new or changed
          if (lastSentCode === undefined || lastSentCode !== currentCode) {
            // Update our state tracking
            artifactStreamStates.set(streamId, { lastContent: currentCode, language: language });
            
            console.log(`>>> Streaming ARTIFACT | ID: ${streamId} | Length: ${currentCode.length} | Lang: ${language} | isStreaming: true`);
            
            // Send to editor
            chrome.runtime.sendMessage(
              {
                action: "sendMessageToIndex",
                message: currentCode,
                language: language,
                source: 'claude',
                isArtifact: true,
                isFinal: false, // Not final since it's in a streaming message
                streamId: streamId
              },
              function(response) {
                if (chrome.runtime.lastError && !chrome.runtime.lastError.message.includes('port closed')) {
                  console.error(`[Claude CS] sendMessage FAILED for artifact stream ${streamId}:`, chrome.runtime.lastError.message);
                }
              }
            );
          }
        });
      });
    });
    
    // Also check for completed artifacts in non-streaming messages
    checkCompletedArtifacts();
  }
  
  // Check for completed artifacts that finished streaming
  function checkCompletedArtifacts() {
    // Find all finished message containers with artifacts
    const completedMessages = document.querySelectorAll('[data-is-streaming="false"] .artifact-block-cell, [data-is-streaming="false"] [data-artifact="true"]');
    
    completedMessages.forEach(artifactContainer => {
      // Similar approach as streaming, but mark as final
      const codeDisplays = [];
      
      // Get code displays - handle both complex token structure and simpler styles
      const codeDisplayDivs = artifactContainer.querySelectorAll('div.code-block__code, div[style*="background"]');
      codeDisplayDivs.forEach(div => {
        if (div.querySelectorAll('span.token').length > 0 || div.textContent.trim().length > 10) {
          codeDisplays.push(div);
        }
      });
      
      // Get traditional code/pre elements
      const codeElements = artifactContainer.querySelectorAll('code, pre');
      codeElements.forEach(el => {
        if (el.textContent.trim().length > 10 && !codeDisplays.includes(el)) {
          codeDisplays.push(el);
        }
      });
      
      // Process each code display
      codeDisplays.forEach(element => {
        const streamId = getArtifactStreamId(element);
        if (!streamId) return;
        
        const currentCode = element.textContent.trim();
        if (!currentCode || currentCode.length < 10) return;
        
        // Create fingerprint for duplicate prevention
        const finalFingerprint = `final-${streamId}-${hashString(currentCode)}`;
        
        // Skip if already processed as final
        if (processedFinalBlocks.has(finalFingerprint)) {
          return;
        }
        
        // Mark as processed
        processedFinalBlocks.add(finalFingerprint);
        
        const language = determineLanguage(element);
        
        console.log(`>>> Completed ARTIFACT | ID: ${streamId} | Length: ${currentCode.length} | Lang: ${language} | isFinal: true`);
        
        // Send final code to editor
        chrome.runtime.sendMessage(
          {
            action: "sendMessageToIndex",
            message: currentCode,
            language: language,
            source: 'claude',
            isArtifact: true,
            isFinal: true,
            streamId: streamId
          },
          function(response) {
            if (chrome.runtime.lastError && !chrome.runtime.lastError.message.includes('port closed')) {
              console.error(`[Claude CS] sendMessage FAILED for completed artifact ${streamId}:`, chrome.runtime.lastError.message);
            }
          }
        );
      });
    });
  }

  // --- UNCHANGED: Processing function for INLINE code blocks ---
  function getLanguageForInline(codeElement) {
      const languageClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
      if (languageClass) return languageClass.replace('language-', '');
      const preWrapper = codeElement.closest('.code-block__code')?.closest('.relative.flex.flex-col');
      const languageLabel = preWrapper?.querySelector('.text-text-500.absolute, span[class*="code-block-language"]'); // More general selector
        if (languageLabel) {
          const labelText = languageLabel.textContent.trim().toLowerCase();
          if (labelText && !labelText.includes('clipboard') && labelText.length < 15) return labelText;
      }
      // Try parent language class as fallback
      const parentLangClass = codeElement.closest('[class*="language-"]');
      if (parentLangClass){
          const foundClass = Array.from(parentLangClass.classList).find(cls => cls.startsWith('language-'));
          if(foundClass) return foundClass.replace('language-', '');
      }
      return determineLanguage(codeElement); // Use general helper as last resort
  }

  function processCodeBlocks(blocks) {
    const now = performance.now();
    blocks.forEach((block) => {
      // Ensure it's the correct inline code element, not inside an artifact preview/content
      if (block.closest('.artifact-block-cell, [data-artifact="true"]')) {
        return; // Skip elements inside artifacts, handled by processArtifactStream
      }
      // Ensure it's the direct child code element we expect for inline blocks
       if (!block.matches('pre.code-block__code > code')) {
            // console.log("[Claude CS] Skipping non-standard inline code element:", block);
            return;
       }


      const codeElement = block;
      let language = getLanguageForInline(codeElement);
      let currentCode = codeElement.textContent.trim();

      // Fix for trailing backticks issue
      if (currentCode.endsWith('`') || currentCode.endsWith('``') || currentCode.endsWith('```')) {
          const lines = currentCode.split('\n');
          const lastLine = lines[lines.length - 1].trim();
          if (lastLine === '`' || lastLine === '``' || lastLine === '```') {
              lines.pop();
              currentCode = lines.join('\n').trim();
          } else {
              // Sometimes the backticks are part of the last line of code itself, remove carefully
              currentCode = currentCode.replace(/`+$/, '');
          }
      }

      if (!currentCode) { return; } // Skip empty

      const messageContainer = codeElement.closest('[data-is-streaming]');
      const isFinal = messageContainer ? messageContainer.getAttribute('data-is-streaming') === 'false' : true;
      const messageId = messageContainer?.id || ''; // Use message ID for context

      // Generate a unique fingerprint for this specific inline block instance
      // Use message ID + code length + start/end content for better uniqueness
      let fingerprintCode = currentCode.replace(/`+$/, ''); // Use cleaned code for fingerprint
      const blockFingerprint = `inline-${messageId}:${fingerprintCode.length}:${hashString(fingerprintCode.substring(0, 50) + fingerprintCode.substring(fingerprintCode.length - 50))}`;

      // DUPLICATE PREVENTION - Skip if we've already sent this code block as final
      if (isFinal && processedFinalBlocks.has(blockFingerprint)) {
          // console.log(`[Claude CS] Skipping final inline block, already processed: ${blockFingerprint.substring(0, 50)}...`);
          return;
      }

      // Change Tracking Logic - use the DOM element itself as the key for inline blocks
      const blockElementKey = codeElement;
      const lastSentCode = claudeLastMessages.get(blockElementKey);

      if (lastSentCode === undefined || lastSentCode !== currentCode) {
        claudeLastMessages.set(blockElementKey, currentCode); // Track by element

        // Mark as processed if this is a final block
        if (isFinal) {
          processedFinalBlocks.add(blockFingerprint);
           // Optional: clean up claudeLastMessages for this element if final?
           // claudeLastMessages.delete(blockElementKey);
        }

        console.log(`>>> Sending INLINE | Length: ${currentCode.length} | Lang: ${language} | isFinal: ${isFinal} | FP: ${blockFingerprint.substring(0,50)}...`);

        // Send the message
        chrome.runtime.sendMessage(
          { // Payload
            action: "sendMessageToIndex",
            message: currentCode,
            language: language,
            source: 'claude',
            isArtifact: false, // Explicitly not an artifact
            isFinal: isFinal
          },
          function(response) {
            if (chrome.runtime.lastError) {
              if (!chrome.runtime.lastError.message.includes('port closed')) {
                console.error(`[Claude CS] sendMessage FAILED for inline:`, chrome.runtime.lastError.message);
              }
            }
          }
        );
        lastSendTime = now;
      }
    });
  }


  // --- ARTIFACT CLICK HANDLING (Fallback/Manual Trigger) ---

  // Extract and send full artifact content, typically after a click
  function extractFullArtifactContent(clickedButton = null) {
    console.log('[Claude CS] Attempting to extract full artifact content...');
    let contentElement = null;
    let language = 'text';

    // Strategy 1: Look relative to the button that was clicked (if provided)
     if (clickedButton) {
         const container = clickedButton.closest('.artifact-block-cell, [data-artifact="true"]');
         if (container) {
             // Look for the specific content area within this container
             contentElement = container.querySelector('.artifact-block-cell-content code, .artifact-content code, code'); // Prioritize specific content selectors
             if (contentElement) {
                 language = determineLanguage(contentElement);
             } else {
                 // Fallback to any pre/code inside the container if specific ones fail
                 contentElement = container.querySelector('pre, code');
                 if(contentElement) language = determineLanguage(contentElement);
             }
         }
     }


    // Strategy 2: Look for modals or expanded views (more general)
    if (!contentElement) {
        const modalSelectors = [
            '.code-modal code',
            '.code-viewer-modal code',
            '.artifact-modal code',
            '.expanded-artifact code',
            '.artifact-expanded-view code',
            // Add other potential selectors for expanded/modal views
            '[role="dialog"] code', // General dialog selector
            '.modal-content code'
        ];
        for (const selector of modalSelectors) {
            contentElement = document.querySelector(selector);
            if (contentElement && contentElement.textContent) {
                language = determineLanguage(contentElement);
                console.log(`[Claude CS] Found artifact content via modal selector: ${selector}`);
                break;
            }
        }
    }

    // Strategy 3: Last resort - find the 'largest' code block not part of an inline block
    // This is less reliable as it might grab the wrong thing.
    if (!contentElement || !contentElement.textContent) {
        let maxLen = 0;
        let largestCodeElement = null;
        document.querySelectorAll('code, pre').forEach(el => {
            if (!el.closest('pre.code-block__code')) { // Skip known inline blocks
                const len = el.textContent?.length || 0;
                if (len > maxLen && len > 100) { // Must be reasonably large
                    maxLen = len;
                    largestCodeElement = el;
                }
            }
        });
        if (largestCodeElement) {
            console.warn('[Claude CS] Using largest non-inline code block as fallback for artifact content.');
            contentElement = largestCodeElement;
            language = determineLanguage(contentElement);
        }
    }


    if (contentElement && contentElement.textContent) {
      const content = contentElement.textContent.trim();
      const streamId = getArtifactStreamId(contentElement) || `artifact-click-${hashString(content.substring(0,50))}`;
      const finalFingerprint = `final-${streamId}-${hashString(content)}`;

      // Avoid sending if already processed as final via streaming
      if (processedFinalBlocks.has(finalFingerprint)) {
        console.log(`[Claude CS] Skipping clicked artifact, already sent as final: ${streamId}`);
        return;
      }

      console.log(`>>> Sending FULL ARTIFACT (from Click/Extract) | ID: ${streamId} | Length: ${content.length} | Lang: ${language}`);
      processedFinalBlocks.add(finalFingerprint); // Mark as processed

      chrome.runtime.sendMessage(
        {
          action: "sendMessageToIndex",
          message: content,
          language: language,
          source: 'claude',
          isArtifact: true,
          isFinal: true, // Assume final when explicitly extracted
          streamId: streamId
        },
        function(response) {
          if (chrome.runtime.lastError) {
            if (!chrome.runtime.lastError.message.includes('port closed')) {
              console.error(`[Claude CS] sendMessage FAILED for extracted artifact ${streamId}:`, chrome.runtime.lastError.message);
            }
          }
        }
      );
    } else {
      console.log('[Claude CS] Could not find full artifact content element after click/extract attempt.');
    }
  }


  // Attach listeners to artifact "Preview" or similar buttons
  function findAndAttachArtifactListeners() {
    // Selectors for buttons that likely reveal full artifact content
    const buttonSelectors = [
        'button[aria-label*="Preview"]', // Standard preview button
        'button[aria-label*="View"]',   // "View content", "View code", etc.
        'button[aria-label*="Expand"]', // "Expand code", etc.
        '.artifact-block-cell button', // Any button directly within an artifact cell
        '[data-artifact="true"] button' // Any button within data-artifact element
    ];

    let foundNewButton = false;
    document.querySelectorAll(buttonSelectors.join(', ')).forEach(button => {
        // Check if it's within an artifact container and we haven't added a listener yet
        if (button.closest('.artifact-block-cell, [data-artifact="true"]') && !artifactButtons.has(button)) {
            artifactButtons.add(button);
            foundNewButton = true;
            button.addEventListener('click', function(event) {
                console.log('[Claude CS] Artifact interaction button clicked:', button.ariaLabel || button.textContent.trim());
                // Use event.currentTarget in case the click target is an inner element
                const clickedButton = event.currentTarget;
                // Wait a bit for potential DOM changes after click
                setTimeout(() => {
                    extractFullArtifactContent(clickedButton);
                }, 300); // Delay might need adjustment
            });
        }
    });
     // if (foundNewButton) console.log('[Claude CS] Attached listeners to new artifact buttons.');
  }


  // --- MAIN CHECK FUNCTION ---

  function checkClaudeChanges() {
    // 1. Process INLINE code blocks (uses processCodeBlocks)
    const inlineCodeBlocks = document.querySelectorAll('pre.code-block__code > code');
    if (inlineCodeBlocks.length > 0) {
      processCodeBlocks(inlineCodeBlocks);
    }

    // 2. Process ARTIFACT streams with the simplified approach
    processArtifactStreams();

    // 3. Find and attach listeners to artifact buttons (for click fallback)
    findAndAttachArtifactListeners();
  }

  // --- OBSERVER SETUP ---

  function setupObserver() {
    if (observer) {
      observer.disconnect();
      console.log('[Claude CS] Disconnected existing observer.');
    }

    observer = new MutationObserver((mutations) => {
      // For mutations that look like they might be related to artifact streaming,
      // run the check immediately (helps catch the transitions)
      let hasArtifactMutation = false;
      for (const mutation of mutations) {
        if (mutation.target.closest && mutation.target.closest('.artifact-block-cell, [data-artifact="true"]')) {
          hasArtifactMutation = true;
          break;
        }
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-is-streaming' && 
            mutation.target.getAttribute('data-is-streaming') === 'false') {
          // Message finished streaming, check right away
          hasArtifactMutation = true;
          break;
        }
      }
      
      if (hasArtifactMutation) {
        // Skip animation frame for artifact mutations - check immediately
        checkClaudeChanges();
      } else {
        // Use requestAnimationFrame for other mutations
        requestAnimationFrame(() => {
          checkClaudeChanges(); // Run the main check function on any mutation
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      // Observe common attributes that change during streaming or content updates
       attributeFilter: ['data-is-streaming', 'class', 'style', 'id', 'data-artifact-id', 'hidden']
    });

    console.log('[Claude CS] MutationObserver setup complete and observing document body.');
    
    // Set up a separate polling interval just for streaming artifacts
    // This helps catch artifacts that might be missed due to complex DOM changes
    window.artifactCheckInterval = setInterval(() => {
      const streamingMessages = document.querySelectorAll('[data-is-streaming="true"]');
      if (streamingMessages.length > 0) {
        processArtifactStreams();
      }
    }, 250); // Check every 250ms while page is open
  }

  // --- INITIALIZATION & EVENT LISTENERS ---

  // Manual scan function (e.g., for debugging via console)
  function scanAllCodeBlocks() {
    console.log('[Claude CS] Manually scanning all code blocks...');
    // Clear non-final states to force re-evaluation, but keep final blocks to avoid duplicates
    claudeLastMessages.clear(); // Reset inline tracking
    artifactStreamStates.clear(); // Reset artifact stream tracking
    // processedFinalBlocks.clear(); // DO NOT CLEAR final blocks unless full reset needed

    checkClaudeChanges(); // Run the check
    console.log('[Claude CS] Manual scan complete.');
  }
   window.scanClaudeCode = scanAllCodeBlocks; // Expose for console access


   // Listen for messages from other parts of the extension (e.g., popup)
   window.addEventListener('message', (event) => {
     // Check origin and data structure for security if needed
     if (event.source === window && event.data) {
         if (event.data.type === "scanForCodeBlocks") {
             console.log('[Claude CS] Received scanForCodeBlocks message.');
             scanAllCodeBlocks();
         } else if (event.data.type === "claudePing") {
             // console.log('[Claude CS] Received claudePing message.');
             checkClaudeChanges(); // Run check on ping
             window.postMessage({ type: 'claudeExtensionReady', version: '1.2' }, '*'); // Respond pong
         }
     }
   });


  // Initial setup run
  // Use a small delay and readyState check to ensure body is somewhat loaded
  function initialRun() {
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
              console.log('[Claude CS] DOMContentLoaded, performing initial setup.');
              setupObserver();
              checkClaudeChanges(); // Initial check after DOM loaded
              window.postMessage({ type: 'claudeExtensionReady', version: '1.2' }, '*');
              console.log('[Claude CS] Initial check complete, ready event sent.');
          });
      } else {
           console.log('[Claude CS] Document already loaded, performing initial setup.');
           setupObserver();
           checkClaudeChanges(); // Initial check
           window.postMessage({ type: 'claudeExtensionReady', version: '1.2' }, '*');
           console.log('[Claude CS] Initial check complete, ready event sent.');
      }
  }

  initialRun();


  // Cleanup observer on page unload
  window.addEventListener('unload', () => {
    if (observer) {
      observer.disconnect();
      console.log('[Claude CS] Disconnected observer on page unload.');
    }
    if (window.artifactCheckInterval) {
      clearInterval(window.artifactCheckInterval);
    }
  });

// Add a general click listener as a fallback for artifact interactions,
// useful if specific button listeners fail or if interaction is not via button.
// Use capture phase to potentially catch events earlier.
document.addEventListener('click', function(event) {
  const target = event.target;
  // Check if the click happened inside an artifact container but *not* on an already handled button
  const artifactContainer = target.closest('.artifact-block-cell, [data-artifact="true"]');
  const handledButton = target.closest('button'); // Check if click was on any button

  if (artifactContainer && !(handledButton && artifactButtons.has(handledButton))) {
    console.log('[Claude CS] General click detected inside artifact container (not on a handled button). Delaying extraction check.');
    // Delay slightly to allow any default Claude JS to execute first
    setTimeout(() => {
        // Pass the container element to help find the content
        extractFullArtifactContent(artifactContainer);
    }, 350); // Slightly longer delay for general clicks
  }
}, true); // Use capture phase


})(); // End of File
