// Minimal, sandbox-safe bridge for the auto-updater UI.
//
// The window runs sandboxed with contextIsolation on, so the renderer has no
// Node access. A sandboxed preload may still `require('electron')` for the
// narrow set of safe modules (contextBridge, ipcRenderer), which is all we need
// to relay update status to the page and send back the "install now" action.
//
// Exposed as `window.updater`:
//   onStatus(cb)  -> subscribe to update lifecycle events from the main process
//   check()       -> ask the main process to check for updates now
//   install()     -> quit and install an already-downloaded update
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  onStatus(callback) {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("update-status", handler);
    // Allow the page to unsubscribe (e.g. on teardown).
    return () => ipcRenderer.removeListener("update-status", handler);
  },
  check() {
    ipcRenderer.send("update-check");
  },
  install() {
    ipcRenderer.send("update-install");
  },
});
