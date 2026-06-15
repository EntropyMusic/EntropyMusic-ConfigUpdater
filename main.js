// Electron main process for the Entropy Music firmware configurator.
//
// Two things make the firmware page work outside a browser:
//  1. A custom `app://` scheme registered as a SECURE + fetch-capable standard
//     scheme, so the page runs in a secure context (Web MIDI SysEx requires it)
//     and the runtime fetch() calls for controller templates / CSS succeed.
//     Loading via file:// would block those fetches.
//  2. Permission handlers that grant `midi` + `midiSysex`. In a browser the user
//     gets a prompt; in Electron the request is denied by default unless handled.

const { app, BrowserWindow, Menu, session, protocol, net, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const RENDERER_DIR = path.join(__dirname, "renderer");
const SCHEME = "app";

// Must run before app `ready`.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function resolveRequestPath(reqUrl) {
  // app://bundle/js/foo.js?raw -> renderer/js/foo.js
  const url = new URL(reqUrl);
  let pathname = decodeURIComponent(url.pathname); // query already excluded
  if (!pathname || pathname === "/") pathname = "/index.html";

  // Prevent path traversal escaping the renderer dir.
  const resolved = path.normalize(path.join(RENDERER_DIR, pathname));
  if (!resolved.startsWith(RENDERER_DIR)) return null;
  return resolved;
}

function registerAppProtocol() {
  protocol.handle(SCHEME, (request) => {
    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function grantMidi(permission) {
  return permission === "midi" || permission === "midiSysex";
}

// Sandbox is on with no preload/IPC bridge, so the menu reaches the renderer by
// dispatching a DOM event it can listen for. Only the firmware page handles it;
// it's a harmless no-op on the launcher.
function openSettings() {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  win?.webContents
    .executeJavaScript("window.dispatchEvent(new Event('open-firmware-settings'))")
    .catch(() => {});
}

function buildAppMenu() {
  const isMac = process.platform === "darwin";
  const settingsItem = {
    label: "Settings…",
    accelerator: "CmdOrCtrl+,",
    click: openSettings,
  };

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              settingsItem,
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        ...(isMac ? [] : [settingsItem, { type: "separator" }]),
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close" }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 830,
    minHeight: 370,
    backgroundColor: "#000000",
    title: "Entropy Music Firmware",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external (http/https) links in the system browser instead of
  // navigating the app window. Internal app:// navigation is left untouched.
  const isExternal = (url) => /^https?:\/\//i.test(url);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isExternal(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(`${SCHEME}://bundle/launcher.html`);
  return win;
}

app.whenReady().then(() => {
  registerAppProtocol();
  buildAppMenu();

  // Grant Web MIDI (incl. SysEx) without a prompt; deny everything else.
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(grantMidi(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => grantMidi(permission));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
