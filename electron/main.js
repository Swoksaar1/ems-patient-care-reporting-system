const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

let backendProcess = null;
const isDev = !app.isPackaged;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileIfMissing(src, dest) {
  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function copyDirIfMissing(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirIfMissing(src, dest);
    } else if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

function startBackend() {
  const projectRoot = path.join(__dirname, "..");

  let command;
  let args = [];
  let cwd;
  let backendEnv = { ...process.env };

  if (isDev) {
    // Development mode
    command = path.join(projectRoot, "venv", "Scripts", "python.exe");
    args = ["manage.py", "runserver", "127.0.0.1:8000", "--noreload"];
    cwd = projectRoot;

    if (!fs.existsSync(command)) {
      dialog.showErrorBox(
        "Backend Error",
        `Python not found:\n${command}\n\nMake sure your virtual environment exists (venv).`
      );
      return;
    }

    // In dev, use project db/media
    backendEnv.EMS_DB_PATH = path.join(projectRoot, "db.sqlite3");
    backendEnv.EMS_MEDIA_ROOT = path.join(projectRoot, "media");
  } else {
    // Packaged mode
    command = path.join(process.resourcesPath, "backend", "ems_backend.exe");

    if (!fs.existsSync(command)) {
      dialog.showErrorBox(
        "Backend Error",
        `Could not find backend executable:\n${command}\n\nPlease reinstall the app or rebuild the installer.`
      );
      return;
    }

    // ✅ Use writable userData folder for runtime DB/media
    const userDataPath = app.getPath("userData");
    const runtimeDataDir = path.join(userDataPath, "runtime");
    const runtimeMediaDir = path.join(runtimeDataDir, "media");
    const runtimeDbPath = path.join(runtimeDataDir, "db.sqlite3");

    ensureDir(runtimeDataDir);
    ensureDir(runtimeMediaDir);

    // Bundled seed files (read-only source)
    const bundledDbPath = path.join(process.resourcesPath, "db.sqlite3");
    const bundledMediaDir = path.join(process.resourcesPath, "media");

    // Copy initial DB/media only if missing
    copyFileIfMissing(bundledDbPath, runtimeDbPath);
    copyDirIfMissing(bundledMediaDir, runtimeMediaDir);

    // Run backend from resources (so bundled code/imports resolve)
    cwd = process.resourcesPath;

    // ✅ Pass writable paths to backend
    backendEnv.EMS_DB_PATH = runtimeDbPath;
    backendEnv.EMS_MEDIA_ROOT = runtimeMediaDir;

    console.log("[Backend] resourcesPath:", process.resourcesPath);
    console.log("[Backend] userDataPath:", userDataPath);
    console.log("[Backend] runtimeDbPath:", runtimeDbPath);
    console.log("[Backend] runtimeMediaDir:", runtimeMediaDir);
  }

  console.log("[Backend] Starting:", command, args.join(" "));
  console.log("[Backend] CWD:", cwd);

  backendProcess = spawn(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
    env: backendEnv,
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on("data", (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on("data", (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });
  }

  backendProcess.on("error", (err) => {
    console.error("[Backend Spawn Error]", err);
    dialog.showErrorBox("Backend Spawn Error", err.message || String(err));
  });

  backendProcess.on("close", (code) => {
    console.log(`[Backend] exited with code ${code}`);
    backendProcess = null;
  });
}

function waitForBackend(url, timeoutMs = 20000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Backend did not start in time."));
        } else {
          setTimeout(tryConnect, 500);
        }
      });

      req.setTimeout(3000, () => req.destroy());
    };

    tryConnect();
  });
}

function createWindow() {
  const indexPath = path.join(__dirname, "..", "frontend", "build", "index.html");
  const iconPath = path.join(__dirname, "icon.ico");

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (fs.existsSync(iconPath)) {
    win.setIcon(iconPath);
  }

  win.setMenuBarVisibility(false);

  win.loadFile(indexPath).catch((err) => {
    console.error("[Electron] Failed to load UI file:", err);
    dialog.showErrorBox(
      "UI Load Error",
      `Could not load frontend build.\n\nExpected file:\n${indexPath}\n\nMake sure you ran:\n1) cd frontend && npm run build\n2) npm run dist-win`
    );
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

function killBackend() {
  if (!backendProcess) return;
  try {
    backendProcess.kill();
  } catch (e) {
    console.warn("[Backend] Failed to kill backend process:", e.message);
  } finally {
    backendProcess = null;
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  startBackend();

  try {
    await waitForBackend("http://127.0.0.1:8000/admin/", 25000);
    console.log("[Backend] Ready");
  } catch (e) {
    console.warn("[Backend] Warning:", e.message);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", killBackend);
app.on("will-quit", killBackend);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});