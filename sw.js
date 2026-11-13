'use strict';
const CACHE = 'caudillo-mobile-hq-pwa-v1';
const PREFIX = 'caudillo-mobile-hq-pwa-';
const BASE = new URL('./', self.location.href);
const CORE = ['index.html','pwa.js','manifest.webmanifest','cmhq-icon-180.png','cmhq-icon-192.png','cmhq-icon-512.png'].map(path => new URL(path, BASE).href);
const INDEX = CORE[0];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE.map(url => new Request(url,{cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {self.skipWaiting();return;}
  if (event.data?.type === 'CHECK_OFFLINE') event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const ready = (await Promise.all(CORE.map(url => cache.match(url)))).every(Boolean);
    event.source?.postMessage({type:'OFFLINE_STATE',ready});
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if (req.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === new URL(INDEX).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(req,{signal:controller.signal});
        if (response.ok) {await cache.put(INDEX,response.clone());return response;}
        return (await cache.match(INDEX)) || response;
      } catch (_) {
        return (await cache.match(INDEX)) || new Response('Offline guides are not ready yet. Reconnect and reopen Mobile Tech HQ.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      } finally {clearTimeout(timeout);}
    })());
    return;
  }
  if (CORE.includes(url.href)) event.respondWith((async () => {
    const cache = await caches.open(CACHE), cached = await cache.match(req);
    if (cached) return cached;
    const response = await fetch(req);
    if (response.ok) await cache.put(req,response.clone());
    return response;
  })());
});
