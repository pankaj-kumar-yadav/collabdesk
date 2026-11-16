import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("collabdesk", {
  getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
});
