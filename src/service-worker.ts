/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, version } from '$service-worker';

/**
 * Cache-first for the hashed build files and the icons only. Pages and `/api` stay on the network, since a cached
 * document would pin its prices; offline navigations get Chrome's default offline page. The `fetch` handler is also
 * what Chrome's automatic install prompt looks for.
 */
const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `pokecards-${version}`;
const ASSETS = new Set([...build, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']);

sw.addEventListener('install', event => {
	event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ASSETS])).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', event => {
	event.waitUntil((async () => {
		for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
		await sw.clients.claim();
	})());
});

sw.addEventListener('fetch', event => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== sw.location.origin || !ASSETS.has(url.pathname)) return;
	event.respondWith(caches.match(event.request).then(hit => hit ?? fetch(event.request)));
});
