#!/bin/bash
# Double-click to let macOS open the (unsigned) Entropy Music Firmware app.
# Clears the download quarantine flag macOS adds to anything downloaded.
# ponytail: hardcoded app name; only one app ships, no need to parameterize.

APP="/Applications/Entropy Music Firmware.app"

if [ ! -d "$APP" ]; then
  echo "Drag 'Entropy Music Firmware' into your Applications folder first, then run this again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

xattr -dr com.apple.quarantine "$APP" && open "$APP"
