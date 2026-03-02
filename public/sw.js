const CACHE = "symptom-tracker-v2";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(["/","/index.html"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).hostname.includes("supabase")) return;
  e.respondWith(caches.match(e.request).then(c => {
    const f = fetch(e.request).then(r => { if (e.request.method==="GET"&&r.status===200) { caches.open(CACHE).then(ca=>ca.put(e.request,r.clone())); } return r; }).catch(()=>c);
    return c || f;
  }));
});
