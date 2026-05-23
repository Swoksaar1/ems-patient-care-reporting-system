const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const { spawn, execFile } = require("child_process");
const http = require("http");
const fs = require("fs");

let backendProcess = null;
let isQuitting = false;

const isDev = !app.isPackaged;

const APP_TITLE = "EMS Patient Care Reporting System";
const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = "8000";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileIfMissing(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dest)) return;

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
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

function getProjectRoot() {
  return path.join(__dirname, "..");
}

function getLiveDataDir() {
  if (isDev) {
    return getProjectRoot();
  }

  return app.getPath("userData");
}

function getLiveDbPath() {
  return path.join(getLiveDataDir(), "db.sqlite3");
}

function getLiveMediaRoot() {
  return path.join(getLiveDataDir(), "media");
}

function prepareLiveStorage() {
  const liveDbPath = getLiveDbPath();
  const liveMediaRoot = getLiveMediaRoot();

  ensureDir(path.dirname(liveDbPath));
  ensureDir(liveMediaRoot);

  if (!isDev) {
    const seedDbPath = path.join(process.resourcesPath, "seed", "db.sqlite3");
    const seedMediaDir = path.join(process.resourcesPath, "seed", "media");

    copyFileIfMissing(seedDbPath, liveDbPath);
    copyDirIfMissing(seedMediaDir, liveMediaRoot);
  }

  return {
    liveDbPath,
    liveMediaRoot,
  };
}

function getBackendExecutablePath() {
  if (isDev) {
    return path.join(getProjectRoot(), "dist", "ems_backend.exe");
  }

  return path.join(process.resourcesPath, "backend", "ems_backend.exe");
}

function getFrontendIndexPath() {
  if (isDev) {
    return path.join(getProjectRoot(), "frontend", "build", "index.html");
  }

  const extraResourcesPath = path.join(
    process.resourcesPath,
    "frontend",
    "build",
    "index.html"
  );

  const asarPath = path.join(
    process.resourcesPath,
    "app.asar",
    "frontend",
    "build",
    "index.html"
  );

  if (fs.existsSync(extraResourcesPath)) {
    return extraResourcesPath;
  }

  return asarPath;
}

function getIconPath() {
  if (isDev) {
    return path.join(getProjectRoot(), "electron", "icon.ico");
  }

  const extraResourcesIcon = path.join(
    process.resourcesPath,
    "electron",
    "icon.ico"
  );

  const asarIcon = path.join(
    process.resourcesPath,
    "app.asar",
    "electron",
    "icon.ico"
  );

  if (fs.existsSync(extraResourcesIcon)) {
    return extraResourcesIcon;
  }

  return asarIcon;
}

function getPythonPath() {
  const projectRoot = getProjectRoot();
  const venvPython = path.join(projectRoot, "venv", "Scripts", "python.exe");

  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  return "python";
}

function startBackend() {
  const projectRoot = getProjectRoot();
  const { liveDbPath, liveMediaRoot } = prepareLiveStorage();

  let command;
  let args = [];
  let cwd;

  const backendEnv = {
    ...process.env,
    DJANGO_DEBUG: isDev ? "True" : "False",
    EMS_DB_PATH: liveDbPath,
    EMS_MEDIA_ROOT: liveMediaRoot,
    PYTHONUNBUFFERED: "1",
  };

  if (isDev) {
    command = getPythonPath();
    args = [
      "manage.py",
      "runserver",
      `${BACKEND_HOST}:${BACKEND_PORT}`,
      "--noreload",
    ];
    cwd = projectRoot;

    if (!fs.existsSync(command) && command !== "python") {
      dialog.showErrorBox(
        "Backend Error",
        `Python not found:\n${command}\n\nMake sure your virtual environment exists.`
      );
      return;
    }
  } else {
    command = getBackendExecutablePath();
    args = [];
    cwd = path.dirname(command);

    if (!fs.existsSync(command)) {
      dialog.showErrorBox(
        "Backend Error",
        `Could not find backend executable:\n${command}\n\nPlease rebuild the installer.`
      );
      return;
    }
  }

  console.log("[Backend] Starting:", command, args.join(" "));
  console.log("[Backend] CWD:", cwd);
  console.log("[Backend] LIVE DB:", liveDbPath);
  console.log("[Backend] LIVE MEDIA:", liveMediaRoot);
  console.log("[Backend] resourcesPath:", process.resourcesPath);
  console.log("[Backend] liveDataDir:", getLiveDataDir());

  backendProcess = spawn(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
    detached: false,
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

function waitForBackend(url, timeoutMs = 25000) {
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

      req.setTimeout(3000, () => {
        req.destroy();
      });
    };

    tryConnect();
  });
}

function createWindow() {
  const indexPath = getFrontendIndexPath();
  const iconPath = getIconPath();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: APP_TITLE,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: "#07111f",
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

  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath).catch((err) => {
      console.error("[Electron] Failed to load UI file:", err);
      dialog.showErrorBox(
        "UI Load Error",
        `Could not load frontend build.\n\nExpected file:\n${indexPath}`
      );
    });
  } else {
    win.loadURL(
      `data:text/html;charset=utf-8,
      <html>
        <body style="font-family: Arial; padding: 30px; background: #0f172a; color: white;">
          <h2>Frontend build not found</h2>
          <p>${indexPath}</p>
          <p>Run: npm run dist:win</p>
        </body>
      </html>`
    );
  }

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

function forceKillBackendByName(callback) {
  if (process.platform !== "win32") {
    if (callback) callback();
    return;
  }

  execFile(
    "taskkill",
    ["/IM", "ems_backend.exe", "/T", "/F"],
    { windowsHide: true },
    (error, stdout, stderr) => {
      if (error) {
        console.warn(
          "[Backend] taskkill warning:",
          error.message,
          stdout || "",
          stderr || ""
        );
      } else {
        console.log("[Backend] taskkill success:", stdout || "terminated");
      }

      if (callback) callback();
    }
  );
}

function killBackend() {
  if (isQuitting) return;
  isQuitting = true;

  const finish = () => {
    backendProcess = null;
  };

  if (backendProcess) {
    try {
      if (process.platform === "win32") {
        forceKillBackendByName(finish);
      } else {
        backendProcess.kill("SIGTERM");
        finish();
      }
    } catch (e) {
      console.warn("[Backend] Failed to kill backend process:", e.message);

      if (process.platform === "win32") {
        forceKillBackendByName(finish);
      } else {
        finish();
      }
    }
  } else {
    if (process.platform === "win32") {
      forceKillBackendByName(finish);
    } else {
      finish();
    }
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  startBackend();

  try {
    await waitForBackend(`http://${BACKEND_HOST}:${BACKEND_PORT}/admin/`, 25000);
    console.log("[Backend] Ready");
  } catch (e) {
    console.warn("[Backend] Warning:", e.message);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  killBackend();
});

app.on("will-quit", () => {
  killBackend();
});

app.on("quit", () => {
  killBackend();
});

app.on("window-all-closed", () => {
  killBackend();

  if (process.platform !== "darwin") {
    app.quit();
  }
});