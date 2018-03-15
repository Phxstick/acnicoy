'use strict';

const { ipcMain, app, BrowserWindow } = require('electron');
const path = require("path");
const url = require("url");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 1050,  // 810
      height: 600,
      icon: "./img/icon.png"
  });

  // Load the index.html of the app and execute corresponding script.
  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, "html", "index.html"),
      protocol: "file:",
      slashes: true
  }));
  mainWindow.webContents.openDevTools();
  // mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenu(null);
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

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  ipcMain.on("quit", () => app.quit());
});
