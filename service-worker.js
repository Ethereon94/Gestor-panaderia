self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("app-v1").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/script.js",
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png"
      ]);
    })
  );
});