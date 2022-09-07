const EventEmitter = require('events');
const net = require('net');
const fs = require('fs');
const obj = new EventEmitter();


// export the EventEmitter object so others can use it
module.exports = obj;

const client = new net.Socket()

client.connect(process.env.TWITCH_IRC_PORT, process.env.TWITCH_IRC_SERVER, () => {
    client.write("CAP REQ :twitch.tv/commands twitch.tv/tags twitch.tv/membership\r\n");
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
    client.write("JOIN #artiem86\r\n");
    client.write("JOIN #handcapablesean\r\n");
    client.write("JOIN #st4nzzz\r\n");
    client.write("JOIN #digitalcorp\r\n");
    client.write("JOIN #makson7766724488\r\n");
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
    // console.log(msg);

    return msg;
}

client.on('data', (message) => {
    let msg = message.toString();

    switch (msg[0]) {
        case ':':
            // system message, now ignore it for a while
            break;

        case '@':
            // console.log("MESSAGE");
            msg = processMessage(msg);
            obj.emit('message', msg);
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

    // fs.appendFile('messages.txt', message ?? '', function (err) {
    //     if (err) return console.log(err);
    // });
});

client.on('close', () => {
    console.log('Connection closed');
});