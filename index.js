const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serwowanie plików statycznych z głównego folderu
app.use(express.static(__dirname));

let currentLevel = 0; 
const MAX_LEVEL = 100;
const KEKW_VALUE = 100 / 67; // 67 KEKW do pełna
const DROP_SPEED = 5 / 60;   // Spadek 5% na sekundę

// Pętla płynności (60 FPS)
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

// GŁÓWNA LOGIKA WYKRYWANIA EMOTKI
function handleChatMessage(content) {
    // Szukamy Twojej konkretnej emotki
    if (content.includes('377226:KEKW')) {
        currentLevel += KEKW_VALUE;
        
        let effect = false;
        if (currentLevel >= MAX_LEVEL) {
            currentLevel = MAX_LEVEL;
            effect = true;
            console.log("💥 POZIOM MAX!");
        }

        console.log(`🔥 KEKW złapane! Poziom: ${currentLevel.toFixed(1)}%`);
        broadcast({ level: currentLevel, triggerEffect: effect });
    }
}

// --- TUTAJ WSTAW SWOJE POŁĄCZENIE Z KICKIEM ---
// Upewnij się, że Twój bot przesyła treść wiadomości do handleChatMessage(wiadomosc);
// ----------------------------------------------

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ level: currentLevel }));
});

// KLUCZOWE DLA RENDERA: dynamiczny port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serwer dymometru działa na porcie ${PORT}`);
});
