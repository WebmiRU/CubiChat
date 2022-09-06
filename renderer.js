// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

let messages = document.getElementById('messages');
let message = document.querySelector('.message');

window.electronAPI.onMessage((_ev, v) => {
    let msg = message.cloneNode(true);

    msg.innerHTML = msg.innerHTML.replace('{{name}}', v.message.name);
    msg.innerHTML = msg.innerHTML.replace('{{text}}', v.message.display);

    // console.log(v);
    // messages.innerHTML += `<div>[${v.message.name}]: ${v.message.display}</div>`;

    messages.append(msg);

    // create an Observer instance
    const resizeObserver = new ResizeObserver(entries => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    // start observing a DOM node
    resizeObserver.observe(document.body)
})