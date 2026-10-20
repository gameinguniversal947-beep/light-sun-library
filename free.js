/* free.js — Light Sun Library  (v4)
   ----------------------------------------------------------------------------
   1) PAYMENT / VIP HATAO -> SAB FREE
   2) PADHNE SE PEHLE VIDEO AD (awaaz ke saath)
      - Book/comic kholne par gate aata hai.
      - User "Ad dekho" button dabata hai -> video ad AWAZ ke saath chalta hai.
      - Ad khatam -> "Continue to read" -> reader khulta hai.
      - Video na chale to banner ad + timer (fallback).

   Lagane ka tarika:
   1) Is file ko repo me "free.js" naam se upload karo (purani ke upar).
   2) index.html me </body> se pehle ye line ho:
          <script src="free.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    vastUrl: "https://www.videosprofitnetwork.com/watch.xml?key=628df5f23242ea44f505d66d46d45c08",
    vastTimeoutMs: 9000,     // video shuru na ho to itne ms me fallback
    fallbackSeconds: 30,     // fallback banner kitne second

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

    removeVip: true
  };

  function safe(fn) { try { fn(); } catch (e) {} }

  /* ===================== PART 1 — sab free ===================== */

  var css = document.createElement("style");
  css.textContent =
    ".vip-card{display:none!important}" +
    "#__lsl_earnings{display:none!important}" +
    ".lock-note{display:none!important}" +
    ".pay-methods{display:none!important}" +
    ".lock-badge{display:none!important}" +
    "#__lsl_gate video{width:100%;max-width:420px;height:auto;background:#000;" +
      "border-radius:10px;display:block;}";
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
  safe(function () {
    if (typeof state !== "undefined" && state.items) {
      state.items.forEach(function (i) { i.price = 0; });
    }
  });

  /* ===================== PART 2 — video ad gate ===================== */

  var GATE_ID = "__lsl_gate";
  var IMA_SRC = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
  var imaLoading = null;

  function loadIMA() {
    if (window.google && window.google.ima) return Promise.resolve();
    if (imaLoading) return imaLoading;
    imaLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = IMA_SRC;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("IMA load failed")); };
      document.head.appendChild(s);
    });
    return imaLoading;
  }

  function bannerFrame() {
    var ifr = document.createElement("iframe");
    ifr.style.cssText = "border:0;width:" + CONFIG.adWidth + "px;height:" +
      CONFIG.adHeight + "px;overflow:hidden;background:transparent;";
    ifr.setAttribute("scrolling", "no");
    ifr.setAttribute("frameborder", "0");
    ifr.setAttribute("title", "advertisement");
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
    return ifr;
  }

  function showGate(onDone) {
    if (document.getElementById(GATE_ID)) return;

    var ov = document.createElement("div");
    ov.id = GATE_ID;
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.96);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "padding:20px;text-align:center;color:#f4f4f6;" +
      "font-family:system-ui,-apple-system,sans-serif;";

    ov.innerHTML =
      '<div style="font-size:11.5px;letter-spacing:2px;color:#9a9aa6;' +
        'font-weight:800;margin-bottom:14px;">ADVERTISEMENT</div>' +
      '<div id="__lsl_gate_ad" style="display:flex;align-items:center;' +
        'justify-content:center;width:100%;max-width:440px;min-height:60px;"></div>' +
      '<div id="__lsl_gate_timer" style="margin-top:16px;font-size:14.5px;color:#9a9aa6;">' +
        "Ad dekhne ke liye tap karo</div>" +
      '<button id="__lsl_gate_play" style="margin-top:16px;padding:14px 30px;border:0;' +
        'border-radius:12px;background:linear-gradient(180deg,#ffb340,#ff9800);' +
        'color:#1a1205;font-weight:900;font-size:16px;cursor:pointer;">' +
        "\u25B6  Ad dekho</button>" +
      '<button id="__lsl_gate_go" style="display:none;margin-top:16px;padding:13px 28px;' +
        'border:0;border-radius:12px;background:linear-gradient(180deg,#ffb340,#ff9800);' +
        'color:#1a1205;font-weight:900;font-size:15px;cursor:pointer;">' +
        "Continue to read</button>";

    document.body.appendChild(ov);

    var adBox = ov.querySelector("#__lsl_gate_ad");
    var timer = ov.querySelector("#__lsl_gate_timer");
    var playBtn = ov.querySelector("#__lsl_gate_play");
    var go = ov.querySelector("#__lsl_gate_go");
    var finished = false;

    function enable() {
      if (finished) return;
      finished = true;
      timer.textContent = "Aap padhna shuru kar sakte ho";
      playBtn.style.display = "none";
      go.style.display = "inline-block";
    }

    go.addEventListener("click", function () {
      ov.remove();
      onDone();
    });

    function fallback() {
      adBox.innerHTML = "";
      var wrap = document.createElement("div");
      wrap.style.cssText = "background:#0f0f14;border:1px solid #26262f;border-radius:14px;" +
        "padding:14px;display:flex;align-items:center;justify-content:center;";
      wrap.appendChild(bannerFrame());
      adBox.appendChild(wrap);

      var left = CONFIG.fallbackSeconds;
      (function tick() {
        if (left <= 0) { enable(); return; }
        timer.textContent = "Ad khatam hone me: " + left + "s";
        left--;
        setTimeout(tick, 1000);
      })();
    }

    /* tap ke baad hi video chalta hai -> sound allowed */
    function startVideo() {
      playBtn.style.display = "none";
      timer.textContent = "Ad load ho raha hai\u2026";

      var done = false;
      var guard = setTimeout(function () {
        if (!done) { done = true; fallback(); }
      }, CONFIG.vastTimeoutMs);

      loadIMA().then(function () {
        var video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        adBox.appendChild(video);

        var displayContainer = new google.ima.AdDisplayContainer(adBox, video);
        var adsLoader = new google.ima.AdsLoader(displayContainer);

        adsLoader.addEventListener(
          google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          function (e) {
            clearTimeout(guard);
            var adsManager = e.getAdsManager(video);
            var start = Date.now();

            adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, function () {
              timer.textContent = "Ad chal raha hai\u2026";
            });
            adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, function () { enable(); });
            adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, function () { enable(); });
            adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function () {
              if (Date.now() - start < 1500) fallback(); else enable();
            });

            try {
              adsManager.init(
                adBox.clientWidth || 320,
                adBox.clientWidth ? Math.round(adBox.clientWidth * 9 / 16) : 180,
                google.ima.ViewMode.NORMAL
              );
              adsManager.setVolume(1);      // sound ON
              adsManager.start();
            } catch (err) { fallback(); }
          }
        );

        adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function () {
          clearTimeout(guard);
          fallback();
        });

        try { displayContainer.initialize(); } catch (e) {}

        var req = new google.ima.AdsRequest();
        req.adTagUrl = CONFIG.vastUrl;
        req.linearAdSlotWidth = adBox.clientWidth || 320;
        req.linearAdSlotHeight = 180;
        req.nonLinearAdSlotWidth = 320;
        req.nonLinearAdSlotHeight = 50;
        try { adsLoader.requestAds(req); } catch (e) { clearTimeout(guard); fallback(); }
      }).catch(function () {
        clearTimeout(guard);
        fallback();
      });
    }

    playBtn.addEventListener("click", startVideo);
  }

  /* openReader wrap: pehle ad, phir reader */
  safe(function () {
    if (typeof window.openReader !== "function") return;
    var origOpenReader = window.openReader;
    window.openReader = function (itemId, startPage) {
      showGate(function () { origOpenReader(itemId, startPage); });
      return undefined;
    };
  });

  safe(function () {
    if (typeof state === "undefined") return;
    if (state.screen === "profile" && window.renderProfile) renderProfile();
    else if (state.screen === "detail" && window.renderDetail) renderDetail();
    else if (state.screen === "home" && window.renderHome) renderHome();
    else if (state.screen === "comics" && window.renderComics) renderComics();
    else if (state.screen === "save" && window.renderSave) renderSave();
  });
})();
