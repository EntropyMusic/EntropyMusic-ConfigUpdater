# macOS install — fixing "app is damaged" / "can't verify developer"

The app isn't signed with an Apple Developer ID, so macOS blocks it after
download (you'll see **"app is damaged"** or **"can't verify developer"**). To fix it:

1. Drag **Entropy Music Firmware** into your **Applications** folder.
2. In the same DMG window, **right-click `fix-gatekeeper.command` → Open**, then
   click **Open** in the dialog. It clears the download flag and launches the app.

Prefer the command line? Run this once instead:

```sh
xattr -dr com.apple.quarantine "/Applications/Entropy Music Firmware.app"
```
