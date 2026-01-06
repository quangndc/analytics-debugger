import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import type { ProxyContext, GA4Request, ProxyError } from './types/proxy';

const require = createRequire(import.meta.url);
const { Proxy } = require('http-mitm-proxy');

const TOKEN_FILE = 'proxy-token.txt';
const MAX_BACKUPS = 5;
const MAX_AUTH_FAILURES = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Rate limiting tracker for failed auth attempts
const authFailureTracker = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up old token backup files, keeping only MAX_BACKUPS most recent
 */
function cleanupOldBackups(userData: string): void {
    try {
        const backups = fs.readdirSync(userData)
            .filter(f => f.startsWith('proxy-token.backup.'))
            .sort()
            .reverse();

        if (backups.length > MAX_BACKUPS) {
            backups.slice(MAX_BACKUPS).forEach(f => {
                try {
                    fs.unlinkSync(path.join(userData, f));
                } catch (e) {
                    console.error('Failed to delete old backup:', f, e);
                }
            });
        }
    } catch (e) {
        console.error('Failed to clean up backups:', e);
    }
}

/**
 * Get or generate proxy authentication token
 * Token is stored in userData directory with secure permissions
 */
export function getProxyToken(): string {
    const userData = app.getPath('userData');
    const tokenPath = path.join(userData, TOKEN_FILE);

    if (fs.existsSync(tokenPath)) {
        const existingToken = fs.readFileSync(tokenPath, 'utf-8').trim();
        if (existingToken.length > 0) {
            return existingToken;
        }
    }

    // Generate new token (32 bytes = 64 hex chars)
    const newToken = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenPath, newToken, 'utf-8');
    fs.chmodSync(tokenPath, 0o600);
    return newToken;
}

/**
 * Regenerate proxy authentication token
 * Creates backup of old token and cleans up old backups
 */
export function regenerateProxyToken(): string {
    const userData = app.getPath('userData');
    const tokenPath = path.join(userData, TOKEN_FILE);

    // Backup old token
    if (fs.existsSync(tokenPath)) {
        const backupPath = path.join(userData, `proxy-token.backup.${Date.now()}.txt`);
        fs.copyFileSync(tokenPath, backupPath);
        cleanupOldBackups(userData);
    }

    // Generate new token with secure permissions
    const newToken = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenPath, newToken, 'utf-8');
    fs.chmodSync(tokenPath, 0o600);
    return newToken;
}

/**
 * Validate host header format
 */
function isValidHost(host: string): boolean {
    if (!host || host.length === 0) return false;
    // Basic host validation: alphanumeric, dots, dashes, optional port
    return /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(host);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
        return false;
    }
}

export function startProxy(win: BrowserWindow | null, port: number = 8888) {
    const proxy = new Proxy();
    const userData = app.getPath('userData');
    const certsDir = path.join(userData, 'certs');
    const proxyToken = getProxyToken();

    if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
    }

    proxy.onError(function (_ctx: ProxyContext, err: Error) {
        console.error('Proxy Error:', err);
    });

    proxy.onRequest(function (ctx: ProxyContext, callback: () => void) {
        const clientIp = (ctx.clientToProxyRequest.socket?.remoteAddress as string) || 'unknown';

        // Rate limiting: Check for too many auth failures
        const now = Date.now();
        const tracker = authFailureTracker.get(clientIp);

        if (tracker && tracker.count >= MAX_AUTH_FAILURES && now < tracker.resetTime) {
            console.warn('Rate limit exceeded for IP:', clientIp);
            ctx.proxyToClientResponse.writeHead(429, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Too Many Requests');
            return;
        }

        // Proxy Authentication: Check for valid token in headers
        const authHeader = ctx.clientToProxyRequest.headers['x-proxy-token'];
        if (!authHeader || authHeader !== proxyToken) {
            console.warn('Unauthorized proxy request rejected from IP:', clientIp);

            // Track failed attempts
            if (tracker) {
                tracker.count++;
            } else {
                authFailureTracker.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
            }

            ctx.proxyToClientResponse.writeHead(401, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Unauthorized: Invalid proxy token');
            return;
        }

        // Clear failed attempts on successful auth
        authFailureTracker.delete(clientIp);

        const host = ctx.clientToProxyRequest.headers.host || '';
        const url = ctx.clientToProxyRequest.url || '';

        // Input validation: Validate host format
        if (!isValidHost(host)) {
            console.warn('Invalid host header:', host);
            return callback();
        }

        const protocol = ctx.isSSL ? 'https:' : 'http:';
        const fullUrl = protocol + '//' + host + url;

        // Input validation: Validate URL format
        if (!isValidUrl(fullUrl)) {
            console.warn('Invalid URL:', fullUrl);
            return callback();
        }

        // GA4 Parsing
        const decoded: GA4Request = {
            method: ctx.clientToProxyRequest.method || 'GET',
            url: fullUrl,
            host: host,
            timestamp: Date.now(),
            type: 'unknown'
        };

        if (host.includes('google-analytics.com') && url.includes('/g/collect')) {
            decoded.type = 'ga4';
            try {
                const urlObj = new URL(fullUrl);
                decoded.eventName = urlObj.searchParams.get('en') || 'unknown';

                // Extract params
                const params: Record<string, string> = {};
                urlObj.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                decoded.params = params;
            } catch (error) {
                console.error('Error parsing GA4 url:', error instanceof Error ? error.message : error);
            }
        }

        if (win) {
            win.webContents.send('proxy-request', decoded);
        }

        return callback();
    });

    proxy.listen({ port: port, sslCaDir: certsDir }, (err: ProxyError) => {
        if (err) {
            console.error('Failed to start proxy', err);
            if (win) {
                win.webContents.send('proxy-error', {
                    type: err.code === 'EADDRINUSE' ? 'port-in-use' : 'unknown',
                    message: err.message
                });
            }
        } else {
            console.log('Proxy listening on port ' + port);
            if (win) {
                win.webContents.send('proxy-status', { status: 'running', port });
            }
        }
    });

    return proxy;
}
