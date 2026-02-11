// src/routes/proxy.routes.js - Check Content-Type before rewriting
import express from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = express.Router();

router.get(/^\/proxy(\/.*)?$/, async (req, res) => {
    let targetUrl = '';

    const originalUrl = req.originalUrl;
    if (originalUrl.includes('?url=')) {
        targetUrl = originalUrl.split('?url=')[1];
    } else if (req.query.url) {
        targetUrl = req.query.url;
    } else if (req.params[0]) {
        targetUrl = req.params[0].substring(1);
    }

    if (targetUrl) {
        try {
            targetUrl = decodeURIComponent(targetUrl);
        } catch (e) {
            console.error('[Proxy] Decode error:', targetUrl.substring(0, 50));
        }
    }

    if (!targetUrl) return res.status(400).send('URL required');

    try {
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('Invalid URL');
    }

    const fetchUrl = (url, redirectCount = 0) => {
        if (redirectCount > 5) {
            console.error('[Proxy] Too many redirects');
            return res.status(502).send('Too many redirects');
        }

        try {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;

            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'Host': parsedUrl.hostname,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'identity',
                    'Connection': 'keep-alive',
                    'Referer': parsedUrl.origin + '/'
                },
                timeout: 30000
            };

            if (req.headers.range) {
                requestOptions.headers['Range'] = req.headers.range;
            }

            const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url;
            console.log(`[Proxy] GET: ${shortUrl}`);

            const proxyReq = client.request(requestOptions, (proxyRes) => {
                const statusCode = proxyRes.statusCode;

                // Handle redirects
                if (statusCode >= 300 && statusCode < 400 && proxyRes.headers.location) {
                    let nextUrl = proxyRes.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        nextUrl = new URL(nextUrl, url).toString();
                    }
                    const shortNext = nextUrl.length > 80 ? nextUrl.substring(0, 80) + '...' : nextUrl;
                    console.log(`[Proxy] Redirect ${statusCode} -> ${shortNext}`);
                    proxyRes.resume();
                    return fetchUrl(nextUrl, redirectCount + 1);
                }

                if (statusCode === 411) {
                    console.error('[Proxy] ❌ 411 error');
                    proxyRes.resume();
                    if (!res.headersSent) {
                        res.status(502).send('Server requires Content-Length');
                    }
                    return;
                }

                // CRITICAL: Check Content-Type to determine if this is ACTUALLY a manifest
                const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
                const isActualManifest = contentType.includes('mpegurl') ||
                    contentType.includes('m3u8') ||
                    contentType.includes('m3u') ||
                    contentType.includes('x-mpegurl');

                // Check if URL ends with .m3u8 (but handle query parameters)
                const urlLower = url.toLowerCase();
                const urlPath = urlLower.split('?')[0]; // Remove query params
                const isM3U8URL = urlPath.endsWith('.m3u8') || urlPath.endsWith('.m3u');

                // Only rewrite if:
                // 1. Status is 200 (success)
                // 2. Content-Type indicates it's a playlist/manifest
                // 3. URL suggests it's a manifest
                const shouldRewrite = statusCode === 200 &&
                    isActualManifest;

                console.log(`[Proxy] Content-Type: ${contentType}, isManifest: ${isActualManifest}, shouldRewrite: ${shouldRewrite}`);

                // If we expected a manifest but got HTML, log the error
                if (isM3U8URL && contentType.includes('html') && statusCode === 200) {
                    console.error('[Proxy] ⚠️ Expected manifest but got HTML! Reading error page...');

                    let errorBody = '';
                    proxyRes.setEncoding('utf8');
                    proxyRes.on('data', chunk => errorBody += chunk);
                    proxyRes.on('end', () => {
                        console.error('[Proxy] HTML Response:', errorBody.substring(0, 500));
                        if (!res.headersSent) {
                            res.status(502).json({
                                error: 'Expected m3u8 manifest but got HTML',
                                serverResponse: errorBody.substring(0, 200)
                            });
                        }
                    });
                    return;
                }

                if (shouldRewrite) {
                    console.log('[Proxy] 📋 ACTUAL Manifest - rewriting URLs');

                    let body = '';
                    proxyRes.setEncoding('utf8');

                    proxyRes.on('data', chunk => {
                        body += chunk;
                    });

                    proxyRes.on('end', () => {
                        try {
                            const lines = body.split('\n');
                            let urlCount = 0;

                            const rewrittenLines = lines.map(line => {
                                const trimmed = line.trim();

                                // Skip comments and empty lines
                                if (!trimmed || trimmed.startsWith('#')) {
                                    return line;
                                }

                                // This is a URL - rewrite it
                                let segmentUrl;

                                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                    segmentUrl = trimmed;
                                } else if (trimmed.startsWith('/')) {
                                    segmentUrl = parsedUrl.origin + trimmed;
                                } else {
                                    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
                                    segmentUrl = baseUrl + trimmed;
                                }

                                urlCount++;
                                const proxiedUrl = `/api/proxy?url=${encodeURIComponent(segmentUrl)}`;

                                if (urlCount <= 3) {
                                    const shortSeg = trimmed.length > 40 ? trimmed.substring(0, 40) + '...' : trimmed;
                                    const shortProxy = proxiedUrl.length > 60 ? proxiedUrl.substring(0, 60) + '...' : proxiedUrl;
                                    console.log(`[Proxy] → ${shortSeg} => ${shortProxy}`);
                                }

                                return proxiedUrl;
                            });

                            const rewrittenBody = rewrittenLines.join('\n');

                            res.status(200);
                            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                            res.setHeader('Content-Length', Buffer.byteLength(rewrittenBody));
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin');
                            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
                            res.setHeader('Cache-Control', 'no-cache');

                            console.log(`[Proxy] ✅ Rewrote ${urlCount} URLs`);
                            res.send(rewrittenBody);

                        } catch (err) {
                            console.error('[Proxy] Rewrite error:', err.message);
                            if (!res.headersSent) {
                                res.status(500).send('Manifest rewrite failed');
                            }
                        }
                    });

                    proxyRes.on('error', (err) => {
                        console.error('[Proxy] Manifest read error:', err.message);
                        if (!res.headersSent) {
                            res.status(500).send('Error reading manifest');
                        }
                    });

                } else {
                    // NOT a manifest - pipe as binary
                    // Filter 401/407 to avoid browser proxy auth dialogs
                    const finalStatus = (statusCode === 401 || statusCode === 407) ? 502 : statusCode;
                    res.status(finalStatus);

                    // Copy headers
                    const skipHeaders = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade',
                        'access-control-allow-origin', 'access-control-allow-methods',
                        'access-control-allow-headers', 'access-control-expose-headers'];

                    Object.keys(proxyRes.headers).forEach(key => {
                        if (!skipHeaders.includes(key.toLowerCase())) {
                            res.setHeader(key, proxyRes.headers[key]);
                        }
                    });

                    // Fix Content-Type if needed
                    let finalContentType = contentType;

                    if (url.includes('.ts') && (!finalContentType || finalContentType.includes('octet-stream'))) {
                        finalContentType = 'video/MP2T';
                        res.setHeader('Content-Type', finalContentType);
                    }

                    // CORS
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin');
                    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

                    const size = proxyRes.headers['content-length'] || 'chunked';
                    const shortCT = finalContentType.length > 30 ? finalContentType.substring(0, 30) : finalContentType;
                    console.log(`[Proxy] ✅ ${statusCode}: ${shortCT} (${size})`);

                    // Pipe binary data
                    proxyRes.pipe(res);
                }
            });

            proxyReq.on('error', (err) => {
                console.error('[Proxy] Request error:', err.message);
                if (!res.headersSent) {
                    res.status(502).json({ error: err.message });
                }
            });

            proxyReq.on('timeout', () => {
                console.error('[Proxy] Timeout');
                proxyReq.destroy();
                if (!res.headersSent) {
                    res.status(504).send('Timeout');
                }
            });

            proxyReq.end();

        } catch (err) {
            console.error('[Proxy] Exception:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Internal error');
            }
        }
    };

    fetchUrl(targetUrl);
});

router.options(/^\/proxy(\/.*)?$/, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
    res.sendStatus(204);
});

export default router;