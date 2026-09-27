/* theme-init.js — pose data-theme sur <html> AVANT le rendu (pas de flash).
   Charge en script bloquant dans <head> (compatible CSP script-src 'self').
   Lit le mode memorise par appareil : 'light' / 'dark' / (absent => auto). */
(function () {
  try {
    var v = localStorage.getItem("kerskol_theme");
    if (v === "light" || v === "dark") {
      document.documentElement.setAttribute("data-theme", v);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch (e) {}
})();
