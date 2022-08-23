const EventEmitter = require('events');
const net = require('net');
const obj = new EventEmitter();


// export the EventEmitter object so others can use it
module.exports = obj;

// other code in the module that does something to trigger events
// this is just one example using a timer
setInterval(() => {
    obj.emit('myEvent', {hello: 'world', index: 2});
}, 1000);