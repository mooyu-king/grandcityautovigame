const cacheName = "city-playbook-ff8ff9ebafbc";
const essentials = ["/", "/guides/gta-vi/", "/city-playbook-logo.webp", "/offline.html"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(essentials)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith("city-playbook-") && name !== cacheName).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});

async function remember(cache, request, response) {
  if (!response.ok || response.type !== "basic" || /\b(?:private|no-store)\b/i.test(response.headers.get("Cache-Control") ?? "")) return;
  await cache.put(request, response);
  const keys = (await cache.keys()).filter(key => !essentials.includes(new URL(key.url).pathname));
  for (const key of keys.slice(0, Math.max(0, keys.length - 62))) await cache.delete(key);
}

async function respond(event, navigation) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  if (!navigation) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }
  try {
    const response = await fetch(request);
    await remember(cache, request, response.clone()).catch(() => {});
    return response;
  } catch {
    return await cache.match(request) ?? (navigation ? await cache.match("/offline.html") : undefined) ?? Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search) return;
  const navigation = request.mode === "navigate" && (url.pathname === "/" || /^\/(guides\/gta-vi|play\/grand-city-auto-vi|about|privacy|contact|terms)(\/|$)/.test(url.pathname));
  const staticAsset = /^(?:\/_next\/static\/|\/media\/|\/city-playbook-)/.test(url.pathname);
  if (navigation || staticAsset) event.respondWith(respond(event, navigation));
});
