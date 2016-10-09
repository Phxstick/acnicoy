'use strict';

const { ipcMain, app, BrowserWindow } = require('electron');

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

// TODO: Remove when electron has chrome version 54
app.commandLine.appendSwitch("--enable-blink-features", "CustomElementsV1");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 1050,  // 800
      height: 600,
      icon: "./img/icon.png"
  });

  // Load the index.html of the app and execute corresponding script.
  mainWindow.loadURL(`file://${__dirname}/html/index.html`);
  mainWindow.webContents.openDevTools();
  mainWindow.webContents.executeJavaScript(`const basePath = "${__dirname}"`);
  mainWindow.webContents.executeJavaScript(
          require("fs").readFileSync(`${__dirname}/js/index.js`, "utf-8"));
  // mainWindow.setAutoHideMenuBar(true);
  // mainWindow.setMenuBarVisibility(false);
  let forceQuit = true; // TODO

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
