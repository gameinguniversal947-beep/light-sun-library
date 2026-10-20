/* pwa.js — Light Sun Library ko installable APP banata hai  (v2)
   ----------------------------------------------------------------------------
   - manifest + icons + service worker laga deta hai.
   - Android/Chrome: "Install App" button dikhata hai.
   - iPhone/Safari: "Add to Home Screen" ka tarika batata hai.

   Lagane ka tarika:
   1) manifest.json, sw.js, pwa.js, icon-192.png, icon-512.png
      — ye paanch files repo me upload karo (index.html ke saath, usi folder me).
   2) index.html me </body> se pehle ye line daalo:
          <script src="pwa.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var head = document.head;

  function meta(name, content) {
    var m = document.createElement("meta");
    m.name = name; m.content = content;
    head.appendChild(m);
  }
  function link(rel, href) {
    var l = document.createElement("link");
    l.rel = rel; l.href = href;
    head.appendChild(l);
  }

  link("manifest", "./manifest.json");
  link("apple-touch-icon", "./icon-192.png");
  meta("theme-color", "#0b0b0d");
  meta("mobile-web-app-capable", "yes");
  meta("apple-mobile-web-app-capable", "yes");
  meta("apple-mobile-web-app-status-bar-style", "black-translucent");
  meta("apple-mobile-web-app-title", "Light Sun");

  /* ---- service worker (install + offline) ---- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

  /* ---- "Install App" button ---- */
  var deferred = null;
  var isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  function makeButton(label, onClick) {
    if (document.getElementById("__pwa_install")) return;
    var b = document.createElement("button");
    b.id = "__pwa_install";
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "position:fixed;left:50%;transform:translateX(-50%);" +
      "bottom:calc(78px + env(safe-area-inset-bottom));z-index:9998;" +
      "background:linear-gradient(180deg,#ffb340,#ff9800);color:#1a1205;border:0;" +
      "border-radius:999px;padding:11px 20px;font:800 13px system-ui,sans-serif;" +
      "box-shadow:0 8px 24px rgba(255,152,0,.5);cursor:pointer;";
    b.addEventListener("click", onClick);
    document.body.appendChild(b);
    setTimeout(function () { if (b.parentNode) b.remove(); }, 15000);
  }

  function iosHint() {
    var ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2147483700;background:rgba(0,0,0,.9);" +
      "display:flex;align-items:center;justify-content:center;padding:24px;" +
      "font-family:system-ui,-apple-system,sans-serif;color:#f4f4f6;text-align:center;";
    ov.innerHTML =
      '<div style="max-width:340px;background:#17171d;border:1px solid #26262f;' +
        'border-radius:18px;padding:22px;">' +
        '<div style="font-size:17px;font-weight:800;margin-bottom:10px;">' +
          "App install karo</div>" +
        '<div style="font-size:14px;color:#b9b9c4;line-height:1.7;">' +
          "Safari me neeche <b>Share</b> button (&#8963; jaisa) dabao, " +
          "phir <b>Add to Home Screen</b> chuno.</div>" +
        '<button id="__pwa_ok" style="margin-top:16px;padding:11px 22px;border:0;' +
          'border-radius:10px;background:#ff9800;color:#1a1205;font-weight:800;' +
          'cursor:pointer;">Samajh gaya</button></div>';
    document.body.appendChild(ov);
    ov.querySelector("#__pwa_ok").addEventListener("click", function () { ov.remove(); });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    makeButton("\u2B07  Install App", function () {
      var b = document.getElementById("__pwa_install");
      if (!deferred) { if (b) b.remove(); return; }
      deferred.prompt();
      if (deferred.userChoice) {
        deferred.userChoice.then(function () { deferred = null; if (b) b.remove(); });
      }
    });
  });

  window.addEventListener("appinstalled", function () {
    var b = document.getElementById("__pwa_install");
    if (b) b.remove();
  });

  /* iPhone par install ka tarika (agar pehle se installed nahi) */
  if (isIOS && !isStandalone) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        makeButton("\u2B07  App install karo", iosHint);
      }, 4000);
    });
  }
})();

