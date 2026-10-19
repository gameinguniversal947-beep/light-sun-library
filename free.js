/* free.js — Light Sun Library  (v2)
   ----------------------------------------------------------------------------
   1) PAYMENT / VIP HATAO -> SAB FREE
      - Har kitaab/comic free (koi Unlock/Pay nahi).
      - VIP card aur ₹199 wala payment button chhup jaata hai.
      - Earnings card bhi chhup jaata hai.
   2) PADHNE SE PEHLE AD (1-2 minute)
      - Book/comic kholne par pehle ad + timer dikhta hai.
      - Timer khatam hone par "Continue to read" chalu hota hai.

   Lagane ka tarika:
   1) Is file ko repo me "free.js" naam se upload karo (purani ke upar).
   2) index.html me </body> se pehle ye line ho:
          <script src="free.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    /* ad kitne second dikhe (60 = 1 min, 120 = 2 min) */
    adSeconds: 90,

    /* ad (Adsterra banner) */
    adWidth: 320,
    adHeight: 50,
    adCode:
`<script>
  atOptions = {
    'key' : 'a02b6cdb91f307e4f365fc8ae37e219c',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
<\/script>
<script src="https://bauval.org/22/a02b6cdb91f307e4f365fc8ae37e219c"><\/script>`,

    /* true = VIP/payment poori tarah hata do (sabko ad dikhega) */
    removeVip: true
  };

  function safe(fn) { try { fn(); } catch (e) {} }

  /* =====================================================================
     PART 1 — payment / VIP hatao, sab free
     ===================================================================== */

  var css = document.createElement("style");
  css.textContent =
    ".vip-card{display:none!important}" +
    "#__lsl_earnings{display:none!important}" +
    ".lock-note{display:none!important}" +
    ".pay-methods{display:none!important}" +
    ".lock-badge{display:none!important}";
  (document.head || document.documentElement).appendChild(css);

  safe(function () { window.isPaid = function () { return false; }; });
  safe(function () { window.canRead = function () { return true; }; });
  safe(function () {
    window.priceLabel = function () { return { html: '<span class="free">FREE</span>' }; };
  });
  safe(function () { window.unlockPrice = function () { return 0; }; });

  if (CONFIG.removeVip) {
    safe(function () { window.isVip = function () { return false; }; });
    safe(function () { if (window.updateBadge) updateBadge(); });
  }

  /* purane items ke price hata do (memory me) -> har jagah FREE */
  safe(function () {
    if (typeof state !== "undefined" && state.items) {
      state.items.forEach(function (i) { i.price = 0; });
    }
  });

  /* =====================================================================
     PART 2 — padhne se pehle ad
     ===================================================================== */

  var GATE_ID = "__lsl_gate";

  function showGate(onDone) {
    if (document.getElementById(GATE_ID)) return;

    var ov = document.createElement("div");
    ov.id = GATE_ID;
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.95);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "padding:22px;text-align:center;color:#f4f4f6;" +
      "font-family:system-ui,-apple-system,sans-serif;";

    ov.innerHTML =
      '<div style="font-size:11.5px;letter-spacing:2px;color:#9a9aa6;' +
        'font-weight:800;margin-bottom:14px;">ADVERTISEMENT</div>' +
      '<div id="__lsl_gate_ad" style="background:#0f0f14;border:1px solid #26262f;' +
        'border-radius:14px;padding:14px;display:flex;align-items:center;' +
        'justify-content:center;overflow:hidden;min-height:' + (CONFIG.adHeight + 28) + 'px;"></div>' +
      '<div id="__lsl_gate_timer" style="margin-top:20px;font-size:15px;color:#9a9aa6;"></div>' +
      '<button id="__lsl_gate_go" disabled style="margin-top:18px;padding:13px 28px;border:0;' +
        'border-radius:12px;background:#33333d;color:#8a8a95;font-weight:900;font-size:15px;' +
        'cursor:not-allowed;">Continue to read</button>';

    document.body.appendChild(ov);

    var box = ov.querySelector("#__lsl_gate_ad");
    var ifr = document.createElement("iframe");
    ifr.style.cssText = "border:0;width:" + CONFIG.adWidth + "px;height:" +
      CONFIG.adHeight + "px;overflow:hidden;background:transparent;";
    ifr.setAttribute("scrolling", "no");
    ifr.setAttribute("frameborder", "0");
    ifr.setAttribute("title", "advertisement");
    box.appendChild(ifr);
    setTimeout(function () {
      try {
        var d = ifr.contentWindow.document;
        d.open();
        d.write('<!DOCTYPE html><html><head><meta charset="utf-8">' +
          '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>' +
          '</head><body>' + CONFIG.adCode + '</body></html>');
        d.close();
      } catch (e) {}
    }, 0);

    var left = CONFIG.adSeconds;
    var timer = ov.querySelector("#__lsl_gate_timer");
    var go = ov.querySelector("#__lsl_gate_go");

    function tick() {
      if (left <= 0) {
        timer.textContent = "Aap padhna shuru kar sakte ho";
        go.disabled = false;
        go.style.background = "linear-gradient(180deg,#ffb340,#ff9800)";
        go.style.color = "#1a1205";
        go.style.cursor = "pointer";
        return;
      }
      var m = Math.floor(left / 60), s = left % 60;
      timer.textContent = "Ad khatam hone me: " +
        (m > 0 ? m + ":" + (s < 10 ? "0" : "") + s : s + "s");
      left--;
      setTimeout(tick, 1000);
    }
    tick();

    go.addEventListener("click", function () {
      if (go.disabled) return;
      ov.remove();
      onDone();
    });
  }

  safe(function () {
    if (typeof window.openReader !== "function") return;
    var origOpenReader = window.openReader;
    window.openReader = function (itemId, startPage) {
      showGate(function () { origOpenReader(itemId, startPage); });
      return undefined;
    };
  });

  /* khuli screen dobara render karo (FREE dikhane ke liye) */
  safe(function () {
    if (typeof state === "undefined") return;
    if (state.screen === "profile" && window.renderProfile) renderProfile();
    else if (state.screen === "detail" && window.renderDetail) renderDetail();
    else if (state.screen === "home" && window.renderHome) renderHome();
    else if (state.screen === "comics" && window.renderComics) renderComics();
    else if (state.screen === "save" && window.renderSave) renderSave();
  });
})();
          
