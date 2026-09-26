/* =============================================================================
   app-version.js — mise a jour fiable entre versions (Kerskol).

   Objectif : a chaque deploiement, tous les navigateurs passent proprement a
   la nouvelle version, sans jamais servir un melange ancien/nouveau, et sans
   couper une seance d'enfant en cours.

   Principe :
   - La version EXECUTEE est lue dans <meta name="app-version"> (injectee au
     build par deploy.sh : hash court du commit + horodatage UTC).
   - On interroge /version.json (servi en no-store) periodiquement, au retour au
     premier plan (visibilitychange) et au retour du reseau (online).
   - Si la version distante differe : on applique la mise a jour, SAUF si une
     seance est en cours (setBusy(true)) — dans ce cas on la reporte jusqu'a
     setBusy(false).
   - Sequence de mise a jour : taches onBeforeUpdate (max 5 s) -> vidage du
     Cache Storage -> desenregistrement des service workers -> location.reload().
   - Garde-fou anti-boucle via sessionStorage.

   Aucune dependance externe. Fichier separe (compatible CSP script-src 'self').
   API publique : window.Kerskol.version
     .current            -> version actuellement executee (string)
     .setBusy(bool)       -> true pendant une seance : reporte toute mise a jour
     .isBusy()            -> etat courant
     .onBeforeUpdate(fn)  -> enregistre une tache (sync ou Promise) executee
                             avant rechargement (ex. envoyer les reponses en
                             attente). Attente globale plafonnee a 5 s.
     .check()             -> force une verification immediate
   ============================================================================= */
(function () {
  "use strict";

  var CHECK_INTERVAL_MS = 5 * 60 * 1000;   // 5 min
  var BEFORE_UPDATE_TIMEOUT_MS = 5000;     // plafond d'attente des taches
  var GUARD_KEY = "kerskol_update_target"; // anti-boucle : version deja ciblee
  var VERSION_URL = "/version.json";

  function currentVersion() {
    var m = document.querySelector('meta[name="app-version"]');
    return m ? (m.getAttribute("content") || "") : "";
  }

  var LOADED = currentVersion();
  var busy = false;
  var pendingTarget = null;       // version en attente d'application (si busy)
  var beforeUpdateHandlers = [];
  var checking = false;
  var updating = false;

  function setBusy(value) {
    busy = !!value;
    if (!busy && pendingTarget) {
      var t = pendingTarget;
      pendingTarget = null;
      applyUpdate(t);
    }
  }

  function onBeforeUpdate(fn) {
    if (typeof fn === "function") beforeUpdateHandlers.push(fn);
  }

  function runBeforeUpdate() {
    var jobs = beforeUpdateHandlers.map(function (fn) {
      try { return Promise.resolve(fn()); } catch (e) { return Promise.resolve(); }
    });
    var all = Promise.all(jobs).catch(function () {});
    var timeout = new Promise(function (resolve) {
      setTimeout(resolve, BEFORE_UPDATE_TIMEOUT_MS);
    });
    return Promise.race([all, timeout]);
  }

  function clearCachesAndSW() {
    var jobs = [];
    if (window.caches && caches.keys) {
      jobs.push(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).catch(function () {}));
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }).catch(function () {}));
    }
    return Promise.all(jobs).catch(function () {});
  }

  function applyUpdate(target) {
    if (updating) return;
    if (busy) { pendingTarget = target; return; }   // seance en cours -> report

    var already = null;
    try { already = sessionStorage.getItem(GUARD_KEY); } catch (e) {}
    if (already === target) return;                 // deja recharge vers cette version
    try { sessionStorage.setItem(GUARD_KEY, target); } catch (e) {}

    updating = true;
    var reload = function () { window.location.reload(); };
    runBeforeUpdate().then(clearCachesAndSW).then(reload, reload);
  }

  function check() {
    if (checking || updating) return;
    if (document.visibilityState === "hidden") return;
    checking = true;
    fetch(VERSION_URL + "?_=" + Date.now(), { cache: "no-store", credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.version) return;         // reponse illisible -> on ne touche a rien
        var latest = data.version;
        if (latest === LOADED) {                     // versions alignees
          try { sessionStorage.removeItem(GUARD_KEY); } catch (e) {}
          return;
        }
        applyUpdate(latest);
      })
      .catch(function () {})
      .then(function () { checking = false; });
  }

  window.Kerskol = window.Kerskol || {};
  window.Kerskol.version = {
    current: LOADED,
    setBusy: setBusy,
    isBusy: function () { return busy; },
    onBeforeUpdate: onBeforeUpdate,
    check: check
  };

  // Declencheurs : chargement, intervalle, retour au premier plan, retour
  // reseau, restauration bfcache (Safari/iOS).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
  setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("online", check);
  window.addEventListener("pageshow", function (e) { if (e.persisted) check(); });
})();
