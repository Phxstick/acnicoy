'use strict';

const { ipcMain, app, BrowserWindow, session } = require('electron');
const path = require("path");
const url = require("url");
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
    mainWindow = new BrowserWindow({
        // Don't set width/height here, hide application menu first
        // Minimum width/height here don't respect "useContentSize"
        backgroundColor: "#800000",  // maroon (set as BG of "loading-window")
        icon: "./img/icon.png",
        show: false
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
        if (mainWindowState.isMaximized) mainWindow.maximize();
        if (mainWindowState.isFullScreen) mainWindow.setFullScreen(true);
        mainWindow.setContentBounds(mainWindowState);
    } else {
        mainWindowState = {};
        mainWindow.setContentSize(755, 465);
    }

    // Save changes to window state (based on package "electron-window-state")
    let stateChangeTimer;
    const updateState = () => {
        if (!mainWindow) return;
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()
                && !mainWindow.isFullScreen()) {  // TODO: Replace with isNormal
            const contentBounds = mainWindow.getContentBounds();
            mainWindowState.x = contentBounds.x;
            mainWindowState.y = contentBounds.y;
            mainWindowState.width = contentBounds.width;
            mainWindowState.height = contentBounds.height;
        }
        mainWindowState.isMaximized = mainWindow.isMaximized();
        mainWindowState.isFullScreen = mainWindow.isFullScreen();
        const devToolsOpened = mainWindow.webContents.isDevToolsOpened();
        mainWindowState.isDevToolsOpened = devToolsOpened;
        storage.set("windowState", mainWindowState);
    };
    const stateChangeHandler = () => {
        clearTimeout(stateChangeTimer);
        stateChangeTimer = setTimeout(updateState, 1000);
    }
    mainWindow.on("resize", stateChangeHandler);
    mainWindow.on("move", stateChangeHandler);
    mainWindow.on("close", updateState);
    mainWindow.on("closed", () => clearTimeout(stateChangeTimer));
  
    // Content Security Policy: don't allow loading anything at all.
    // session.defaultSession.webRequest.onHeadersReceived((details, callback)=>{
    //     callback({ responseHeaders: "default-src 'self'" });
    // });
  
    // Load the index.html of the app and execute corresponding script.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "html", "index.html"),
        protocol: "file:",
        slashes: true
    }));
    let forceQuit = true;
  
    // Allow mainWindow to control when the app gets closed
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
  
    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
    });
    ipcMain.on("quit", () => app.quit());
});
