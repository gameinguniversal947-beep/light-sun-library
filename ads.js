/* ============================================================================
   ads.js — Light Sun Library ad slots
   ----------------------------------------------------------------------------
   Lagane ka tarika:
   1) Is file ko repo me "ads.js" naam se upload karo (root me, purani ke upar).
   2) index.html me, </body> se pehle ye line ho (protect.js ke NEECHE):
          <script src="ads.js"></script>

   Ads app ke har screen (Home/Comics/Save) ke sabse neeche, content ke baad
   aate hain. Reader ke andar (book pages par) ads NAHI aate.

   Adsterra ka code document.write use karta hai — isliye use ek iframe ke
   andar chalaya gaya hai, taaki wo aapke poore app ko blank na kar de.
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    /* ---- Google AdSense (optional, chhod do agar use nahi kar rahe) ---- */
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

    /* Setup ke dauraan "Ad space" box; ads lag jaane par false */
    showPlaceholder: false
  };

  var SLOT_ID = "__lsl_ad";

  /* Adsterra code ko iframe me likho (document.write ko isolate karta hai) */
  function makeAdFrame() {
    var ifr = document.createElement("iframe");
    ifr.style.cssText =
      "border:0;width:" + CONFIG.adWidth + "px;height:" + CONFIG.adHeight +
      "px;overflow:hidden;background:transparent;";
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

  function makeSlot() {
    var d = document.createElement("div");
    d.id = SLOT_ID;
    d.style.cssText =
      "margin:16px 0 8px;min-height:50px;display:flex;" +
      "align-items:center;justify-content:center;overflow:hidden;";

    if (CONFIG.customHtml) {
      d.appendChild(makeAdFrame());
    } else if (CONFIG.adsenseClient && CONFIG.adsenseSlot) {
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.cssText = "display:block;width:100%;";
      ins.setAttribute("data-ad-client", CONFIG.adsenseClient);
      ins.setAttribute("data-ad-slot", CONFIG.adsenseSlot);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      d.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    } else if (CONFIG.showPlaceholder) {
      d.style.cssText +=
        "border:1px dashed #444;border-radius:10px;" +
        "color:#777;font:600 12px system-ui,sans-serif;";
      d.textContent = "Ad space";
    } else {
      return null;
    }
    return d;
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

  function ensureSlot() {
    var sc = activeScreen();
    if (!sc) return;
    if (sc.lastElementChild && sc.lastElementChild.id === SLOT_ID) return;
    var old = sc.querySelector("#" + SLOT_ID);
    if (old) old.remove();
    var slot = makeSlot();
    if (slot) sc.appendChild(slot);
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
