# Gscripter - AI-Powered Web Development Editor

![GitHub License](https://img.shields.io/github/license/jessegyger/gscripter)
![GitHub Stars](https://img.shields.io/github/stars/jessegyger/gscripter?style=social)
![GitHub Issues](https://img.shields.io/github/issues/jessegyger/gscripter)

See my youtube video explaining and demonstrating its functionality here: https://youtu.be/4ICrtVaiaZc

Or try it out at: https://gygertech.com/gscripter

**Gscripter** is an open-source, lightweight code editor designed for web developers, with integration of AI-generated code from models like Grok, Claude, ChatGPT, and Gemini. It bridges your existing AI subscriptions into your coding workflow via a Chrome extension, allowing you to automatically import, manage, and apply code blocks directly into your projects with a single click. Built with JavaScript, HTML, and CSS, gscripter leverages the Ace Editor for a robust editing experience and offers advanced features like AST visualization, code comparison, and real-time navigation of AI outputs.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
   - [Prerequisites](#prerequisites)
   - [Editor Setup](#editor-setup)
   - [Chrome Extension Setup](#chrome-extension-setup)
3. [Usage](#usage)
   - [Basic Editing](#basic-editing)
   - [AI Integration](#ai-integration)
   - [Prompt Builder](#prompt-builder)
   - [AST Viewer](#ast-viewer)
   - [Code Comparison](#code-comparison)
4. [Architecture](#architecture)
   - [Core Components](#core-components)
   - [File Structure](#file-structure)
5. [Configuration](#configuration)
   - [Settings](#settings)
   - [Customizing Keybindings](#customizing-keybindings)
6. [Contributing](#contributing)
   - [Getting Started](#getting-started)
   - [Submitting Issues](#submitting-issues)
   - [Pull Requests](#pull-requests)
7. [Troubleshooting](#troubleshooting)
8. [Disclaimer](#disclaimer)
9. [Roadmap](#roadmap)
10. [License](#license)
11. [Acknowledgments](#acknowledgments)

## Features

- **AI Code Bridge**: Import code blocks from Grok, Claude, ChatGPT, and Gemini browser tabs via a Chrome extension.
- **Single-Click Code Management**: Replace, insert, or compare AI-generated code with existing functions, methods, or CSS rules.
- **Advanced Text Editor**: Built on Ace Editor with syntax highlighting, autocompletion, and multi-tab support.
- **AST Visualization**: Interactive Abstract Syntax Tree viewer for JavaScript and CSS with node selection and highlighting.
- **Code Comparison**: Side-by-side diff viewer for comparing AI-generated code with your project code.
- **Prompt Builder**: Create and manage prompts for AI models, including code selections and full context integration.
- **Drag-and-Drop Support**: Open files by dragging them into the editor.
- **Real-Time Navigation**: Navigate AI code chunks with sliders, timestamps, and auto-scroll options.
- **Open Source**: Free to use, modify, and extend under the MIT License.

## Installation

### Prerequisites

- **Web Browser**: Google Chrome (for the extension) or any modern browser (for the editor standalone).

### Editor Setup

1. **Download the zip**:
   Simply download the zip and extract it or
   
   git clone https://github.com/jessegyger/gscripter.git
   cd gscripter

3. **Open in Browser**:
- Simply open `index.html` in your browser:
  ```
  open index.html  # MacOS
  start index.html # Windows
  ```
- Alternatively, serve it locally using a simple HTTP server:
  ```
  npm install -g http-server
  http-server .
  ```
  Then navigate to `http://localhost:8080`

3. **Dependencies**:
- The editor uses Ace Editor, which is included in `index.html`. No additional installation is required unless you modify the source.

### Chrome Extension Setup

1. **Download the Extension**:
- From the editor, go to **Settings** > **Downloads** and click "Download AICodeBridge Chrome Extension (unpacked)".
- Extract the downloaded `AICodeBridgeExtension.zip` to a folder (e.g., `AICodeBridgeExtension`).

2. **Install in Chrome**:
- Open Chrome and navigate to `chrome://extensions/`.
- Enable **Developer Mode** (toggle in the top-right corner).
- Click **Load Unpacked** and select the extracted `AICodeBridgeExtension` folder.

3. **Verify Installation**:
- The extension icon should appear in your Chrome toolbar. Click it to ensure it’s active.

## Usage

### Basic Editing

- **Open Files**: Use `Ctrl+O` (or `Cmd+O` on Mac) to open files, or drag-and-drop files into the editor.
- **Save Files**: Press `Ctrl+S` to save, or `Ctrl+Shift+S` for "Save As".
- **Tabs**: Create new tabs with `Ctrl+T`, close with `Ctrl+W`, and switch using the tab bar.
- **Syntax Highlighting**: Automatically detects languages (JS, HTML, CSS, etc.) based on file extensions.

### AI Integration

1. **Generate Code**:
- Open a tab for Grok (`x.com/i/grok`), Claude (`claude.ai`), ChatGPT (`chat.openai.com`), or Gemini (`gemini.google.com`).
- Prompt the AI to generate code.

2. **Import Code**:
- With the Chrome extension active, code blocks from these tabs are detected and sent to gscripter.
- In the editor, open the **AI Pane** (right sidebar) and select your AI model (Grok, Claude, etc.).
Note: You must refresh the AI model tab (Grok, Claude, etc.) for the code to properly inject.

3. **Manage Code**:
- Use the navigation bars (arrows, slider at the top and bottom of screen) to browse code chunks.
- Click **Copy All**, **Replace All**, or **Paste at Cursor** from the top/bottom button groups.
-In the "Code Blocks" section, see matched functions/classes/rules:
  - **Replace**: Overwrite existing code.
  - **Insert**: Add new code at appropriate positions.
  - **Compare**: View differences in a diff window.

### Prompt Builder

- **Open**: Click the prompt button (`>`) in the toolbar.
- **Configure**:
  - Enter a **Prompt** and **Post Prompt** (instructions/context for the AI).
  - Add **Code Selections** from the editor by selecting code and clicking "Add Selection".
  - Toggle "Include Full Code" to send the entire file context.
- **Send**: Click "Grok" or "Claude" to open a new chat tab with your prompt, or "Copy All" to clipboard.
  - There is a prompt character limit when sendinging to grok or claude due to sending the prompt in the url (around 20k characters)
  - The send to ai feature is only for the first interaction with AI. You must maintain your conversation with the original AI service tab. 

### AST Viewer

- **Open**: Toggle the AST pane from the sidebar (`Ctrl+B` or sidebar button).
- **Navigate**: Click nodes to expand/collapse, or use arrow keys for keyboard navigation.
- **Select**: Click or Shift+click nodes to highlight corresponding code in the editor. The arrow keys also can navigate the AST.

### Code Comparison

- **Trigger**: In the AI pane, click "Compare" next to a matched code block.
- **View**: See original vs. AI-generated code side-by-side with diff highlighting.
- **Actions**: Click "Replace" to apply changes, or "×" to close.

## Architecture

### Core Components

- **`TextEditor`**: The class that manages the editor UI, tabs, and file operations.
- **`AINavigationManager`**: Handles navigation and display of AI code chunks with streaming support.
- **`AICodeViewer`**: Renders AI code blocks with editing, copying, and matching capabilities.
- **`CodeMatchManager`**: Analyzes and matches AI code with the editor’s content.
- **`CodeComparer`**: Provides diff visualization for code comparison.
- **`ASTViewer`**: Parses and displays the AST for JS/CSS with interactive features.
- **`Prompt`**: Manages prompt creation and integration with AI models.
- **`CodeParser`**: Custom parser for JS and CSS AST generation.

### File Structure

```plaintext
gscripter/
├── index.html          # Main entry point
├── ace/
│   ├── ace.js          # Core Ace Editor library
│   ├── ext-searchbox.js # Searchbox extension
│   ├── ext-language_tools.js # Autocompletion tools
│   ├── ext-modelist.js  # File extension to mode mapping
│   ├── theme/
│   │   └── theme-monokai.js # Monokai theme
│   ├── mode-javascript.js # JS syntax highlighting
│   ├── mode-html.js    # HTML syntax highlighting
│   ├── mode-css.js     # CSS syntax highlighting
│   ├── mode-python.js  # Python syntax highlighting
│   ├── mode-java.js    # Java syntax highlighting
│   ├── mode-typescript.js # TS syntax highlighting
│   ├── mode-php.js     # PHP syntax highlighting
│   ├── mode-ruby.js    # Ruby syntax highlighting
│   ├── mode-golang.js  # Go syntax highlighting
│   ├── mode-sql.js     # SQL syntax highlighting
│   ├── mode-markdown.js # Markdown syntax highlighting
│   ├── mode-json.js    # JSON syntax highlighting
│   └── mode-xml.js     # XML syntax highlighting
├── AICodeBridgeExtension/
│   ├── manifest.json   # Chrome extension manifest
│   ├── background.js   # Extension background script
│   ├── indexContentScript.js # General content script
│   ├── grokContentScript.js # Grok-specific content script
│   ├── claudeContentScript.js # Claude-specific content script
│   ├── chatgptContentScript.js # ChatGPT-specific content script
│   ├── geminiContentScript.js # Gemini-specific content script
│   ├── options.js      # Options page script
│   ├── options.html    # Options page UI
│   ├── popup.js        # Popup script
│   └── popup.html      # Popup UI
├── README.md           # This file
└── (other assets)      # Images, additional scripts, etc.
```



## Configuration

### Settings

- **Access**: Click the cog icon in the toolbar.
- **Options**:
  - **Storage Directory**: Set a default save location.
  - **Use Storage Directory**: Toggle between last-used location and fixed directory.
  - **Download Extension**: Download the Chrome extension if needed.

### Customizing Keybindings

- Modify `setupEditorCommands` in `TextEditor` to change shortcuts:

  editor.commands.addCommand({
      name: 'customCommand',
      bindKey: { win: 'Ctrl-Alt-C', mac: 'Cmd-Alt-C' },
      exec: () => { /* Your action */ }
  });

## Contributing

### Getting Started

1. Fork the repository and clone your fork:

   git clone https://github.com/yourusername/gscripter.git

2. Make changes and test locally.
3. Submit a pull request (see below).

### Submitting Issues

- Use the GitHub Issues tab to report bugs or suggest features.
- Include:
  - Steps to reproduce
  - Expected vs. actual behavior
  - Screenshots or logs (if applicable)

### Pull Requests

- **Branch**: Create a feature branch (`git checkout -b feature-name`).
- **Commit**: Use clear, concise messages (e.g., "Add XYZ feature").
- **Test**: Ensure the editor and extension work as expected.
- **Submit**: Open a PR with a detailed description of changes.

## Troubleshooting

- **Extension Not Working**:
  - Ensure Developer Mode is enabled in Chrome.
  - Refresh the Grok, Claude, ChatGPT or Gemini pages.
  - Check `chrome://extensions/` for errors in the extension.
- **Editor Not Loading**:
  - Open browser console (`F12`) for JS errors.
- **AI Code Not Importing**:
  - Confirm the extension is active on supported AI sites.
  - Reload the AI tab and editor.

For more help, file an issue or check the [Discussions](https://github.com/jessegyger/gscripter/discussions) tab.



## Disclaimer 
 - This software may have bugs which could lead to unwanted outcomes.. Please make backups of your work just in case.

## Roadmap

- **Multi-Language Support**: Extend AST parsing to Python, Java, etc.
- **Plugin System**: Allow custom extensions for additional AI models.
- **Performance Optimization**: Reduce event listener overhead for large projects.
- **Desktop App**: Package as an Electron app for offline use.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- **Ace Editor**: For providing a powerful editing foundation.
- **xAI, Anthropic, OpenAI, Google**: For their AI models that inspire this tool.
- **Contributors**: Thanks to all who test, report bugs, and improve gscripter!

