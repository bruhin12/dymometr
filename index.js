const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 2.5; 
const DROP_SPEED = 0.05; 

// ID z Twojego screena: 31815171
const CHATROOM_ID = 31815171; 
let kickSocket;

function connectToKick() {
    // Łączymy się bezpośrednio z klastrem us2, którego używa Kick
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0');

    kickSocket.onopen = () => {
        console.log('🔌 Połączono z Kick!');
        // Subskrypcja czatu
        kickSocket.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));
        
        // Heartbeat (Ping), żeby Render nas nie rozłączył
        setInterval(() => {
            if (kickSocket.readyState === WebSocket.OPEN) {
                kickSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
            }
        }, 20000);
    };

    kickSocket.onmessage = (event) => {
        const raw = JSON.parse(event.data);
        if (raw.event === 'App\\Events\\ChatMessageEvent') {
            const chat = JSON.parse(raw.data);
            const msg = chat.content || "";
            
            console.log(`💬 [CZAT]: ${msg}`);

            // Sprawdzamy czy w wiadomości jest KEKW (tekst lub emotka)
            if (msg.toUpperCase().includes('KEKW')) {
                currentLevel = Math.min(100, currentLevel + KEKW_VALUE);
                broadcast({ level: currentLevel });
            }
        }
    };

    kickSocket.onclose = () => setTimeout(connectToKick, 5000);
}

connectToKick();

// Pętla spadku dymu
setInterval(() => {
    if (currentLevel > 0) currentLevel -= DROP_SPEED;
    broadcast({ level: currentLevel });
}, 100);

function broadcast(data) {
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(data));
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Serwer ruszył na porcie ${PORT}`));
