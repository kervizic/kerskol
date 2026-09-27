/* sw.js — service worker minimal Kerskol.
 *
 * Objectif : rendre l'app installable (PWA) et servir les assets empreintes
 * hors ligne, SANS jamais figer index.html / version.json (le mecanisme de
 * mise a jour vit dans app-version.js : il vide le Cache Storage et
 * desenregistre les service workers a chaque nouvelle version).
 *
 * Strategie :
 *   - assets empreintes (/assets/, /theme/) : cache-first (contenu immuable,
 *     le nom change quand le contenu change).
 *   - index.html, navigations, version.json, manifest, sw : reseau d'abord,
 *     repli cache uniquement hors ligne (jamais de cache "colle").
 */
"use strict";

var CACHE = "kerskol-assets-v1";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/assets/") || url.pathname.startsWith("/theme/");
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // pas d'API tierce
  if (url.pathname.indexOf("/rest/") === 0 || url.pathname.indexOf("/auth/") === 0) {
    return;                                              // jamais l'API Supabase
  }

  // Assets empreintes : cache-first.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Reste (index.html, navigations, version.json, manifest) : reseau d'abord.
  event.respondWith(
    fetch(req).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match("/index.html");
      });
    })
  );
});
