/* ============================================================================
   ads.js — Light Sun Library ad slots  (v4)
   ----------------------------------------------------------------------------
   - Jis screen par ".ad-box" (— ADVERTISEMENT —) box hai, ad USKE ANDAR bhi
     aata hai, AUR screen ke sabse neeche bhi.
   - Jis screen par wo box nahi hai, wahan ad sirf neeche aata hai.
   - Reader ke andar (book pages par) ads NAHI aate.
   - Adsterra code document.write use karta hai, isliye wo ek iframe ke andar
     chalta hai (warna poora app blank ho sakta tha).

   Lagane ka tarika:
   1) Is file ko repo me "ads.js" naam se upload karo (purani ke upar).
   2) index.html me </body> se pehle ye line ho:
          <script src="ads.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    /* ---- Google AdSense (optional) ---- */
    adsenseClient: "",
    adsenseSlot: "",

    /* ---- Adsterra banner code (aapka) ---- */
    customHtml:
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

    adWidth: 320,
    adHeight: 50,

    /* box ke alawa neeche bhi ad dikhana hai? */
    alsoBottom: true,

    showPlaceholder: false
  };

  var SLOT_ID = "__lsl_ad";
  var FILLED = "data-ad-filled";

  /* Adsterra code ko iframe me likho (document.write isolate hota hai) */
  function makeAdFrame() {
    var ifr = document.createElement("iframe");
    ifr.style.cssText =
      "border:0;width:" + CONFIG.adWidth + "px;height:" + CONFIG.adHeight +
      "px;overflow:hidden;background:transparent;display:block;";
    ifr.setAttribute("scrolling", "no");
    ifr.setAttribute("frameborder", "0");
    ifr.setAttribute("title", "advertisement");
    setTimeout(function () {
      try {
        var d = ifr.contentWindow.document;
        d.open();
        d.write(
          '<!DOCTYPE html><html><head><meta charset="utf-8">' +
          '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>' +
          '</head><body>' + CONFIG.customHtml + '</body></html>'
        );
        d.close();
      } catch (e) {}
    }, 0);
    return ifr;
  }

  function buildAdContent() {
    if (CONFIG.customHtml) return makeAdFrame();

    if (CONFIG.adsenseClient && CONFIG.adsenseSlot) {
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.cssText = "display:block;width:100%;";
      ins.setAttribute("data-ad-client", CONFIG.adsenseClient);
      ins.setAttribute("data-ad-slot", CONFIG.adsenseSlot);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      return ins;
    }

    if (CONFIG.showPlaceholder) {
      var ph = document.createElement("div");
      ph.style.cssText = "color:#777;font:600 12px system-ui,sans-serif;letter-spacing:1px;";
      ph.textContent = "— ADVERTISEMENT —";
      return ph;
    }
    return null;
  }

  function loadAdsense() {
    if (!CONFIG.adsenseClient) return;
    if (document.getElementById("__adsense_loader")) return;
    var s = document.createElement("script");
    s.id = "__adsense_loader";
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
            encodeURIComponent(CONFIG.adsenseClient);
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  function activeScreen() {
    return document.querySelector("#screens .screen.active");
  }

  /* .ad-box ko ad se bharo */
  function fillBox(box) {
    var content = buildAdContent();
    if (!content) return;
    box.setAttribute(FILLED, "1");
    box.innerHTML = "";
    box.style.cssText =
      "background:transparent;border:0;padding:0;margin:14px 0;" +
      "display:flex;align-items:center;justify-content:center;" +
      "min-height:" + CONFIG.adHeight + "px;overflow:hidden;";
    box.appendChild(content);
  }

  /* screen ke sabse neeche ek ad slot lagao */
  function addBottomSlot(sc) {
    if (!CONFIG.alsoBottom) return;
    if (sc.lastElementChild && sc.lastElementChild.id === SLOT_ID) return;
    var old = sc.querySelector("#" + SLOT_ID);
    if (old) old.remove();
    var content = buildAdContent();
    if (!content) return;
    var d = document.createElement("div");
    d.id = SLOT_ID;
    d.style.cssText =
      "margin:16px 0 8px;min-height:" + CONFIG.adHeight + "px;display:flex;" +
      "align-items:center;justify-content:center;overflow:hidden;";
    d.appendChild(content);
    sc.appendChild(d);
  }

  function ensureSlot() {
    var sc = activeScreen();
    if (!sc) return;

    /* 1) .ad-box ho to use bhi bharo */
    var box = sc.querySelector(".ad-box");
    if (box && box.getAttribute(FILLED) !== "1") fillBox(box);

    /* 2) neeche bhi ad lagao */
    addBottomSlot(sc);
  }

  function boot() {
    loadAdsense();
    ensureSlot();
    var target = document.getElementById("screens") || document.body;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; ensureSlot(); }, 60);
    }).observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
