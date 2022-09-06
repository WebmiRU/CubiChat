// Modules to control application life and create native browser window
require('dotenv').config();

const {app, BrowserWindow} = require('electron')
const path = require('path')
const net = require('net');
const twitch = require('./plugins/services/twitch');
const fs = require('fs');


const client = new net.Socket()
let mainWindow = null;

client.connect(process.env.TWITCH_IRC_PORT, process.env.TWITCH_IRC_SERVER, () => {
  client.write("CAP REQ :twitch.tv/commands twitch.tv/tags\r\n");
  client.write(`PASS ${process.env.TWITCH_TOKEN}\r\n`);
  client.write(`NICK ${process.env.TWITCH_LOGIN}\r\n`);
  client.write("JOIN #ewolf34\r\n");
  client.write("JOIN #donchicko\r\n");
  client.write("JOIN #hellcat14\r\n");
  client.write("JOIN #kuluk01\r\n");
  client.write("JOIN #iateyourpie\r\n");
  client.write("JOIN #themexicanrunner\r\n");
  client.write("JOIN #s3sh\r\n");
  client.write("JOIN #nuke73\r\n");

  // twitch.on('myEvent', (v) => {
  //   console.log(v);
  // });
});

function processMessage(message) {
  message = message.split(' ');
  let re1 = /([\w-]+)\=([^;]*)/gim;
  let arr = [...message[0].matchAll(re1)];
  let msg = {
    attributes: {emotes: null},
    service: 'TWITCH',
    type: message[2],
    channel: message[3].substring(1),
    message: {
      raw: null,
      display: null,
      reading: null,
    }
  };

  message.splice(0, 4);

  arr.forEach((v) => {
    msg['attributes'][v[1]] = v[2].length ? v[2] : null;
  });

  msg.message.name = msg['attributes']['display-name'];
  msg.message.raw = message.join(' ').trim().substring(1);
  msg.message.display = message.join(' ').trim().substring(1);
  msg.message.reading = message.join(' ').trim().substring(1);

  if (msg.attributes.emotes) {
    let regexp = /([^:/]+):(\d+)-(\d+)/gmiu;
    let matches = msg.attributes.emotes.matchAll(regexp);
    let replaceText = [];

    for (let v of matches) {
      replaceText.push({
        text: msg.message.display.substring(parseInt(v[2]), parseInt(v[3]) + 1),
        smileId: v[1],
      });
    }

    for (let v of replaceText) { // Замена смайлов на картинки
      msg.message.display = msg.message.display.replaceAll(v.text, '<img src="https://static-cdn.jtvnw.net/emoticons/v2/' + v.smileId + '/default/dark/1.0" />');
    }
  }


  console.log(msg);

  return msg;
}

client.on('data', function (message) {
  let msg = message.toString();

  switch (msg[0]) {
    case ':':
      // system message, now ignore it for a while
      break;

    case '@':
      console.log("MESSAGE");
      msg = processMessage(msg);
      mainWindow.webContents.send('message', msg);
      break;

    default:
      let command = msg.split(' ');

      switch (command[0].toUpperCase()) {
        case 'PING':
          client.write('PONG ' + command[1]);
          console.log('PONG');
          break;
      }
  }

  fs.appendFile('messages.txt', message ?? '', function (err) {
    if (err) return console.log(err);
  });
});

client.on('close', function () {
  console.log('Connection closed');
});

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  setInterval(() => {
    // mainWindow.webContents.send('message', 'hello world');
  }, 1000);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
