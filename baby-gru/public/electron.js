const path = require("path");
const express = require('express');
const process = require('process');

const { app, BrowserWindow } = require("electron");
const isDev = require("electron-is-dev");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Conditionally include the dev tools installer to load React Dev Tools
let installExtension, REACT_DEVELOPER_TOOLS;

if (isDev) {
  const devTools = require("electron-devtools-installer");
  installExtension = devTools.default;
  REACT_DEVELOPER_TOOLS = devTools.REACT_DEVELOPER_TOOLS;
}

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname,"..","src","icons","png","128x128.png"),
    webPreferences: {
      nodeIntegration: true
    }
  });


  if(process.argv.length>1){
      win.loadURL(process.argv[1]);
  } else {

      let server;

      if(!isDev) {

          const MINPORT = 32778;
          const MAXPORT = 32800;

          const exp = express();

          exp.use(function(req, res, next) {
              res.header("Cross-Origin-Embedder-Policy", "require-corp");
              res.header("Cross-Origin-Opener-Policy", "same-origin");
              next();
          });

          exp.use(express.static(path.join(__dirname,"..","build")));
      
          exp.get('/', (req, res) => {
              res.send('Hello World! '+path.join(__dirname,"..","build"));
          });
      
          function serve(port) {
              server = exp.listen(port, () => {
                  console.log('Listening on port:', server.address().port);
                  win.loadURL( "http://localhost:"+server.address().port+"/index.html");
              }).on('error', function(err) { 
                  if(port<MAXPORT){
                      serve(port+1);
                  } else {
                      throw new Error("Run out of ports in Moorhen's range 32778-32800");
                  }
              });
          }
          serve(MINPORT);
      } else {
          win.loadURL("http://localhost:9999");
      }


      // Open the DevTools.
      if (isDev) {
        win.webContents.openDevTools({ mode: "detach" });
      }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

