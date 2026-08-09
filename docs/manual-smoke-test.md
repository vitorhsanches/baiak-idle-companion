# Manual smoke test

1. Run `npm run build` and load `dist/extension` as an unpacked extension.
2. Open `https://baiakidle.com/jogar` and the extension side panel.
3. Confirm Debug reports the content script as connected and reflects inventory/Sell state.
4. Enable Auto Sell with automatic confirmation off. Above the threshold, verify the sale modal opens but is not confirmed.
5. Cancel manually and verify Auto Sell rearms. Confirm manually and verify cooldown is reported.
6. Enable automatic confirmation and verify only the visible “Vender tudo” modal is confirmed.
7. Use STOP ALL AUTOMATIONS and verify state becomes disabled with no later click.
