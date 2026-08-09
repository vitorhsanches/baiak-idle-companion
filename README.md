# Baiak Idle Companion

Local action assistant for Baiak Idle.

The Chrome Manifest V3 extension provides an action-first side panel. Its first action is Auto Sell, explicitly enabled by the user and executed locally by a static content script on `https://baiakidle.com/jogar` and its child routes.

## Auto Sell

Auto Sell watches the visible inventory count and Sell button. When inventory is above the configured threshold and the button is ready, it opens the sale. Confirmation can remain manual or be explicitly automated. A single debounced `MutationObserver` reacts to relevant DOM transitions, while a one-second timer provides a reliability fallback.

Settings are stored at `companion.actions.settings`; operational status is stored separately at `companion.actions.status`. The Debug screen shows only action state, relevant DOM facts, timestamps, errors, and up to 50 local logs.

## Safety

The extension has only `sidePanel` and `storage` permissions. It has no remote API, network interception, cookies, game storage access, telemetry, WebSocket usage, or character control. The content script runs in the default isolated world only on the two declared Baiak Idle routes.

## Development

```sh
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

The build verifier ensures `dist/extension/content.js` is a self-contained IIFE and checks the manifest and runtime for forbidden capabilities.
