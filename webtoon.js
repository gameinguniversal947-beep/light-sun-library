/* webtoon.js — Light Sun Library: comic ke liye SCROLL + AUTO-SCROLL  (v4)
   ----------------------------------------------------------------------------
   Sirf COMIC (CBZ) ke liye. Reader me do chhote button aate hain:

     1)  📜  Scroll mode  — poori comic ek ke neeche ek, niche scroll karke padho
     2)  ▶   Auto-scroll  — dabao to comic khud scroll hone lagti hai
                            (▶ = dheere, ▶▶ = medium, ▶▶▶ = tez, phir OFF)
     3)  🔊  Suno         — us page par jo likha hai, wo padh ke sunata hai
                            (button dabane par hi chalu hota hai)

   NOTE: comic me text tasveer ke andar hota hai, isliye use padhne ke liye
   OCR (Tesseract) use hota hai — pehli baar thoda time aur data lagega,
   aur stylized text me galti ho sakti hai.

   NAYA v4:
   - "Suno" (speak) button HATA diya. Ab comic me sirf SCROLL ke button hain:
       📜  Scroll mode      ▶  Auto-scroll (▶ dheere, ▶▶ medium, ▶▶▶ tez, phir OFF)
   - Ye button SIRF comic (CBZ) me aate hain, book (PDF) me nahi.

   v3:
   - "Suno" ab page khud NAHI badalta. Jo page khula hai, bas usi ko padh ke sunata
     hai, phir ruk jaata hai. Page badalne ke liye scroll karo ya Next dabao.
   - Auto-scroll ke liye alag button hai (▶) — wahi scroll karta hai.

   Lagane ka tarika:
   1) Is file ko repo me "webtoon.js" naam se upload karo.
   2) index.html me </body> se pehle ye line daalo:
          <script src="webtoon.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    scrollModeDefault: true,          // comic kholne par seedha scroll mode
    speeds: [0.45, 0.95, 1.7],        // px per frame (dheere / medium / tez)
    ocrLang: "eng",                   // comic ka text aksar English hota hai
    ocrAutoNext: false,               // sunne ke baad page khud na badle (scroll/Next se badlo)
    tesseractSrc: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
  };

  var scrollMode = { on: CONFIG.scrollModeDefault };
  var auto = { level: 0, raf: null };
  var voice = { on: false, busy: false };

  function readerObj() {
    try { return (typeof reader !== "undefined") ? reader : null; } catch (e) { return null; }
  }
  function view() { return document.getElementById("readerView"); }
  function isComic() {
    var r = readerObj();
    return !!(r && r.type === "cbz" && r.images && r.images.length);
  }
  function toastMsg(m) { try { if (typeof toast === "function") toast(m); } catch (e) {} }

  /* =====================================================================
     1) SCROLL MODE  (poori comic ek column me)
     ===================================================================== */

  function renderScroll() {
    var r = readerObj(), v = view();
    if (!r || !v || !r.images.length) return;

    v.innerHTML = "";
    v.style.display = "block";
    v.style.padding = "0";
    v.scrollTop = 0;

    var col = document.createElement("div");
    col.id = "__wt_col";
    col.style.cssText = "display:flex;flex-direction:column;align-items:center;width:100%;";

    r.images.forEach(function (src, i) {
      var im = document.createElement("img");
      im.src = src;
      im.dataset.idx = String(i + 1);
      if (i < 3) im.loading = "eager"; else im.loading = "lazy";
      im.style.cssText = "width:100%;display:block;margin:0;padding:0;";
      col.appendChild(im);
    });

    v.appendChild(col);
    trackScroll();
  }

  function scrollToPage(n) {
    var v = view();
    if (!v) return;
    var r = readerObj();
    if (!r) return;
    n = Math.max(1, Math.min(r.total, n));
    var im = v.querySelector('img[data-idx="' + n + '"]');
    if (im) {
      v.scrollTop = Math.max(0, im.offsetTop - 6);
      r.page = n;
      if (typeof updateReaderUI === "function") updateReaderUI();
    }
  }

  function currentVisiblePage() {
    var v = view(), r = readerObj();
    if (!v || !r) return 1;
    var imgs = v.querySelectorAll("img[data-idx]");
    if (!imgs.length) return r.page;
    var mid = v.scrollTop + v.clientHeight * 0.4;
    var best = 1, bestD = Infinity;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var c = im.offsetTop + im.offsetHeight / 2;
      var d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = parseInt(im.dataset.idx, 10) || 1; }
    }
    return best;
  }

  var trackT = null;
  function trackScroll() {
    if (trackT) return;
    trackT = setTimeout(function () {
      trackT = null;
      var r = readerObj();
      if (!r || !scrollMode.on) return;
      var p = currentVisiblePage();
      if (p !== r.page) {
        r.page = p;
        if (typeof updateReaderUI === "function") updateReaderUI();
      }
    }, 150);
  }

  function exitScrollMode() {
    var v = view(), r = readerObj();
    if (v) { v.style.display = ""; v.style.padding = ""; }
    stopAuto();
    if (r && typeof showCbzPageOrig === "function") showCbzPageOrig(r.page);
  }

  function toggleScroll() {
    if (!isComic()) { toastMsg("Scroll mode sirf comic me milta hai"); return; }
    scrollMode.on = !scrollMode.on;
    updateBtns();
    if (scrollMode.on) { renderScroll(); }
    else { exitScrollMode(); }
  }

  /* =====================================================================
     2) AUTO-SCROLL
     ===================================================================== */

  function startAuto() {
    var v = view();
    if (!v || !isComic()) return;
    if (!scrollMode.on) { scrollMode.on = true; renderScroll(); }
    var speed = CONFIG.speeds[Math.max(0, auto.level - 1)] || CONFIG.speeds[0];

    (function step() {
      if (auto.level <= 0) return;
      var vv = view();
      if (!vv) return;
      vv.scrollTop += speed;
      if (vv.scrollTop + vv.clientHeight >= vv.scrollHeight - 2) { stopAuto(); return; }
      auto.raf = requestAnimationFrame(step);
    })();
  }

  function stopAuto() {
    auto.level = 0;
    if (auto.raf) { cancelAnimationFrame(auto.raf); auto.raf = null; }
    updateBtns();
  }

  function cycleAuto() {
    if (!isComic()) { toastMsg("Auto-scroll sirf comic me milta hai"); return; }
    if (auto.raf) { cancelAnimationFrame(auto.raf); auto.raf = null; }
    auto.level = (auto.level + 1) % (CONFIG.speeds.length + 1);
    updateBtns();
    if (auto.level > 0) startAuto();
  }

  /* =====================================================================
     3) SUNO (OCR + voice)
     ===================================================================== */

  var tessLoading = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (tessLoading) return tessLoading;
    tessLoading = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = CONFIG.tesseractSrc;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("OCR load failed")); };
      document.head.appendChild(s);
    });
    return tessLoading;
  }

  function ocrPage(idx) {
    var r = readerObj();
    if (!r || !r.images[idx]) return Promise.reject(new Error("no image"));
    return loadTesseract().then(function () {
      return window.Tesseract.recognize(r.images[idx], CONFIG.ocrLang);
    }).then(function (res) {
      return ((res && res.data && res.data.text) || "").replace(/\s+/g, " ").trim();
    });
  }

  function pickVoice(lang) {
    try {
      var vs = window.speechSynthesis.getVoices() || [];
      var want = lang.toLowerCase(), base = want.split("-")[0], i;
      for (i = 0; i < vs.length; i++) if ((vs[i].lang || "").toLowerCase().replace("_", "-") === want) return vs[i];
      for (i = 0; i < vs.length; i++) if ((vs[i].lang || "").toLowerCase().indexOf(base) === 0) return vs[i];
    } catch (e) {}
    return null;
  }

  function speakText(text, done) {
    var synth = window.speechSynthesis;
    try { synth.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    var hindi = /[\u0900-\u097F]/.test(text);
    u.lang = hindi ? "hi-IN" : "en-IN";
    var v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.rate = 1;
    u.onend = done;
    u.onerror = done;
    try { synth.speak(u); } catch (e) { done(); }
  }

  function stopVoice() {
    voice.on = false; voice.busy = false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    updateBtns();
  }

  function nextOcr() {
    if (!voice.on) return;
    var r = readerObj();
    if (!r) { stopVoice(); return; }
    if (r.page > r.total) { stopVoice(); toastMsg("Comic poori ho gayi"); return; }

    voice.busy = true;
    updateBtns();
    toastMsg("Text padha ja raha hai\u2026 (page " + r.page + ")");

    ocrPage(r.page - 1).then(function (text) {
      if (!voice.on) return;
      voice.busy = false;
      updateBtns();
      if (!text) {
        if (CONFIG.ocrAutoNext && r.page < r.total) {
          scrollToPage(r.page + 1);
          setTimeout(nextOcr, 400);
        } else { stopVoice(); toastMsg("Is page par text nahi mila"); }
        return;
      }
      speakText(text, function () {
        if (!voice.on) return;
        if (CONFIG.ocrAutoNext && r.page < r.total) {
          scrollToPage(r.page + 1);
          setTimeout(nextOcr, 500);
        } else { stopVoice(); }
      });
    }).catch(function () {
      stopVoice();
      toastMsg("Text nahi padh paya \u2014 internet check karo");
    });
  }

  function toggleVoice() {
    if (!isComic()) return;
    if (voice.on) { stopVoice(); return; }
    if (auto.level > 0) stopAuto();     // dono ek saath nahi
    voice.on = true;
    updateBtns();
    nextOcr();
  }

  /* =====================================================================
     BUTTONS
     ===================================================================== */

  function mkBtn(id, text) {
    var b = document.createElement("button");
    b.id = id;
    b.type = "button";
    b.textContent = text;
    b.style.cssText =
      "border:1px solid #33333d;border-radius:999px;padding:10px 14px;background:#1b1b22;" +
      "color:#e7e7ee;font:800 13px system-ui,-apple-system,sans-serif;cursor:pointer;" +
      "box-shadow:0 6px 18px rgba(0,0,0,.45);min-width:46px;";
    return b;
  }

  function buildBar() {
    if (document.getElementById("__wt_bar")) return;
    var bar = document.createElement("div");
    bar.id = "__wt_bar";
    bar.style.cssText =
      "position:fixed;right:12px;bottom:calc(74px + env(safe-area-inset-bottom));z-index:341;" +
      "display:none;flex-direction:column;gap:8px;align-items:flex-end;";
    document.body.appendChild(bar);

    var s = mkBtn("__wt_scroll", "\uD83D\uDCDC");
    s.title = "Scroll mode";
    s.addEventListener("click", toggleScroll);
    bar.appendChild(s);

    var a = mkBtn("__wt_auto", "\u25B6");
    a.title = "Auto-scroll";
    a.addEventListener("click", cycleAuto);
    bar.appendChild(a);

  }

  function updateBtns() {
    var s = document.getElementById("__wt_scroll");
    if (s) {
      s.textContent = "\uD83D\uDCDC";
      s.style.background = scrollMode.on ? "#2a2a33" : "#1b1b22";
      s.style.color = scrollMode.on ? "#ffb340" : "#e7e7ee";
    }
    var a = document.getElementById("__wt_auto");
    if (a) {
      a.textContent = auto.level === 0 ? "\u25B6" : ("\u25B6".repeat(auto.level));
      a.style.background = auto.level > 0 ? "#2a2a33" : "#1b1b22";
      a.style.color = auto.level > 0 ? "#ffb340" : "#e7e7ee";
    }
  }

  function sync() {
    var rEl = document.getElementById("reader");
    var open = !!(rEl && rEl.classList.contains("show"));
    var comic = open && isComic();

    var bar = document.getElementById("__wt_bar");
    if (bar) bar.style.display = comic ? "flex" : "none";

    /* comic me tts.js ke button ki zaroorat nahi (wo PDF ke liye hai) */
    ["__tts_btn", "__tts_lang"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = comic ? "none" : el.style.display;
    });

    if (!open) { stopAuto(); stopVoice(); }
  }

  /* ---------- comic khulte hi scroll mode laga do ---------- */
  function waitAndScroll() {
    if (!scrollMode.on) return;
    var tries = 0;
    (function w() {
      if (!document.getElementById("reader").classList.contains("show")) return;
      if (isComic()) { renderScroll(); updateBtns(); return; }
      if (tries++ < 120) setTimeout(w, 150);
    })();
  }

  /* ---------- init ---------- */
  buildBar();

  var showCbzPageOrig = window.showCbzPage;
  if (typeof showCbzPageOrig === "function") {
    window.showCbzPage = function (n) {
      if (scrollMode.on && isComic()) { scrollToPage(n); return; }
      return showCbzPageOrig.apply(this, arguments);
    };
  }

  var rEl = document.getElementById("reader");
  if (rEl) {
    new MutationObserver(function () {
      sync();
      if (rEl.classList.contains("show")) waitAndScroll();
    }).observe(rEl, { attributes: true, attributeFilter: ["class"] });
  }
  var v0 = view();
  if (v0) v0.addEventListener("scroll", trackScroll, { passive: true });

  var closeBtn = document.getElementById("readerClose");
  if (closeBtn) closeBtn.addEventListener("click", function () { stopAuto(); stopVoice(); });

  updateBtns();
  sync();
})();
