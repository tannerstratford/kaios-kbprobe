// KB Probe — standalone KaiOS app. READ ONLY. Connects to AppsManager and
// calls getAll() to show how each installed app (especially the built-in
// keyboard) is registered, so we can tell whether the keyboard could be
// replaced/updated without root. Calls NO mutating method: no installPackage,
// no update, no setEnabled, no uninstall, no clear. Nothing here changes state.
(function () {
  "use strict";

  var out = document.getElementById("out");
  var lines = [];
  function render() { out.textContent = lines.join("\n"); out.scrollTop = out.scrollHeight; }
  function log(s) { lines.push(s == null ? "" : String(s)); render(); }
  function fail(s) { log("");  log("✗ " + s); out.classList.add("err"); }

  // D-pad scroll + exit. No typing, no actions.
  window.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowDown": out.scrollTop += 40; break;
      case "ArrowUp": out.scrollTop -= 40; break;
      case "Backspace": case "SoftRight": try { window.close(); } catch (x) {} break;
      default: return;
    }
    e.preventDefault();
  });

  function pick(app) {
    var o = {};
    ["name", "manifestUrl", "updateUrl", "removable", "status", "updateState",
      "installState", "origin", "allowedAutoDownload", "version"].forEach(function (k) {
      if (app && app[k] !== undefined) o[k] = app[k];
    });
    if (app && typeof app === "object") {
      Object.keys(app).forEach(function (k) {
        if (!(k in o) && typeof app[k] !== "function" && typeof app[k] !== "object") o["+" + k] = app[k];
      });
    }
    return o;
  }
  function safe(v) { try { return JSON.stringify(v, null, 1); } catch (e) { return String(v); } }
  function isKbd(a) { return String((a && (a.manifestUrl || a.origin)) || "").toLowerCase().indexOf("keyboard") !== -1; }

  function dump(list) {
    var arr = Array.isArray(list) ? list : (list && (list.apps || list.result || list.value)) || [];
    if (!Array.isArray(arr)) { log("getAll() returned a non-list:"); log(safe(list)); return; }
    log("getAll() OK — " + arr.length + " apps.");
    var kbd = [], rest = [];
    arr.forEach(function (a) { (isKbd(a) ? kbd : rest).push(a); });
    log("");
    log("=== KEYBOARD ===");
    if (!kbd.length) log("(no app with 'keyboard' in its URL — unexpected)");
    kbd.forEach(function (a) { log(safe(pick(a))); });
    log("");
    log("=== ALL APPS (name · removable · status) ===");
    rest.forEach(function (a) {
      log("- " + (a.name || "?") + " · removable=" + a.removable + " · status=" + a.status);
      log("  " + (a.manifestUrl || ""));
    });
    log("");
    log("Done. Nothing was changed.");
    log("Up/Down scroll · Backspace exit.");
  }

  if (!window.JScalatedAppsManager) { fail("AppsManager wrapper did not load (appsmanager.js)."); return; }

  log("Connecting to AppsManager…");
  var client = new window.JScalatedAppsManager(function (m) { log("· " + m); });
  client.connect().then(function (manager) {
    log("Connected. Calling getAll() (read-only)…");
    return manager.getAll();
  }).then(dump).catch(function (error) {
    fail("PROBE FAILED: " + window.JScalatedAppsManager.errorText(error));
    log("");
    log("If this says a permission/denied error, a sideloaded app can't");
    log("reach AppsManager on this build — the staging page is then the");
    log("only read-only route. Read this back either way.");
  });
}());
