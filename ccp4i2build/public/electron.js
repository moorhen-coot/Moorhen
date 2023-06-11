const path = require("path");
const express = require('express');
const process = require('process');
const http = require('http')
const qs = require('querystring')

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
    icon: path.join(__dirname, "..", "src", "icons", "png", "128x128.png"),
    webPreferences: {
      nodeIntegration: true
    }
  });

  if (process.argv.length > 2) {
    win.loadURL(process.argv[2]);
    win.webContents.openDevTools()
  } else if (process.argv.length > 1 && process.argv[1] !== "--no-sandbox") {
    win.loadURL(process.argv[1]);
    win.webContents.openDevTools()
  } else {

    let server;

    if (!isDev) {

      const MINPORT = 32778;
      const MAXPORT = 32800;

      const exp = express();

      //Install CORS headers
      exp.use(function (req, res, next) {
        res.header("Cross-Origin-Embedder-Policy", "require-corp");
        res.header("Cross-Origin-Opener-Policy", "same-origin");
        next();
      });

      //Install error handler
      exp.use((err, req, res, next) => {
        console.log(req.url)
        console.log(err.stack)
        res.status(500).send('Something broke!')
      })

      //Catch database calls

      exp.get(/\/api/, (oreq, ores) => {
        const options = {
          // host to forward to
          host: '127.0.0.1',
          // port to forward to
          port: 43434,
          // path to forward to
          path: oreq.url,
          // request method
          method: oreq.method,
          // headers to send
          headers: oreq.headers,
        };

        const creq = http
          .request(options, pres => {

            // set encoding
            //pres.setEncoding(ores.);

            // set http status code and headersbased on proxied response
            ores.writeHead(pres.statusCode, pres.headers);

            // wait for data
            pres.on('data', chunk => {
              ores.write(chunk);
            });

            pres.on('close', () => {
              // closed, let's end client request as well
              ores.end();
            });

            pres.on('end', () => {
              // finished, let's finish client request as well
              ores.end();
            });
          })
          .on('error', e => {
            // we got an error
            console.log(e.message);
            try {
              // attempt to set error message and http status
              ores.writeHead(500);
              ores.write(e.message);
            } catch (e) {
              // ignore
            }
            ores.end();
          });

        creq.end();
      });

      //Catch root and react-router paths
      //Catch all other CCP4i2Moorhen calls
      exp.get("/", (req, res) => {
        console.log(`mapping ${req.url} to index`)
        res.sendFile(path.join(__dirname, "..", "build", "index.html"))
      });
      exp.get("/CCP4i2Moorhen", (req, res) => {
        console.log(`mapping ${req.url} to index`)
        res.sendFile(path.join(__dirname, "..", "build", "index.html"))
      });
      exp.get("/CCP4i2Moorhen/", (req, res) => {
        console.log(`mapping ${req.url} to index`)
        res.sendFile(path.join(__dirname, "..", "build", "index.html"))
      });
      exp.get(/\/CCP4i2Moorhen\/cootJob\/*/, (req, res) => {
        console.log(`mapping ${req.url} to index`)
        res.sendFile(path.join(__dirname, "..", "build", "index.html"))
      });

      //Remove the leading /CCP4i2Moorhen
      exp.use((req, res, next) => {
        if (/\/CCP4i2Moorhen\/*/.test(req.url)) {
          console.log(`Stripping /CCP4i2Moorhen from ${req.url}`)
          req.url = req.url.slice(14)
        }
        next()
      })

      //And try to serve as static
      exp.use(express.static(path.join(__dirname, "..", "build")));

      //Send 404 for all else 
      exp.use((req, res, next) => {
        console.log(req.url)
        res.status(404).send(`Sorry can't find that! ${req.url}`)
      })

      function serve(port) {
        server = exp.listen(port, () => {
          console.log('Listening on port:', server.address().port);
          win.loadURL("http://localhost:" + server.address().port + "/");
          win.webContents.openDevTools()
          //win.loadURL( "http://localhost:"+43434+"/moorhen");
        }).on('error', function (err) {
          if (port < MAXPORT) {
            serve(port + 1);
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

