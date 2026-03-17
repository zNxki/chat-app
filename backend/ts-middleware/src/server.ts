import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import { logger } from './logger';
import { cache } from './cache';
import { isBanned, moderateText, banUser, unbanUser, getBannedList } from './moderation';
import { createWss, broadcast } from './websocket';
import fs from 'fs';
import path from 'path';

const app = express();
const PHP = 'http://localhost:8080';
const LOG_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Forward auth header
function authHeader(req: Request) {
    return { headers: { Authorization: req.headers.authorization ?? '' } };
}

// --- AUTH ---
app.post('/auth/:action', async (req: Request, res: Response) => {
    try {
        const { data } = await axios.post(`${PHP}/auth/${req.params.action}`, req.body);
        res.json(data);
    } catch (e: any) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'errore auth' });
    }
});

// --- ROOMS ---
app.get('/rooms', async (_req: Request, res: Response) => {
    const cached = cache.get<object[]>('rooms');
    if (cached) return res.json(cached);
    try {
        const { data } = await axios.get(`${PHP}/rooms`);
        cache.set('rooms', data, 10000);
        res.json(data);
    } catch {
        res.status(500).json({ error: 'errore rooms' });
    }
});

app.post('/rooms', async (req: Request, res: Response) => {
    try {
        const { data } = await axios.post(`${PHP}/rooms`, req.body, authHeader(req));
        cache.invalidate('rooms');
        res.status(201).json(data);
    } catch (e: any) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'errore' });
    }
});

// --- MESSAGES ---
app.get('/messages', async (req: Request, res: Response) => {
    const room = req.query.room ?? '1';
    const key = `messages:${room}`;
    const cached = cache.get<object[]>(key);
    if (cached) return res.json(cached);
    try {
        const { data } = await axios.get(`${PHP}/messages?room=${room}`);
        cache.set(key, data, 2000);
        res.json(data);
    } catch {
        res.status(500).json({ error: 'errore messaggi' });
    }
});

app.post('/messages', async (req: Request, res: Response) => {
    const { username, text, room = 1 } = req.body;

    if (isBanned(username)) {
        return res.status(403).json({ error: 'sei bannato' });
    }

    const mod = moderateText(text, username);
    if (!mod.ok) {
        return res.status(400).json({ error: mod.reason });
    }

    try {
        const { data } = await axios.post(
            `${PHP}/messages?room=${room}`,
            req.body,
            authHeader(req)
        );
        cache.invalidate(`messages:${room}`);
        broadcast({ type: 'message', message: data }, room);
        res.status(201).json(data);
    } catch (e: any) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'errore' });
    }
});

app.delete('/messages/:id', async (req: Request, res: Response) => {
    try {
        const { data } = await axios.delete(`${PHP}/messages/${req.params.id}`, authHeader(req));
        cache.invalidate('messages:');
        broadcast({ type: 'delete', id: parseInt(String(req.params.id)) }, 1);
        res.json(data);
    } catch (e: any) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'errore' });
    }
});

// --- REACTIONS ---
app.post('/reactions/:id', async (req: Request, res: Response) => {
    try {
        const { data } = await axios.post(
            `${PHP}/reactions/${req.params.id}`,
            req.body,
            authHeader(req)
        );
        cache.invalidate('messages:');
        broadcast({ type: 'reaction', messageId: parseInt(String(req.params.id)) }, req.body.room ?? 1);
        res.json(data);
    } catch (e: any) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'errore' });
    }
});

// --- MODERATION ---
app.post('/mod/ban', (req: Request, res: Response) => {
    banUser(req.body.username);
    res.json({ banned: req.body.username });
});
app.post('/mod/unban', (req: Request, res: Response) => {
    unbanUser(req.body.username);
    res.json({ unbanned: req.body.username });
});
app.get('/mod/banned', (_req: Request, res: Response) => {
    res.json(getBannedList());
});

// --- ONLINE USERS ---
app.get('/online', (req: Request, res: Response) => {
    const { getOnlineUsers } = require('./websocket');
    res.json(getOnlineUsers(parseInt((req.query.room as string) ?? '1')));
});

app.listen(3000, () => {
    logger.info('TS Middleware → http://localhost:3000');
    createWss(3001);
});