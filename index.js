const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const Pusher = require('pusher-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 100 / 67;
const DROP_SPEED = 5 / 60;

// POŁĄCZENIE Z KICK
const CHATROOM_ID = 31815171; 
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'mt1',
    forceTLS: true
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        const chatData = JSON.parse(data.message);
        console.log(`📩 Wiadomość od ${chatData.sender.username}: ${chatData.content}`); // To pokaże logi na Renderze

        if (chatData.content.includes('377226:KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("❌ Błąd Pushera:", err);
    }
});

setInterval(() => {
    if (currentLevel > 0) {
        currentLevel -= DROP_SPEED;
        if (currentLevel < 0) currentLevel = 0;
        broadcast({ level: currentLevel });
    }
}, 1000 / 60);

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Dymometr gotowy na porcie ${PORT}`));
