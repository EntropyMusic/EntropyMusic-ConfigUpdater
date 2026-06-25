# Entropy Music Firmware Configurator

A free desktop app for configuring your [Entropy Music](https://entropymusic.cc)
hardware. Pick your device, set the MIDI channel, CC number, pitch-bend mode, name,
and LED colors for every control and bank, then upload it straight to your gear over
USB — no browser, no internet connection required.

## Download

Grab the latest version for your operating system from the
**[Releases page »](https://github.com/EntropyMusic/EntropyMusic-ConfigUpdater/releases/latest)**

| Platform | File |
| --- | --- |
| **macOS** | `.dmg` — open it and drag the app to your Applications folder |
| **Windows** | `.exe` — run the installer |
| **Linux** | `.AppImage` — mark it executable and run it |

The app checks for updates automatically and installs them for you.

> **macOS:** the app isn’t signed with an Apple Developer ID, so macOS blocks it
> after download (“app is damaged” or “can’t verify developer”). To fix it:
>
> 1. Drag **Entropy Music Firmware** into your **Applications** folder.
> 2. In the same DMG window, **right-click `fix-gatekeeper.command` → Open**, then
>    click **Open** in the dialog. It clears the download flag and launches the app.
>
> Prefer the command line? Run this once instead:
>
> ```sh
> xattr -dr com.apple.quarantine "/Applications/Entropy Music Firmware.app"
> ```

## How to use it

### 1. Pick your device

When you launch the app you’ll see all supported Entropy Music models. Click the one
you’re configuring.

### 2. Connect and configure

1. Plug your device into your computer with a USB cable.
2. Choose it from the **Select Your Midi Device** dropdown in the top-left.
3. Click any control on the picture (a slider, knob, pad, etc.) to select it.
4. On the right, set its **MIDI Channel**, **CC number**, and toggle **14-bit** for
   higher-resolution control. Use the **Bank** dropdown to set up multiple layouts.

Switch between **Single** (edit one control at a time) and **Table** (see every
control at once) using the toggle at the top.

**Sync** reads your device's current configuration *from the hardware into the app*,
so you start from whatever is already on the device. Leave **Auto** on to do this
automatically whenever you select a device. (Sending your edits the other way — from
the app to the hardware — is what **UPLOAD** does.)

### 3. Upload to your hardware

When everything looks right, click **UPLOAD** to write the configuration to your
device.

### 4. Save and reuse your setups

Use **Save** and **Load** to keep your configurations as files so you can back them
up or switch between them. App preferences (accent color, reduce motion, auto-sync,
confirm-before-upload, default view) live behind the gear button on either screen.

## License

Copyright © 2026 **Entropy Music LLC**.

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — a
source-available license. You may view, use, modify, and share the software for
**any noncommercial purpose** free of charge. **Commercial use is not permitted**
without a separate license from Entropy Music LLC. This is not an open-source
license.
