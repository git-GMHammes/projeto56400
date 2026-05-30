const express = require('express');
const http    = require('http');
const { WebSocketServer } = require('ws');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.WS_PORT || 3000;

// Endpoint interno usado pelo PHP para disparar broadcast
app.use(express.json());
app.post('/internal/broadcast', (req, res) => {
    const payload = req.body;
    if (!payload || !payload.username || !payload.message) {
        return res.status(400).json({ error: 'Campos obrigatorios: username, message' });
    }
    broadcast(payload);
    res.json({ ok: true, clients: wss.clients.size });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', clients: wss.clients.size }));

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] Cliente conectado: ${ip} | total: ${wss.clients.size}`);

    ws.on('close', () => {
        console.log(`[WS] Cliente desconectado | total: ${wss.clients.size}`);
    });

    ws.on('error', (err) => {
        console.error('[WS] Erro no cliente:', err.message);
    });
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(msg);
        }
    });
}

server.listen(PORT, () => {
    console.log(`[WS] Servidor rodando na porta ${PORT}`);
});
