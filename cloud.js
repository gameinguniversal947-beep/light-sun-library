/* cloud.js — Light Sun Library: CLOUD (sab log apni book daal sakein)  (v3) */
(function () {
  "use strict";

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyDHSZwnFDRbhlZrTH-Ttp6QFZBIKy5fHn8",
    authDomain: "light-sun-library.firebaseapp.com",
    projectId: "light-sun-library",
    storageBucket: "light-sun-library.firebasestorage.app",
    messagingSenderId: "708451167939",
    appId: "1:708451167939:web:a5d59e78a247343d6fbc76"
  };

  var CLOUDINARY_CLOUD  = "y7squxyb";
  var CLOUDINARY_PRESET = "lsl_upload";
  var CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/auto/upload";

  var COLLECTION = "books";
  var MAX_MB = 20;
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  var ready = false, db = null, auth = null;
  var CLOUD = {};

  function toast(msg) {
    try { if (typeof window.toast === "function") window.toast(msg); } catch (e) {}
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function itemFrom(docId, d) {
    var f = d.fileType || (/\.cbz$/i.test(d.fileName || "") ? "cbz" : "pdf");
    return {
      id: "cl_" + docId,
      type: d.type === "comic" ? "comic" : "book",
      title: d.title || "Untitled",
      price: 0,
      thumb: d.cover || null,
      mine: !!d.mine,
      owner: d.author || null,
      createdAt: d.createdAt || 0,
      pageCount: d.pages || 0,
      fileType: f,
      video: d.video || null,
      cloud: true,
      cloudId: docId,
      fileUrl: d.url
    };
  }

  function inject(items) {
    if (typeof state === "undefined" || !state.items) return 0;
    state.items = state.items.filter(function (i) { return !i.cloud; });
    CLOUD = {};
    var added = 0;
    items.forEach(function (it) {
      if (!it.fileUrl) return;
      if (state.items.some(function (x) { return x.id === it.id; })) return;
      CLOUD[it.id] = it;
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
      else if (state.screen === "profile" && typeof renderProfile === "function") renderProfile();
      if (typeof updateBadge === "function") updateBadge();
    } catch (e) {}
  }

  function fetchList() {
    if (!db) return Promise.resolve(0);
    return db.collection(COLLECTION).orderBy("createdAt", "desc").limit(300).get()
      .then(function (snap) {
        var arr = [];
        snap.forEach(function (doc) { arr.push(itemFrom(doc.id, doc.data() || {})); });
        var n = inject(arr);
        refreshUI();
        return n;
      })
      .catch(function () { return 0; });
  }

  function patchGetFile() {
    if (typeof window.getFile !== "function" || window.getFile.__lslCloud) return;
    var orig = window.getFile;
    var patched = function (id) {
      var it = CLOUD[id];
      if (it && it.fileUrl) {
        return fetch(it.fileUrl).then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.blob();
        });
      }
      return orig.apply(this, arguments);
    };
    patched.__lslCloud = true;
    window.getFile = patched;
  }

  function patchPublish() {
    if (typeof window.finalisePublish !== "function" || window.finalisePublish.__lslCloud) return;
    var orig = window.finalisePublish;
    var patched = function (data) {
      var p = orig.apply(this, arguments);
      Promise.resolve(p).then(function () { setTimeout(function () { uploadNewest(data); }, 500); });
      return p;
    };
    patched.__lslCloud = true;
    window.finalisePublish = patched;
  }

  function newDocId() {
    return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function uploadNewest(data) {
    if (!ready || !db) return;
    var mine = (state.items || []).filter(function (i) { return i.mine && !i.cloud; });
    if (!mine.length) return;
    var it = mine[0];
    if (!it || !it.id) return;

    getFile(it.id).then(function (blob) {
      if (!blob) return;
      if (blob.size > MAX_MB * 1024 * 1024) { toast("File bahut badi hai (" + MAX_MB + " MB se kam rakho)"); return; }
      toast("Cloud par upload ho rahi hai\u2026");

      var fname = it.id + (it.fileType === "cbz" ? "_comic.cbz" : "_book.pdf");
      var fd = new FormData();
      fd.append("file", blob, fname);
      fd.append("upload_preset", CLOUDINARY_PRESET);

      return fetch(CLOUDINARY_URL, { method: "POST", body: fd })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (!j || !j.secure_url) {
            var msg = (j && j.error && j.error.message) ? j.error.message : "upload fail";
            throw new Error(msg);
          }
          return db.collection(COLLECTION).doc(newDocId()).set({
            title: it.title || "Untitled",
            type: it.type || "book",
            fileType: it.fileType || "pdf",
            pages: it.pageCount || 0,
            video: it.video || null,
            cover: it.thumb || null,
            author: it.owner || null,
            url: j.secure_url,
            createdAt: Date.now()
          });
        })
        .then(function () {
          it.cloud = true;
          toast("Cloud par pahunch gayi \u2014 ab sab log padh sakte hain! \u2705");
          return fetchList();
        });
    }).catch(function (e) {
      toast("Cloud upload nahi hua \u2014 " + (e && e.message ? e.message : "internet check karo"));
    });
  }

  function start() {
    if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "PASTE_YAHAN") return;
    if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) return;
    patchGetFile();
    patchPublish();

    Promise.all([
      loadScript(SDK + "firebase-app-compat.js"),
      loadScript(SDK + "firebase-firestore-compat.js"),
      loadScript(SDK + "firebase-auth-compat.js")
    ]).then(function () {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      auth = firebase.auth();
      return auth.signInAnonymously().catch(function () {});
    }).then(function () {
      ready = true;
      return fetchList();
    }).catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 500); });
  } else {
    setTimeout(start, 500);
  }

  window.reloadCloudLibrary = fetchList;
})();
