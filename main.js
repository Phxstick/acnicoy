'use strict';
const localShortcut = require("electron-localshortcut");
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

// Report crashes to our server.
// electron.crashReporter.start();

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

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // mainWindow.maximize();
  mainWindow.webContents.openDevTools();
  // mainWindow.setAutoHideMenuBar(true);
  // mainWindow.setMenuBarVisibility(false);
  let forceQuit = false;

  electron.ipcMain.on("close-now", (event) => {
      forceQuit = true;
      app.quit();
  });
  mainWindow.on('close', (event) => {
    if (!forceQuit) {
        mainWindow.send("closing-window");
        event.preventDefault();
    }
  });
  electron.ipcMain.on("close-response", () => console.log("Received respose!!"));
  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  electron.ipcMain.on("quit", () => app.quit());
  // TODO: "Object has been destroyed" error for openDevTools?
  var openDevTools = mainWindow.webContents.openDevTools;
  electron.ipcMain.on("open-debug", openDevTools);
  // electron.ipcMain.on("confirm-close-test", (event) => {
  //     const buttonIndex = electron.dialog.showMessageBox({
  //         type: "question", buttons: ["Yes", "No"], defaultId: 1,
  //         message: "Are you sure you want to cancel the test?",
  //         title: "Confirm", cancelId: 1 });
  //     event.returnValue = buttonIndex === 0;
  // });
  // electron.ipcMain.on("confirm-delete-word", (event, word) => {
  //     const buttonIndex = electron.dialog.showMessageBox({
  //         type: "question", buttons: ["Yes", "No"], defaultId: 1,
  //         message: `Are you sure you want to delete the word '${word}'?`,
  //         title: "Confirm", cancelId: 1 });
  //     event.returnValue = buttonIndex === 0;
  // });
  electron.ipcMain.on("confirm", (event, text) => {
      const buttonIndex = electron.dialog.showMessageBox({
          type: "question", buttons: ["Yes", "No"], defaultId: 1,
          message: text, title: "Confirm", cancelId: 1 });
      event.returnValue = buttonIndex === 0;
  });
  electron.ipcMain.on("shortcut", (event, shortcut, registerNew) => {
      if (registerNew) {
          localShortcut.register(mainWindow, shortcut, () => {
              event.sender.send(shortcut);
          });
      } else {
          if (localShortcut.isRegistered(mainWindow, shortcut)) {
              localShortcut.unregister(mainWindow, shortcut);
          }
      }
  });
});
