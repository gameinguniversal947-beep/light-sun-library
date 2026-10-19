/* earnings.js — Light Sun Library: Earnings + Withdraw (v2)
   ----------------------------------------------------------------------------
   - Profile (jahan "Hello") ke neeche "Earnings" card dikhata hai.
   - Rule: ₹10 se MEHNGI kitaab par 20% platform fee (badal sakte ho).
   - "Withdraw" button: UPI ya Bank details daal ke payout request bhejo.
     (Payout mahine me ek baar process hota hai.)

   Lagane ka tarika:
   1) Is file ko repo me "earnings.js" naam se upload karo (purani ke upar).
   2) index.html me </body> se pehle ye line ho:
          <script src="earnings.js"></script>
   ============================================================================ */
(function () {
  "use strict";

  var CONFIG = {
    feePercent: 20,     // ₹10 se mehngi kitaab par itne % platform fee
    feeThreshold: 10,   // is ₹ tak koi fee nahi
    minPayout: 1,       // kam se kam kitna withdraw ho sakta hai
    payoutCycle: "har mahine (monthly)"
  };

  var CARD_ID = "__lsl_earnings";
  var OV_ID = "__lsl_pay_ov";
  var PAYOUT_KEY = "lsl_payouts";   // [{email, method, upi|bank, amount, at, status}]

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function inr(n) { return "\u20B9" + (Math.round((n || 0) * 100) / 100); }

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:24px;" +
      "z-index:2147483700;background:#222;color:#fff;border:1px solid #333;border-radius:12px;" +
      "padding:12px 16px;font:600 13px system-ui,sans-serif;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function compute() {
    var items = load("lsl_items", []) || [];
    var purchases = load("lsl_purchases", {}) || {};
    var payouts = load(PAYOUT_KEY, []) || [];
    var user = load("lsl_user", null);
    var email = user && user.email;

    var sales = {};
    Object.keys(purchases).forEach(function (b) {
      (purchases[b] || []).forEach(function (id) { sales[id] = (sales[id] || 0) + 1; });
    });

    var rows = [], gross = 0, fee = 0, net = 0;
    items.forEach(function (it) {
      if (!email || it.owner !== email) return;
      var price = Number(it.price) || 0;
      if (price <= 0) return;
      var count = sales[it.id] || 0;
      var f = price > CONFIG.feeThreshold ? price * CONFIG.feePercent / 100 : 0;
      gross += count * price;
      fee += count * f;
      net += count * (price - f);
      rows.push({ title: it.title, count: count, net: count * (price - f) });
    });

    var requested = payouts
      .filter(function (p) { return p.email === email && p.status !== "rejected"; })
      .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);

    return { email: email, gross: gross, fee: fee, net: net, requested: requested,
             balance: Math.max(0, net - requested), rows: rows };
  }

  /* ---------------- withdraw sheet ---------------- */
  function openWithdraw(d) {
    if (document.getElementById(OV_ID)) return;

    var ov = document.createElement("div");
    ov.id = OV_ID;
    ov.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.75);" +
      "display:flex;align-items:flex-end;justify-content:center;";

    var sheet = document.createElement("div");
    sheet.style.cssText = "width:100%;max-width:420px;background:#17171d;border:1px solid #26262f;" +
      "border-radius:18px 18px 0 0;padding:18px;color:#f4f4f6;" +
      "font-family:system-ui,-apple-system,sans-serif;max-height:90vh;overflow:auto;";

    var inp = "width:100%;margin-top:6px;padding:11px 12px;border-radius:10px;" +
      "border:1px solid #33333d;background:#0f0f14;color:#f4f4f6;font-size:14px;";
    var lbl = "display:block;font-size:12.5px;color:#9a9aa6;margin-top:12px;font-weight:700;";

    sheet.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:17px;font-weight:800;">Withdraw Earnings</div>' +
        '<button id="__pw_close" style="background:none;border:0;color:#9a9aa6;font-size:22px;cursor:pointer;">&times;</button>' +
      "</div>" +
      '<div style="margin-top:10px;padding:12px;border-radius:12px;background:#0f0f14;border:1px solid #26262f;">' +
        '<div style="font-size:12px;color:#9a9aa6;">Available balance</div>' +
        '<div style="font-size:22px;font-weight:900;color:#22c55e;">' + inr(d.balance) + "</div>" +
      "</div>" +

      '<div style="display:flex;gap:8px;margin-top:14px;">' +
        '<button id="__pw_upi" style="flex:1;padding:11px;border-radius:10px;border:1px solid #ff9800;' +
          'background:rgba(255,152,0,.14);color:#ff9800;font-weight:800;cursor:pointer;">UPI</button>' +
        '<button id="__pw_bank" style="flex:1;padding:11px;border-radius:10px;border:1px solid #33333d;' +
          'background:transparent;color:#9a9aa6;font-weight:800;cursor:pointer;">Bank Account</button>' +
      "</div>" +

      '<div id="__pw_upi_box">' +
        '<label style="' + lbl + '">UPI ID (jaise naam@bank / 98xxxxxx@upi)</label>' +
        '<input id="__pw_upi_id" style="' + inp + '" placeholder="naam@upi" autocomplete="off">' +
      "</div>" +

      '<div id="__pw_bank_box" style="display:none;">' +
        '<label style="' + lbl + '">Account holder ka naam</label>' +
        '<input id="__pw_ac_name" style="' + inp + '" placeholder="Poora naam">' +
        '<label style="' + lbl + '">Bank account number</label>' +
        '<input id="__pw_ac_no" style="' + inp + '" placeholder="Account number" inputmode="numeric">' +
        '<label style="' + lbl + '">IFSC / SWIFT code</label>' +
        '<input id="__pw_ac_ifsc" style="' + inp + '" placeholder="IFSC ya SWIFT" autocomplete="off">' +
      "</div>" +

      '<label style="' + lbl + '">Amount (\u20B9)</label>' +
      '<input id="__pw_amt" style="' + inp + '" inputmode="decimal" value="' + d.balance + '">' +

      '<div style="font-size:11.5px;color:#6b6b76;margin-top:10px;line-height:1.6;">' +
        "Payout " + CONFIG.payoutCycle + " process hota hai. Aapke diye gaye UPI / Bank par paisa bheja jayega." +
      "</div>" +

      '<button id="__pw_submit" style="width:100%;margin-top:14px;padding:13px;border:0;border-radius:12px;' +
        'background:linear-gradient(180deg,#ffb340,#ff9800);color:#1a1205;font-weight:900;font-size:15px;cursor:pointer;">' +
        "Request Payout</button>";

    ov.appendChild(sheet);
    document.body.appendChild(ov);

    var method = "upi";
    var upiBtn = sheet.querySelector("#__pw_upi");
    var bankBtn = sheet.querySelector("#__pw_bank");
    var upiBox = sheet.querySelector("#__pw_upi_box");
    var bankBox = sheet.querySelector("#__pw_bank_box");

    function setMethod(m) {
      method = m;
      var on = "flex:1;padding:11px;border-radius:10px;border:1px solid #ff9800;" +
        "background:rgba(255,152,0,.14);color:#ff9800;font-weight:800;cursor:pointer;";
      var off = "flex:1;padding:11px;border-radius:10px;border:1px solid #33333d;" +
        "background:transparent;color:#9a9aa6;font-weight:800;cursor:pointer;";
      upiBtn.style.cssText = m === "upi" ? on : off;
      bankBtn.style.cssText = m === "bank" ? on : off;
      upiBox.style.display = m === "upi" ? "block" : "none";
      bankBox.style.display = m === "bank" ? "block" : "none";
    }
    upiBtn.addEventListener("click", function () { setMethod("upi"); });
    bankBtn.addEventListener("click", function () { setMethod("bank"); });

    function close() { ov.remove(); }
    sheet.querySelector("#__pw_close").addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });

    sheet.querySelector("#__pw_submit").addEventListener("click", function () {
      var amt = parseFloat(sheet.querySelector("#__pw_amt").value);
      if (!(amt > 0)) { toast("Amount theek daalo"); return; }
      if (amt < CONFIG.minPayout) { toast("Minimum " + inr(CONFIG.minPayout) + " withdraw hota hai"); return; }
      if (amt > d.balance) { toast("Itna balance nahi hai"); return; }

      var rec = { email: d.email, method: method, amount: amt, at: Date.now(), status: "requested" };
      if (method === "upi") {
        var upi = sheet.querySelector("#__pw_upi_id").value.trim();
        if (!upi || upi.indexOf("@") === -1) { toast("UPI ID sahi daalo (jaise naam@upi)"); return; }
        rec.upi = upi;
      } else {
        var nm = sheet.querySelector("#__pw_ac_name").value.trim();
        var no = sheet.querySelector("#__pw_ac_no").value.trim();
        var ifsc = sheet.querySelector("#__pw_ac_ifsc").value.trim();
        if (!nm || !no || !ifsc) { toast("Bank ki saari details bharo"); return; }
        rec.bank = { name: nm, account: no, ifsc: ifsc };
      }

      var all = load(PAYOUT_KEY, []) || [];
      all.push(rec);
      save(PAYOUT_KEY, all);

      close();
      toast("Payout request bhej di \u2014 " + inr(amt) + " (" + method.toUpperCase() + ")");
      refresh();
    });
  }

  /* ---------------- card ---------------- */
  function buildCard() {
    var d = compute();
    if (!d.email) return null;

    var el = document.createElement("div");
    el.id = CARD_ID;
    el.className = "panel";
    el.style.cssText = "margin:14px 0;";

    var row = function (label, value, color, big) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;' +
        "padding:7px 0;border-bottom:1px solid #26262f;" + (big ? "font-size:16px;" : "") + '">' +
        "<span>" + label + "</span>" +
        '<b style="' + (color ? "color:" + color + ";" : "") + '">' + value + "</b></div>";
    };

    var html = '<div style="font-weight:800;color:#ff9800;margin-bottom:8px;">\uD83D\uDCB0 Earnings</div>';
    html += row("Total collected", inr(d.gross));
    html += row("Platform fee (" + CONFIG.feePercent + "%, \u20B9" + CONFIG.feeThreshold + "+)", "\u2212 " + inr(d.fee));
    html += row("Your earnings", inr(d.net), "#22c55e", true);
    html += row("Available to withdraw", inr(d.balance), "#22c55e", true);

    if (d.rows.length) {
      html += '<div style="font-size:12px;color:#9a9aa6;margin-top:8px;line-height:1.7;">';
      d.rows.forEach(function (r) {
        html += esc(r.title) + " \u2014 " + r.count + " sale(s) \u00B7 " + inr(r.net) + "<br>";
      });
      html += "</div>";
    } else {
      html += '<div style="font-size:12px;color:#9a9aa6;margin-top:8px;">Abhi tak koi paid sale nahi hui.</div>';
    }

    html += '<button id="__lsl_withdraw" style="width:100%;margin-top:12px;padding:12px;border:0;' +
      "border-radius:12px;background:linear-gradient(180deg,#ffb340,#ff9800);color:#1a1205;" +
      'font-weight:900;font-size:14px;cursor:pointer;">Withdraw \u2014 UPI / Bank</button>';

    html += '<div style="font-size:11px;color:#6b6b76;margin-top:8px;">' +
      "Payout " + CONFIG.payoutCycle + " process hota hai.</div>";

    el.innerHTML = html;

    var btn = el.querySelector("#__lsl_withdraw");
    btn.addEventListener("click", function () {
      var dd = compute();
      if (dd.balance < CONFIG.minPayout) { toast("Withdraw karne ke liye balance nahi hai"); return; }
      openWithdraw(dd);
    });

    return el;
  }

  function refresh() {
    var old = document.getElementById(CARD_ID);
    if (old) old.remove();
    inject();
  }

  function inject() {
    var screen = document.getElementById("screen-profile");
    if (!screen || !screen.classList.contains("active")) return;
    if (document.getElementById(CARD_ID)) return;

    var card = buildCard();
    if (!card) return;

    var firstPanel = screen.querySelector(".panel");
    if (firstPanel && firstPanel.parentNode) {
      firstPanel.parentNode.insertBefore(card, firstPanel.nextSibling);
    } else {
      screen.insertBefore(card, screen.firstChild);
    }
  }

  function boot() {
    inject();
    var target = document.getElementById("screens") || document.body;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; inject(); }, 60);
    }).observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    setInterval(function () {
      if (document.getElementById(CARD_ID)) return;
      inject();
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
            
