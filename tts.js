/* tts.js — Light Sun Library: "SUNO" (book padh ke sunaye)  (v6)
   ----------------------------------------------------------------------------
   NAYA v3:
   - FIX: buttons reader ke PEECHHE chhup jaate the (z-index chhota tha).
     Ab wo reader ke upar dikhte hain.

   NAYA v6:
   - Bhasha button ab 11 bhashayein deta hai (हिंदी, English, বাংলা, मराठी, தமிழ்,
     తెలుగు, ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, اردو). Button dabao -> list khulti hai.
   - "सुनो" dabane par page ka text CHUNI HUI BHASHA ME TRANSLATE hokar sunaya jaata
     hai. Agar translate na ho paaye to original text hi padh diya jaata hai.

   v5:
   - Page khud-ba-khud BAHUT TEZ badal rahe the (khaali page par to ek ke baad ek
     flip hote the). Ab agla page khulne se pehle 1.8 second rukega, aur khaali
     page par turant ruk jayega. Page badalne ke liye apna "Next" button bhi hai.

   v4:
   - Speed button (1x / 2x / 3x) hata diya — ab sirf 2 button:
     "सुनो / रोको"  aur  "हिंदी / English".

   v2:
   - Lamba page ab poora sunata hai (text chhote hisson me toot kar sunta hai,
     isliye browser beech me chup nahi hota).

   - Reader me "🔊 सुनो" button aata hai. Dabane par page ZOR SE padh ke sunata hai.
   - Default voice: HINDI. "हिंदी / English" button se badal sakte ho.
   - Page khatam -> agla page khud padhta hai.
   - Sirf PDF me chalta hai (comic me sirf tasveerein hoti hain).

   Lagane ka tarika:
   1) Is file ko repo me "tts.js" naam se upload karo.
   2) index.html me </body> se pehle ye line ho:
          <script src="tts.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  /* ---------- bhashayein (jitni zyada cover ho sakein) ---------- */
  var LANGS = [
    { c: "hi-IN", t: "hi", n: "हिंदी" },
    { c: "en-IN", t: "en", n: "English" },
    { c: "bn-IN", t: "bn", n: "বাংলা" },
    { c: "mr-IN", t: "mr", n: "मराठी" },
    { c: "ta-IN", t: "ta", n: "தமிழ்" },
    { c: "te-IN", t: "te", n: "తెలుగు" },
    { c: "gu-IN", t: "gu", n: "ગુજરાતી" },
    { c: "kn-IN", t: "kn", n: "ಕನ್ನಡ" },
    { c: "ml-IN", t: "ml", n: "മലയാളം" },
    { c: "pa-IN", t: "pa", n: "ਪੰਜਾਬੀ" },
    { c: "ur-IN", t: "ur", n: "اردو" }
  ];
  function curLang() { return LANGS[Math.max(0, Math.min(LANGS.length - 1, CONFIG.langIdx))]; }

  var CONFIG = {
    langIdx: 0,          // LANGS me se kaunsi bhasha (0 = हिंदी)
    rate: 1,             // bolne ki speed
    pitch: 1,
    translate: true,     // page ka text chuni hui bhasha me translate karke padho
    autoContinue: true,  // page khatam -> agla page
    gapMs: 900,
    turnMs: 1800,        // agla page khulne se pehle kitna rukna hai
    chunkSize: 180,      // itne characters ke hisson me text toot kar sunta hai
    trChunk: 900,        // translate ke liye ek baar me itne character
    trMs: 9000,          // translate ka timeout
    trUrl: "https://translate.googleapis.com/translate_a/single"
  };

  var st = { on: false, internal: false, emptyStreak: 0, queue: [], qi: 0 };
  var synth = window.speechSynthesis;

  function readerObj() {
    try { return (typeof reader !== "undefined") ? reader : null; } catch (e) { return null; }
  }
  function toastMsg(m) { try { if (typeof toast === "function") toast(m); } catch (e) {} }

  /* ---------- voices ---------- */
  function loadVoices() { try { synth.getVoices(); } catch (e) {} }
  loadVoices();
  try { synth.onvoiceschanged = loadVoices; } catch (e) {}

  function pickVoice(lang) {
    try {
      var vs = synth.getVoices() || [];
      var want = lang.toLowerCase(), base = want.split("-")[0], i;
      for (i = 0; i < vs.length; i++) if ((vs[i].lang || "").toLowerCase().replace("_", "-") === want) return vs[i];
      for (i = 0; i < vs.length; i++) if ((vs[i].lang || "").toLowerCase().indexOf(base) === 0) return vs[i];
      for (i = 0; i < vs.length; i++) if (base === "hi" && /hindi/i.test(vs[i].name || "")) return vs[i];
    } catch (e) {}
    return null;
  }

  /* ---------- page text ---------- */
  function pageText() {
    var r = readerObj();
    if (!r || r.type !== "pdf" || !r.pdf) return Promise.resolve(null);
    return r.pdf.getPage(r.page).then(function (p) {
      return p.getTextContent();
    }).then(function (tc) {
      var t = (tc.items || []).map(function (it) { return it.str || ""; }).join(" ");
      return t.replace(/\s+/g, " ").trim();
    }).catch(function () { return ""; });
  }

  /* ---------- text ko chhote hisson me todo (lamba page ke liye) ---------- */
  function chunk(text, size) {
    var out = [], buf = "", words = text.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if ((buf + " " + words[i]).trim().length > size) {
        if (buf.trim()) out.push(buf.trim());
        buf = words[i];
      } else {
        buf += " " + words[i];
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.length ? out : [text];
  }

  /* ---------- bolna ---------- */
  function speakAll(text, done) {
    try { synth.cancel(); } catch (e) {}
    var parts = chunk(text, CONFIG.chunkSize);
    var voice = pickVoice(curLang().c);

    function step() {
      if (!st.on) return;
      if (st.qi >= parts.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(parts[st.qi++]);
      if (voice) u.voice = voice;
      u.lang = CONFIG.lang;
      u.rate = CONFIG.rate;
      u.pitch = CONFIG.pitch;
      u.onend = step;
      u.onerror = step;
      try { synth.speak(u); } catch (e) { done(); }
    }
    st.qi = 0;
    step();
  }

  function goNext() {
    if (!st.on) return;
    var r = readerObj();
    if (!r) { stopSpeech(); return; }
    if (!CONFIG.autoContinue || r.page >= r.total) {
      stopSpeech();
      toastMsg(r.page >= r.total ? "Kitaab poori ho gayi" : "Ruk gaya");
      return;
    }
    setTimeout(function () {
      if (!st.on) return;
      st.internal = true;
      try { if (typeof readerGoto === "function") readerGoto(r.page + 1); } catch (e) {}
      st.internal = false;
      setTimeout(readCurrent, CONFIG.gapMs);
    }, CONFIG.turnMs);
  }

  function readCurrent() {
    if (!st.on) return;
    var r = readerObj();
    if (!r) { stopSpeech(); return; }
    if (r.type !== "pdf" || !r.pdf) {
      stopSpeech();
      toastMsg("Is file me text nahi hai (comic ke liye webtoon.js dekho)");
      return;
    }
    pageText().then(function (t) {
      if (!st.on) return;
      if (!t) {
        st.emptyStreak++;
        if (st.emptyStreak > 2) { stopSpeech(); toastMsg("Is page par text nahi mila \u2014 ruk gaya"); return; }
        setTimeout(goNext, CONFIG.turnMs);
        return;
      }
      st.emptyStreak = 0;
      if (!pickVoice(curLang().c)) {
        toastMsg(curLang().n + " ki voice phone me nahi hai \u2014 Settings > Text-to-speech se install karo");
      }
      translateText(t).then(function (out) {
        if (!st.on) return;
        speakAll(out || t, goNext);
      });
    });
  }

  /* ---------- translate (page ka text -> chuni hui bhasha) ---------- */
  function fetchT(url, ms) {
    return new Promise(function (res, rej) {
      var ctl = ("AbortController" in window) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) {} } rej(new Error("timeout")); }, ms);
      fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
        clearTimeout(t); res(r);
      }).catch(function (e) { clearTimeout(t); rej(e); });
    });
  }

  function trOne(text, to) {
    var url = CONFIG.trUrl + "?client=gtx&sl=auto&tl=" + encodeURIComponent(to) +
              "&dt=t&q=" + encodeURIComponent(text);
    return fetchT(url, CONFIG.trMs).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j[0]) return null;
      var out = "";
      j[0].forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
      return out || null;
    });
  }

  function translateText(text) {
    if (!CONFIG.translate || !text) return Promise.resolve(text);
    var to = curLang().t;
    var parts = chunk(text, CONFIG.trChunk);
    return Promise.all(parts.map(function (p) {
      return trOne(p, to).catch(function () { return null; });
    })).then(function (arr) {
      for (var i = 0; i < arr.length; i++) if (arr[i] === null) return text;   // koi fail -> original
      var out = arr.join(" ");
      return out || text;
    }).catch(function () { return text; });
  }

  /* ---------- start / stop ---------- */
  function startSpeech() {
    st.on = true; st.emptyStreak = 0;
    updateLabel();
    readCurrent();
  }
  function stopSpeech() {
    st.on = false;
    try { synth.cancel(); } catch (e) {}
    updateLabel();
  }
  function toggle() { st.on ? stopSpeech() : startSpeech(); }

  /* ---------- buttons ---------- */
  function updateLabel() {
    var b = document.getElementById("__tts_btn");
    if (b) b.textContent = st.on ? "\u23F9  रोको" : "\uD83D\uDD0A  सुनो";
    var l = document.getElementById("__tts_lang");
    if (l) l.textContent = curLang().n;
  }

  function mkBtn(id, text, bottom, onClick) {
    var b = document.createElement("button");
    b.id = id;
    b.type = "button";
    b.textContent = text;
    b.style.cssText =
      "position:fixed;right:14px;bottom:calc(" + bottom + "px + env(safe-area-inset-bottom));" +
      "z-index:340;border:1px solid #33333d;border-radius:999px;padding:10px 16px;background:#1b1b22;" +
      "color:#e7e7ee;font:800 13px system-ui,-apple-system,sans-serif;cursor:pointer;display:none;";
    b.addEventListener("click", onClick);
    document.body.appendChild(b);
    return b;
  }

  function openLangMenu() {
    var ex = document.getElementById("__tts_menu");
    if (ex) { ex.remove(); return; }
    var m = document.createElement("div");
    m.id = "__tts_menu";
    m.style.cssText =
      "position:fixed;right:14px;bottom:calc(176px + env(safe-area-inset-bottom));z-index:345;" +
      "background:#1b1b22;border:1px solid #33333d;border-radius:14px;padding:6px;display:flex;" +
      "flex-direction:column;gap:2px;max-height:50vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.55);";
    LANGS.forEach(function (L, i) {
      var it = document.createElement("button");
      it.type = "button";
      it.textContent = L.n;
      it.style.cssText =
        "border:0;background:" + (i === CONFIG.langIdx ? "#2a2a33" : "transparent") + ";" +
        "color:" + (i === CONFIG.langIdx ? "#ffb340" : "#e7e7ee") + ";text-align:left;" +
        "font:800 14px system-ui,-apple-system,sans-serif;padding:10px 18px;border-radius:10px;cursor:pointer;";
      it.addEventListener("click", function () {
        CONFIG.langIdx = i;
        try { m.remove(); } catch (e) {}
        updateLabel();
        toastMsg("Bhasha: " + L.n);
        if (st.on) { try { synth.cancel(); } catch (e) {} st.qi = 0; setTimeout(readCurrent, 200); }
      });
      m.appendChild(it);
    });
    document.body.appendChild(m);
  }

  function inject() {
    if (!document.body) return;
    if (!document.getElementById("__tts_btn")) {
      var b = mkBtn("__tts_btn", "\uD83D\uDD0A  सुनो", 74, toggle);
      b.style.background = "linear-gradient(180deg,#ffb340,#ff9800)";
      b.style.color = "#1a1205";
      b.style.border = "0";
    }
    if (!document.getElementById("__tts_lang")) {
      mkBtn("__tts_lang", curLang().n, 126, openLangMenu);
    }
  }

  function sync() {
    var r = document.getElementById("reader");
    var on = !!(r && r.classList.contains("show"));
    ["__tts_btn", "__tts_lang"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = on ? "block" : "none";
    });
    if (!on) { stopSpeech(); var mm = document.getElementById("__tts_menu"); if (mm) mm.remove(); }
  }

  inject();
  var r0 = document.getElementById("reader");
  if (r0) new MutationObserver(sync).observe(r0, { attributes: true, attributeFilter: ["class"] });
  sync();

  ["readerGoto", "readerGo"].forEach(function (name) {
    var orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function () {
      var out = orig.apply(this, arguments);
      if (st.on && !st.internal) {
        try { synth.cancel(); } catch (e) {}
        st.emptyStreak = 0; st.qi = 0;
        setTimeout(readCurrent, CONFIG.gapMs);
      }
      return out;
    };
  });

  var closeBtn = document.getElementById("readerClose");
  if (closeBtn) closeBtn.addEventListener("click", stopSpeech);
})();
                                         
