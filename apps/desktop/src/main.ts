import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "node:path";

// Prefer IPv4 loopback — avoids occasional localhost → ::1 surprises on Windows.
const START_URL = process.env.ELECTRON_START_URL ?? "http://127.0.0.1:3000";

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "CollabDesk",
    backgroundColor: "#0f1419",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    const html = `<!doctype html>
<html><body style="margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#0f1419;color:#e7ecf3;display:grid;place-items:center;min-height:100vh">
  <div style="max-width:36rem;padding:2rem">
    <h1 style="margin:0 0 .5rem;font-size:1.25rem">CollabDesk could not load the UI</h1>
    <p style="opacity:.85;line-height:1.5">Start the local stack first, then reopen this app:</p>
    <pre style="background:#1a222d;padding:1rem;border-radius:8px;overflow:auto">pnpm db:up
pnpm dev</pre>
    <p style="opacity:.7;font-size:.875rem;margin-top:1rem">Tried: ${validatedURL}<br/>Error ${errorCode}: ${errorDescription}</p>
  </div>
</body></html>`;
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });

  void win.loadURL(START_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  ipcMain.handle("app:getVersion", () => app.getVersion());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
