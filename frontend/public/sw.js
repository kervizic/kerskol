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

var CACHE = "kerskol-assets-v2";

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
  // /audio/ = clips voix (noms = hash du texte, contenu immuable) -> mis en
  // cache A LA DEMANDE (cache-first avec cache.put), pas de prechargement massif.
  // /voix/lecture/ = audio + timings de la « lecture rythmee » (nom = id du
  // texte ; le contenu change seulement a un deploiement, qui vide le cache via
  // app-version.js) -> cache-first pour l'ecoute HORS LIGNE apres 1re ecoute.
  // EXCEPTION : manifest.json (liste des textes dispo) doit rester reseau-d'abord.
  if (url.pathname === "/voix/lecture/manifest.json") return false;
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/theme/") ||
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/voix/lecture/")
  );
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // pas d'API tierce
  if (url.pathname.indexOf("/rest/") === 0 || url.pathname.indexOf("/auth/") === 0) {
    return;                                              // jamais l'API Supabase
  }

  // Manifest(s) voix : liste des clips disponibles. TOUJOURS le reseau (jamais
  // de cache colle), pour qu'une bascule de voix ou l'ajout de clips soit vu des
  // la prochaine ouverture. On ne met JAMAIS ce fichier en cache ; repli cache
  // uniquement si le reseau est indisponible (hors ligne). Les clips eux-memes
  // (/audio/) restent immuables, caches par hash. (Bug prod du 27/10 : un vieux
  // manifest incomplet faisait lire « moins » sans les nombres.)
  if (url.pathname === "/voix/manifest.json" || url.pathname === "/voix/lecture/manifest.json") {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(req);
      })
    );
    return;
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
