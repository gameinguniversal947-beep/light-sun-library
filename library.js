/* library.js — Light Sun Library: SHARED LIBRARY  (v1)
   ============================================================================
   KYUN: Pehle jo book aap app se publish karte the, wo SIRF aapke phone me
   save hoti thi. Doosre logon ko khali library dikhti thi.

   AB: repo me ek "library.json" file hogi. Usme jo books/comics likhi hongi,
   wo HAR KISI KO dikhengi — aapke phone par, dost ke phone par, sab par.
   Files repo ke "books/" folder se load hoti hain (GitHub Pages se, free).

   KAISE KAAM KARTA HAI:
   - App khulte hi library.json padhta hai.
   - Usme likhi har kitaab library me add ho jaati hai (title + cover + file).
   - Jab koi kitaab kholta hai, file internet se download hoti hai aur padhi jaati hai.
   - Ye kitaabein delete nahi ho sakti (wo sabki hain), par "Save" (star) kar sakte ho.

   LAGANE KA TARIKA:
   1) Ye file repo me "library.js" naam se upload karo.
   2) library.json bhi repo me upload karo (root me).
   3) Kitaabon ki PDF/CBZ files repo ke "books/" folder me upload karo.
   4) index.html me </body> se pehle ye line ho:
          <script src="library.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    manifest: "./library.json"   // repo ki list file
  };

  var SHARED = {};   // id -> item

  /* ek json entry ko app ke item jaisa banao */
  function toItem(e) {
    var f = e.file || "";
    var ft = e.fileType || (/\.cbz$/i.test(f) ? "cbz" : "pdf");
    return {
      id: "lib_" + (e.id || f),
      type: e.type === "comic" ? "comic" : "book",
      title: e.title || "Untitled",
      price: 0,
      thumb: e.cover || null,
      mine: false,
      owner: e.author || null,
      createdAt: e.added ? (Date.parse(e.added) || 0) : 0,
      pageCount: e.pages || 0,
      fileType: ft,
      video: e.video || null,
      shared: true,
      fileUrl: f
    };
  }

  /* library.json ki kitaabein state.items me daalo */
  function inject(items) {
    if (typeof state === "undefined" || !state.items) return 0;

    /* purani shared kitaabein hata do, taaki list hamesha json se match kare */
    state.items = state.items.filter(function (i) { return !i.shared; });
    SHARED = {};

    var added = 0;
    items.forEach(function (e) {
      if (!e || !e.file) return;
      var it = toItem(e);
      if (state.items.some(function (x) { return x.id === it.id; })) return;
      SHARED[it.id] = it;
      state.items.push(it);
      added++;
    });
    return added;
  }

  function refreshUI() {
    try {
      if (typeof state === "undefined" || !state.items) return;
      if (state.screen === "comics" && typeof renderComics === "function") renderComics();
      else if (state.screen === "home" && typeof renderHome === "function") renderHome();
      else if (state.screen === "save" && typeof renderSave === "function") renderSave();
      if (typeof updateBadge === "function") updateBadge();
    } catch (e) {}
  }

  /* getFile ko patch karo: shared kitaab ki file internet se laao */
  function patchGetFile() {
    if (typeof window.getFile !== "function" || window.getFile.__lslShared) return;
    var orig = window.getFile;
    var patched = function (id) {
      var it = SHARED[id];
      if (it && it.fileUrl) {
        return fetch(it.fileUrl).then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.blob();
        });
      }
      return orig.apply(this, arguments);
    };
    patched.__lslShared = true;
    window.getFile = patched;
  }

  function load() {
    var url = CONFIG.manifest + "?v=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return 0;
        var list = Array.isArray(j) ? j : (j.books || j.items || []);
        var n = inject(list);
        refreshUI();
        return n;
      })
      .catch(function () { return 0; });
  }

  function start() {
    patchGetFile();
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 400); });
  } else {
    setTimeout(start, 400);
  }

  /* kabhi list dobara load karni ho */
  window.reloadSharedLibrary = load;
})();
      
