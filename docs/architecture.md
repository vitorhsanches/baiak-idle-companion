# Architecture

```text
Chrome Side Panel
        ↓
chrome.storage.local
        ↓
Static Content Script
        ↓
AutoSell Controller
        ↓
Visible Baiak Idle DOM
```

The side panel edits settings and reads operational status. The content script owns one AutoSell controller, listens for settings changes, and cleans up on `pagehide`. The controller owns one debounced MutationObserver and one safety timer while enabled. No background service worker or analysis pipeline participates in action execution.
