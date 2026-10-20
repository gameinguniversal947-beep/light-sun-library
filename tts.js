/* tts.js — Light Sun Library: "SUNO" (book padh ke sunaye)  (v2)
   ----------------------------------------------------------------------------
   NAYA v2:
   - Lamba page ab poora sunata hai (text chhote hisson me toot kar sunta hai,
     isliye browser beech me chup nahi hota).
   - Speed button: 1x / 2x / 3x — tap karke bolne ki raftaar badal sakte ho.

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

  var CONFIG = {
    lang: "hi-IN",       // default voice: Hindi
    rate: 1,             // bolne ki speed
    pitch: 1,
    autoContinue: true,  // page khatam -> agla page
    gapMs: 900,
    chunkSize: 180       // itne characters ke hisson me text toot kar sunta hai
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
    var voice = pickVoice(CONFIG.lang);

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
    }, 400);
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
        if (st.emptyStreak > 5) { stopSpeech(); toastMsg("Is page par text nahi mila"); return; }
        goNext();
        return;
      }
      st.emptyStreak = 0;
      if (!pickVoice(CONFIG.lang) && CONFIG.lang.indexOf("hi") === 0) {
        toastMsg("Hindi voice phone me nahi hai \u2014 Settings > Text-to-speech se install karo");
      }
      speakAll(t, goNext);
    });
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
    if (l) l.textContent = CONFIG.lang === "hi-IN" ? "हिंदी" : "English";
    var s = document.getElementById("__tts_speed");
    if (s) s.textContent = (CONFIG.rate === 1 ? "1x" : CONFIG.rate + "x");
  }

  function mkBtn(id, text, bottom, onClick) {
    var b = document.createElement("button");
    b.id = id;
    b.type = "button";
    b.textContent = text;
    b.style.cssText =
      "position:fixed;right:14px;bottom:calc(" + bottom + "px + env(safe-area-inset-bottom));" +
      "z-index:60;border:1px solid #33333d;border-radius:999px;padding:10px 16px;background:#1b1b22;" +
      "color:#e7e7ee;font:800 13px system-ui,-apple-system,sans-serif;cursor:pointer;display:none;";
    b.addEventListener("click", onClick);
    document.body.appendChild(b);
    return b;
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
      mkBtn("__tts_lang", "हिंदी", 126, function () {
        CONFIG.lang = CONFIG.lang === "hi-IN" ? "en-IN" : "hi-IN";
        updateLabel();
        if (st.on) { try { synth.cancel(); } catch (e) {} st.qi = 0; setTimeout(readCurrent, 200); }
      });
    }
    if (!document.getElementById("__tts_speed")) {
      mkBtn("__tts_speed", "1x", 178, function () {
        CONFIG.rate = CONFIG.rate === 1 ? 2 : (CONFIG.rate === 2 ? 3 : 1);
        updateLabel();
        if (st.on) { try { synth.cancel(); } catch (e) {} st.qi = 0; setTimeout(readCurrent, 200); }
      });
    }
  }

  function sync() {
    var r = document.getElementById("reader");
    var on = !!(r && r.classList.contains("show"));
    ["__tts_btn", "__tts_lang", "__tts_speed"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = on ? "block" : "none";
    });
    if (!on) stopSpeech();
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
      
