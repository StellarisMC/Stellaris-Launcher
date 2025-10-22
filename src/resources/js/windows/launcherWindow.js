"use strict";

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const os = require("os");

const OptionWindow = require("./childs/optionWindow.js");
const TfaWindow = require("./childs/tfaWindow.js");

let isDev = process.env.NODE_ENV === "dev";
let mainWindow = undefined;

function getWindow() {
  return mainWindow;
}

function destroyWindow() {
  if (mainWindow) {
    app.quit();
    mainWindow = undefined;
  }
}

function createWindow() {
  destroyWindow();

  const iconExtension = os.platform() === "win32" ? "ico" : "png";

  mainWindow = new BrowserWindow({
    title: "Stellaris - Launcher",
    width: 450,
    height: 650,
    resizable: false,
    useContentSize: true,
    icon: "./src/resources/images/icons/icon." + iconExtension,
    frame: false,
    show: false,
    roundedCorners: true,
    transparent: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.setMenuBarVisibility(false);

  mainWindow.setBounds({ x: 0, y: 0, width: 450, height: 650 });
  mainWindow.center();

  mainWindow.loadFile(
    path.join(`${app.getAppPath()}/src/frames/launcher.html`)
  );

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      if (isDev) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }

      OptionWindow.createWindow();
      TfaWindow.createWindow();
      mainWindow.show();
    }
  });

  // Clean up and destroy any pre-loaded windows when the main window is closed.
  mainWindow.on("close", () => {
    TfaWindow.destroyWindow();
    OptionWindow.destroyWindow();
  });
}

function minimizeWindow() {
  if (mainWindow) {
    mainWindow.minimize();
  }
}

function closeWindow() {
  if (mainWindow) {
    mainWindow.close();
  }
}

/* TFA */
ipcMain.handle("require-tfa", async (event, credentials) => {
  const tfaWindow = TfaWindow.showWindow();

  const code = await new Promise((resolve) => {
    tfaWindow.on("closed", () => closeWindow());
    tfaWindow.on("hide", () => closeWindow());

    function closeWindow() {
      ipcMain.removeListener("tfa-confirm", tfaConfirmListener);
      resolve(null);
    }

    const tfaConfirmListener = (event, receivedCode) => {
      resolve(receivedCode);
      TfaWindow.hideWindow();
    };

    ipcMain.once("tfa-confirm", tfaConfirmListener);
  });

  if (!code || code.trim() === "") {
    return { error: true, message: "Le code n'a pas été fourni." };
  }

  return { error: false, code: code };
});
/* TFA */

/* Options */
ipcMain.on("show-options", () => {
  OptionWindow.showWindow();
});

ipcMain.on("hide-options", () => OptionWindow.hideWindow());
/* Options */

ipcMain.on("main-window-close", () => {
  closeWindow();
});

ipcMain.on("main-window-minimize", () => {
  minimizeWindow();
});

module.exports = { getWindow, createWindow, destroyWindow };
