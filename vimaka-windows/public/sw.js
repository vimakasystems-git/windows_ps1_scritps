const CACHE='vimaka-care-shell-v8';
const SHELL=['/','/style.css','/app.js','/vimaka-logo.png','/icon-192.png','/icon-512.png','/solutions.json','/manifest.webmanifest'];
SHELL.push('/translation-core.js','/dashboard.js','/benchmark-ranking.js','/benchmark-references.json','/i18n.js','/translations.js','/donation.js','/donation.json','/donation-qr.png','/fonts.css',...Array.from({length:9},(_,i)=>`/fonts/font-${i+1}.ttf`));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
