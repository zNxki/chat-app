import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

interface Client {
    ws: WebSocket;
    username: string;
    room: number;
    color: string;
}

const clients = new Map<WebSocket, Client>();

export function createWss(port: number): WebSocketServer {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws) => {
        logger.info('WebSocket client connected.');

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                if (msg.type === 'join') {
                    clients.set(ws, {
                        ws,
                        username: msg.username,
                        room: msg.room ?? 1,
                        color: msg.color ?? '#8ec547'
                    });

                    broadcast({ type: 'online', users: getOnlineUsers(msg.room ?? 1) }, msg.room ?? 1);
                    logger.info(`${msg.username} joined room ${msg.room}`);
                }
            } catch {
                logger.error('Invalid WS message');
            }
        });

        ws.on('close', () => {
            const client = clients.get(ws);
            if (!client) return;

            const room = client.room;
            clients.delete(ws);
            broadcast({ type: 'online', users: getOnlineUsers(room) }, room);
            logger.info(`${client.username} disconnected`);
        });
    });

    logger.info(`WebSocket server on ws://localhost:${port}`)
    return wss;
}

export function broadcast(data: object, roomId: number): void {
    const payload = JSON.stringify(data);

    for (const [ws, client] of clients) {
        if (client.room === roomId && ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

export function getOnlineUsers(roomId: number): string[] {
    return Array.from(clients.values())
        .filter(c => c.room === roomId)
        .map(c => c.username);
}