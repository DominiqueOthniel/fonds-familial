import { app } from "electron";
import path from "path";
import { isDev } from "./utils.js";

export function getPreloadPath() {
  return path.join(
    app.getAppPath(),
    isDev() ? "." : "..",
    "/dist-electron/preload.cjs"
  );
}

export function getAssetPath(...segments: string[]) {
  // Les assets sont packagés dans app.asar sous "assets".
  // En dev, on lit depuis le projet.
  const base = isDev()
    ? process.cwd()
    : app.getAppPath();
  return path.join(base, "assets", ...segments);
}