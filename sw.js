const NAME='english-v3-e86168a92800';
const SHELL=["./", "index.html", "assets/course-data.js", "assets/site.css", "assets/engine.js", "assets/storage.js", "assets/app.js", "assets/vendor/fflate.js", "assets/vendor/fflate-LICENSE.txt", "assets/human/diagnostic.mp3", "assets/human/ls-001.mp3", "assets/human/ls-002.mp3"];
self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('english-v3-')&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok&&!e.request.headers.has('range')&&new URL(e.request.url).pathname.indexOf('/downloads/')<0){const copy=r.clone();e.waitUntil(caches.open(NAME).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));});
