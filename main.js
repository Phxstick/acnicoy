'use strict';

const { ipcMain, app, BrowserWindow, session } = require('electron');
const path = require("path");
const url = require("url");
const fs = require("fs");
const storage = require("electron-settings");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Make sure only a single instance of this program is running
const lockAcquired = app.requestSingleInstanceLock();
if (!lockAcquired) {
    app.quit();
    process.exit();
}
app.on("second-instance", (event, argv, workingDirectory) => {
    if (mainWindow !== undefined) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
      app.quit();
    }
});


app.on('ready', function() {

    // Get active color scheme (or take default if settings not yet initialized)
    // Also get flag for whether the window should be frameless
    let makeWindowFrameless = false;
    let colorScheme = "default";
    const colorSchemesInfo =
        require(path.resolve(__dirname, "data", "general-color-schemes.json"));
    if (storage.has("data-path")) {
        const dataPath = storage.get("data-path");
        const settingsPath = path.resolve(dataPath, "settings.json");
        if (fs.existsSync(settingsPath)) {
            const settings = require(settingsPath);
            if (settings.hasOwnProperty("design") &&
                    settings.design.hasOwnProperty("colorScheme") &&
                    settings.design.colorScheme in colorSchemesInfo) {
                colorScheme = settings.design.colorScheme;
            }
            if (settings.hasOwnProperty("general") &&
                    settings.general.hasOwnProperty("makeWindowFrameless")) {
                makeWindowFrameless = settings.general.makeWindowFrameless;
            }
        }
    }

    // Initialize app window
    mainWindow = new BrowserWindow({
        // Don't set width/height here, hide application menu first
        // Minimum width/height here don't respect "useContentSize"
        backgroundColor: colorSchemesInfo[colorScheme].loadBg,
        webPreferences: {
            nodeIntegration: true,
        },
        icon: "./img/icon.png",
        show: false,
        frame: !makeWindowFrameless
    });
    mainWindow.setMenu(null);  // Must do it here to set dimensions correctly

    // Set minimum dimensions (taking size of frame around window into account)
    const windowSize = mainWindow.getSize();
    const contentSize = mainWindow.getContentSize();
    const frameWidth = windowSize[0] - contentSize[0];
    const frameHeight = windowSize[1] - contentSize[1];
    mainWindow.setMinimumSize(600 + frameWidth, 465 + frameHeight);

    // Load window state or set default values
    let mainWindowState = storage.get("windowState");
    if (mainWindowState) {
        mainWindow.setContentBounds(mainWindowState);
        if (mainWindowState.isMaximized) mainWindow.maximize();
        if (mainWindowState.isFullScreen) mainWindow.setFullScreen(true);
    } else {
        mainWindowState = {};
        mainWindow.setContentSize(755, 465);
    }

    // Save changes to window state (based on package "electron-window-state")
    let stateChangeTimer;
    const updateState = () => {
        if (!mainWindow) return;
        if (mainWindow.isNormal()) {
            const contentBounds = mainWindow.getContentBounds();
            mainWindowState.x = contentBounds.x;
            mainWindowState.y = contentBounds.y;
            mainWindowState.width = contentBounds.width;
            mainWindowState.height = contentBounds.height;
        }
        mainWindowState.isMaximized = mainWindow.isMaximized();
        mainWindowState.isFullScreen = mainWindow.isFullScreen();
        storage.set("windowState", mainWindowState);
    };
    const stateChangeHandler = () => {
        clearTimeout(stateChangeTimer);
        stateChangeTimer = setTimeout(updateState, 1000);
    }
    // Workaround on Linux for https://github.com/electron/electron/issues/10388
    mainWindow.once("move", () => {
        let x = mainWindowState.x;
        let y = mainWindowState.y;
        const wrongBounds = mainWindow.getContentBounds();
        x -= wrongBounds.x - x;
        y -= wrongBounds.y - y;
        if ("width" in mainWindowState && "height" in mainWindowState)
            mainWindow.setContentBounds({ x, y,
                width: mainWindowState.width, height: mainWindowState.height });
    });
    mainWindow.on("resize", stateChangeHandler);
    mainWindow.on("move", stateChangeHandler);
    mainWindow.on("close", updateState);
    mainWindow.on("closed", () => clearTimeout(stateChangeTimer));

    // Handle dev tools separately using its corresponding events
    mainWindow.webContents.on("devtools-opened", () => {
        mainWindowState.isDevToolsOpened = true;
        storage.set("windowState.isDevToolsOpened", true)
    });
    mainWindow.webContents.on("devtools-closed", () => {
        mainWindowState.isDevToolsOpened = false;
        storage.set("windowState.isDevToolsOpened", false);
    });
  
    // Content Security Policy: don't allow loading anything at all.
    // session.defaultSession.webRequest.onHeadersReceived((details, callback)=>{
    //     callback({ responseHeaders: "default-src 'self'" });
    // });
  
    // Load the index.html of the app which also executes the main script
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "html", "index.html"),
        protocol: "file:",
        slashes: true
    }));
  
    // Allow mainWindow to control when the app gets closed
    let forceQuit = true;
    ipcMain.on("activate-controlled-closing", (event) => {
        forceQuit = false;
    });
    ipcMain.on("deactivate-controlled-closing", (event) => {
        forceQuit = true;
    });
    ipcMain.on("close-now", (event) => {
        forceQuit = true;
        app.quit();
    });
    mainWindow.on('close', (event) => {
      if (!forceQuit) {
          mainWindow.send("closing-window");
          event.preventDefault();
      }
    });

    mainWindow.on("ready-to-show", () => {
        if (mainWindowState.isDevToolsOpened)
            mainWindow.webContents.openDevTools();
        mainWindow.show();
        mainWindow.focus();
    });
  
    mainWindow.on('closed', function() {
      mainWindow = null;
    });
    ipcMain.on("quit", () => app.quit());
    ipcMain.on("relaunch", () => {
        app.relaunch();
        app.quit();
    });
});
