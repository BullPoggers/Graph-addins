/* Task pane logic: parse equations, draw on a canvas, insert into OneNote. */
(function () {
  var COLORS = ["#7719aa", "#c43e1c", "#0f7b0f", "#005a9e", "#b8860b", "#038387"];
  var cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  var W = cv.width, H = cv.height;
  var view = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };
  var $ = function (id) { return document.getElementById(id); };
  var funcs = [];

  function niceStep(range, target) {
    var raw = range / target, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
  }
  function fmt(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(0);
    return String(+v.toPrecision(6));
  }
  function sx(x) { return (x - view.xmin) / (view.xmax - view.xmin) * W; }
  function sy(y) { return H - (y - view.ymin) / (view.ymax - view.ymin) * H; }

  function readEquations() {
    var lines = $("eqs").value.split(/\n|;/).map(function (s) { return s.trim(); }).filter(Boolean);
    var errs = [];
    funcs = [];
    lines.forEach(function (line, i) {
      try { funcs.push({ src: line, fn: EqParser.parse(line), color: COLORS[funcs.length % COLORS.length] }); }
      catch (e) { errs.push("Line " + (i + 1) + ": " + e.message); }
    });
    $("errors").textContent = errs.join("\n");
  }

  function draw() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    // grid
    var gx = niceStep(view.xmax - view.xmin, 10), gy = niceStep(view.ymax - view.ymin, 7);
    ctx.lineWidth = 1; ctx.font = "13px Segoe UI, sans-serif"; ctx.fillStyle = "#605e5c";
    var x0 = sx(0), y0 = sy(0);
    var labY = Math.min(Math.max(y0 + 15, 15), H - 4);
    var labX = Math.min(Math.max(x0 + 5, 4), W - 40);
    var k;
    for (k = Math.ceil(view.xmin / gx); k * gx <= view.xmax; k++) {
      var gxv = k * gx, px = Math.round(sx(gxv)) + 0.5;
      ctx.strokeStyle = "#edebe9"; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      if (k !== 0) { ctx.textAlign = "center"; ctx.fillText(fmt(gxv), px, labY); }
    }
    for (k = Math.ceil(view.ymin / gy); k * gy <= view.ymax; k++) {
      var gyv = k * gy, py = Math.round(sy(gyv)) + 0.5;
      ctx.strokeStyle = "#edebe9"; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
      if (k !== 0) { ctx.textAlign = "left"; ctx.fillText(fmt(gyv), labX, py - 3); }
    }
    // axes
    ctx.strokeStyle = "#323130"; ctx.lineWidth = 1.5;
    if (y0 >= 0 && y0 <= H) { ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); }
    if (x0 >= 0 && x0 <= W) { ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, H); ctx.stroke(); }

    // curves
    var span = view.ymax - view.ymin;
    funcs.forEach(function (f) {
      ctx.strokeStyle = f.color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
      ctx.beginPath();
      var pen = false, prevY = null;
      for (var px = 0; px <= W; px += 0.5) {
        var x = view.xmin + px / W * (view.xmax - view.xmin), y;
        try { y = f.fn(x); } catch (e) { y = NaN; }
        if (typeof y !== "number" || !isFinite(y) || Math.abs(y) > span * 1e3) { pen = false; prevY = null; continue; }
        var py = sy(y);
        if (pen && prevY !== null && Math.abs(py - prevY) > H * 1.5) pen = false; // asymptote jump
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
        prevY = py;
      }
      ctx.stroke();
    });
    // legend
    ctx.textAlign = "left"; ctx.font = "14px Segoe UI, sans-serif";
    funcs.forEach(function (f, i) {
      ctx.fillStyle = f.color; ctx.fillRect(10, 10 + i * 20, 12, 12);
      ctx.fillStyle = "#201f1e"; ctx.fillText(f.src.replace(/^\s*(y|f\(x\))\s*=\s*/i, "y = "), 28, 21 + i * 20);
    });
  }

  function syncInputs() {
    ["xmin", "xmax", "ymin", "ymax"].forEach(function (id) { $(id).value = +view[id].toPrecision(6); });
  }
  function readInputs() {
    var v = {};
    ["xmin", "xmax", "ymin", "ymax"].forEach(function (id) { v[id] = parseFloat($(id).value); });
    if (isFinite(v.xmin) && isFinite(v.xmax) && v.xmin < v.xmax && isFinite(v.ymin) && isFinite(v.ymax) && v.ymin < v.ymax) view = v;
  }
  function refresh() { readEquations(); draw(); }

  // pan & zoom
  function canvasPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
  }
  var drag = null;
  cv.addEventListener("pointerdown", function (ev) { drag = canvasPos(ev); cv.setPointerCapture(ev.pointerId); cv.classList.add("dragging"); });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = canvasPos(ev), dx = (p.x - drag.x) / W * (view.xmax - view.xmin), dy = (p.y - drag.y) / H * (view.ymax - view.ymin);
    view.xmin -= dx; view.xmax -= dx; view.ymin += dy; view.ymax += dy;
    drag = p; syncInputs(); draw();
  });
  function endDrag() { drag = null; cv.classList.remove("dragging"); }
  cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var p = canvasPos(ev), k = ev.deltaY < 0 ? 0.85 : 1 / 0.85;
    var cx = view.xmin + p.x / W * (view.xmax - view.xmin), cy = view.ymax - p.y / H * (view.ymax - view.ymin);
    view.xmin = cx - (cx - view.xmin) * k; view.xmax = cx + (view.xmax - cx) * k;
    view.ymin = cy - (cy - view.ymin) * k; view.ymax = cy + (view.ymax - cy) * k;
    syncInputs(); draw();
  }, { passive: false });

  function status(msg) { $("status").textContent = msg; }
  function pngBase64() { return cv.toDataURL("image/png").split(",")[1]; }
  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  $("insert").addEventListener("click", function () {
    refresh();
    if (!funcs.length) { status("Nothing to plot yet."); return; }
    if (typeof OneNote === "undefined") { status("Open this inside OneNote to insert. You can still copy or download the image."); return; }
    var label = funcs.map(function (f) { return escapeHtml(f.src); }).join("<br>");
    var html = "<p>" + label + "</p><img src=\"data:image/png;base64," + pngBase64() + "\" width=\"480\" alt=\"Graph\" />";
    OneNote.run(function (c) {
      var page = c.application.getActivePage();
      page.addOutline(40, 90, html);
      return c.sync();
    }).then(function () { status("Inserted on the current page."); })
      .catch(function (e) { status("Insert failed: " + (e && e.message ? e.message : e) + ". Try Copy image and paste."); });
  });

  $("copy").addEventListener("click", function () {
    refresh();
    cv.toBlob(function (blob) {
      if (!navigator.clipboard || !window.ClipboardItem) { status("Copy not supported here. Use Download PNG."); return; }
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        .then(function () { status("Image copied. Paste it into your page."); })
        .catch(function () { status("Copy blocked. Use Download PNG."); });
    });
  });
  $("save").addEventListener("click", function () {
    refresh();
    var a = document.createElement("a"); a.download = "graph.png"; a.href = cv.toDataURL("image/png");
    document.body.appendChild(a); a.click(); a.remove();
  });
  $("reset").addEventListener("click", function () {
    view = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 }; syncInputs(); draw();
  });

  var t;
  $("eqs").addEventListener("input", function () { clearTimeout(t); t = setTimeout(refresh, 150); });
  ["xmin", "xmax", "ymin", "ymax"].forEach(function (id) {
    $(id).addEventListener("input", function () { readInputs(); draw(); });
  });

  function start() { refresh(); }
  if (typeof Office !== "undefined" && Office.onReady) Office.onReady(start); else start();
})();
