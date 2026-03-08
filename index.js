const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 3.5; 
const DROP_SPEED = 0.05; 

// ID z Twojego API: 31815171
const CHATROOM_ID = 31815171; 
let kickSocket;

function connectToKick() {
    console.log('📡 [SYSTEM] Próba połączenia z klastrem Kick us2...');
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0');

    kickSocket.onopen = () => {
        console.log('✅ [SYSTEM] Połączono z serwerem Pusher!');
        kickSocket.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));
    };

    kickSocket.onmessage = (event) => {
        const raw = JSON.parse(event.data);
        
        // Logujemy każde zdarzenie, żeby wiedzieć, że połączenie żyje
        if (raw.event === 'App\\Events\\ChatMessageEvent') {
            const chat = JSON.parse(raw.data);
            const msg = chat.content || "";
            console.log(`💬 [LOG CZATU]: ${chat.sender.username}: ${msg}`);

            if (msg.toUpperCase().includes('KEKW')) {
                currentLevel = Math.min(100, currentLevel + KEKW_VALUE);
                console.log(`🔥 [HIT] KEKW wykryte! Nowy poziom: ${currentLevel}%`);
            }
        } else if (raw.event === 'pusher:pong') {
            // Cichy pong
        }
    };

    kickSocket.onclose = () => {
        console.log('⚠️ [SYSTEM] Kick rozłączył. Reconnect za 3s...');
        setTimeout(connectToKick, 3000);
    };
}

// Heartbeat co 20 sekund
setInterval(() => {
    if (kickSocket && kickSocket.readyState === WebSocket.OPEN) {
        kickSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
    }
}, 20000);

connectToKick();

// Wysyłanie danych do przeglądarki (OBS)
setInterval(() => {
    if (currentLevel > 0) currentLevel = Math.max(0, currentLevel - DROP_SPEED);
    
    const data = JSON.stringify({ level: currentLevel });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}, 100);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 [START] Serwer dymometru na porcie ${PORT}`);
});
