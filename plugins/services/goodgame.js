const EventEmitter = require('events');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const https = require('https');
const WebSocketClient = require('websocket').client;

const obj = new EventEmitter();
const db = new sqlite3.Database('./db.sqlite');

let smiles = {};

db.run("CREATE TABLE IF NOT EXISTS goodgame_smile (id INTEGER, channel_id INTEGER, code TEXT, animated INTEGER, img TEXT, img_gif TEXT)", () => {
    db.get("SELECT COUNT(*) AS count FROM goodgame_smile", (err, row) => {
        if (!row.count) {
            https.get('https://static.goodgame.ru/js/minified/global.js', (resp) => {
                let data = '';

                resp.on('data', (chunk) => {
                    data += chunk;
                });

                resp.on('end', () => {
                    let globalSmilesRe = /{Smiles\s?:(\[.+?\])/gims;
                    let channelSmilesRe = /Channel_Smiles\s?\:({.+?\}\]})/gims;
                    let globalSmiles = JSON.parse(globalSmilesRe.exec(data)[1]);
                    let channelSmiles = JSON.parse(channelSmilesRe.exec(data)[1]);

                    const stmt = db.prepare("INSERT INTO goodgame_smile (id, channel_id, code, animated, img, img_gif) VALUES (?, ?, ?, ?, ?, ?)");
                    globalSmiles.forEach((v) => {
                        stmt.run(v.id, v.channel_id, v.name, v.animated, v.img_big, v.img_gif);
                    });

                    Object.keys(channelSmiles).forEach((key) => {
                        channelSmiles[key].forEach((v) => {
                            stmt.run(v.id, v.channel_id, v.name, v.animated, v.img_big, v.img_gif);
                        })
                    });
                    stmt.finalize();

                    loadSmiles();
                });
            }).on('error', (err) => {
                console.log('Error: ' + err.message);
            });
        } else {
            loadSmiles();
        }
    });
});

function loadSmiles() {
    db.each("SELECT * FROM goodgame_smile", (err, row) => {
        if (row.animated) {
            smiles[row.code] = row.img_gif;
        } else {
            smiles[row.code] = row.img;
        }
    });
}

// db.close();


function process_message(message) {
    let smileRegexp = /:(\S+):/gims;
    let msg = {message: {}};

    message = JSON.parse(message);

    switch (message.type) {
        case 'message': // Chat message (public)
            let text = message.data.text;
            let matches = [...text.matchAll(smileRegexp)];

            // Если смайл есть в списке на замену
            matches.forEach((v) => { // v[0] = :smile:, v[1] = smile
                if (smiles[v[1]] ?? false) {
                    text = text.replace(v[0], `<img src="${smiles[v[1]]}" />`);
                }
            });

            msg.message.name = message.data.user_name;
            msg.message.raw = message.data.text;
            msg.message.display = text;
            msg.message.reading = message.data.text;

            return msg;

            break;
    }
}

module.exports = obj;

const client = new WebSocketClient();
let con = null;

function channelJoin(login) {
    https.get(`https://goodgame.ru/api/getchannelstatus?id=${login}&fmt=json`, (resp) => {
        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            let streamId = parseInt(Object.keys(JSON.parse(data))[0]);

            if (streamId && con?.connected) {
                con.sendUTF(JSON.stringify({
                    type: 'join',
                    data: {
                        channel_id: streamId,
                        hidden: false,
                    }
                }));
            } else {
                console.log('Getting channel ID error');
            }
        });

    }).on('error', (err) => {
        console.log('Error: ' + err.message);
    });
}

// console.log(getChannelId(process.env.GOODGAME_LOGIN));

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', (connection) => {
    con = connection;

    channelJoin(process.env.GOODGAME_LOGIN);

    // connection.sendUTF(JSON.stringify({
    //     type: 'join',
    //     data: {
    //         channel_id: getChannelId(process.env.GOODGAME_LOGIN),
    //         hidden: false,
    //     }
    // }));

    console.log('WebSocket Client Connected');
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            let msg = process_message(message.utf8Data);
            obj.emit('message', msg);

            console.log("Received: " + message.utf8Data);
        }
    });
});

client.connect('wss://chat.goodgame.ru/chat/websocket');
