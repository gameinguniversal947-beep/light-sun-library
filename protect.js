/* protect.js — Light Sun Library anti-screenshot deterrent */
(function () {
  "use strict";
  function readerLabel() {
    try {
      var u = JSON.parse(localStorage.getItem("lsl_user") || "null");
      if (u && (u.email || u.name)) return (u.email || u.name);
    } catch (e) {}
    return "Guest";
  }
  var stamp = readerLabel() + "  •  " + new Date().toLocaleString("en-IN");
  var wm = document.createElement("div");
  wm.id = "__lsl_wm";
  wm.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden;display:none;";
  document.body.appendChild(wm);
  function fillWatermark() {
    wm.innerHTML = "";
    var stepX = 260, stepY = 100;
    var cols = Math.ceil(window.innerWidth / stepX) + 2;
    var rows = Math.ceil(window.innerHeight / stepY) + 2;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var s = document.createElement("span");
      s.textContent = stamp;
      s.style.cssText = "position:absolute;transform:rotate(-28deg);white-space:nowrap;font:600 13px/1 system-ui,sans-serif;letter-spacing:1px;color:rgba(255,255,255,.16);left:" + (c*stepX-60) + "px;top:" + (r*stepY-20) + "px;";
      wm.appendChild(s);
    }
  }
  var readerEl = document.getElementById("reader");
  function syncVisibility() {
    var open = readerEl && readerEl.classList.contains("show");
    wm.style.display = open ? "block" : "none";
  }
  if (readerEl && window.MutationObserver)
    new MutationObserver(syncVisibility).observe(readerEl, { attributes: true, attributeFilter: ["class"] });
  syncVisibility();
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("dragstart",   function (e) { e.preventDefault(); });
  document.addEventListener("selectstart", function (e) { e.preventDefault(); });
  document.addEventListener("copy",        function (e) { e.preventDefault(); });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["s","p","u","a"].indexOf(k) !== -1) { e.preventDefault(); flash(); }
    if (k === "printscreen") { e.preventDefault(); try { navigator.clipboard.writeText(""); } catch (_) {} flash(); }
  });
  function away() {
    if (!readerEl || !readerEl.classList.contains("show")) return;
    readerEl.style.filter = "blur(18px)";
    var s = document.getElementById("__lsl_shield");
    if (!s) {
      s = document.createElement("div"); s.id = "__lsl_shield";
      s.style.cssText = "position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.96);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font:600 16px system-ui,sans-serif;padding:24px;";
      s.textContent = "Content hidden — app not in focus"; document.body.appendChild(s);
    }
    s.style.display = "flex";
  }
  function back() {
    if (readerEl) readerEl.style.filter = "";
    var s = document.getElementById("__lsl_shield"); if (s) s.style.display = "none";
  }
  window.addEventListener("blur", away);
  window.addEventListener("focus", back);
  document.addEventListener("visibilitychange", function () { document.hidden ? away() : back(); });
  function flash() { away(); setTimeout(back, 900); }
  window.addEventListener("resize", function () { fillWatermark(); syncVisibility(); });
  fillWatermark();
})();
