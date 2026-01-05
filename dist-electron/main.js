import { app as c, ipcMain as P, BrowserWindow as R } from "electron";
import { fileURLToPath as v } from "node:url";
import n from "node:path";
import i from "node:fs";
import { createRequire as U } from "node:module";
import T from "node:crypto";
const b = U(import.meta.url), C = b("http-mitm-proxy"), w = "proxy-token.txt";
function E() {
  const e = c.getPath("userData"), t = n.join(e, w);
  if (i.existsSync(t)) {
    const a = i.readFileSync(t, "utf-8").trim();
    if (a.length > 0)
      return a;
  }
  const r = T.randomBytes(32).toString("hex");
  return i.writeFileSync(t, r, "utf-8"), r;
}
function q() {
  const e = c.getPath("userData"), t = n.join(e, w);
  if (i.existsSync(t)) {
    const a = n.join(e, `proxy-token.backup.${Date.now()}.txt`);
    i.copyFileSync(t, a);
  }
  const r = T.randomBytes(32).toString("hex");
  return i.writeFileSync(t, r, "utf-8"), r;
}
function L(e, t = 8888) {
  const r = C(), a = c.getPath("userData"), p = n.join(a, "certs"), _ = E();
  return i.existsSync(p) || i.mkdirSync(p, { recursive: !0 }), r.onError(function(o, d) {
    console.error("Proxy Error:", d);
  }), r.onRequest(function(o, d) {
    const h = o.clientToProxyRequest.headers["x-proxy-token"];
    if (!h || h !== _) {
      console.warn("Unauthorized proxy request rejected"), o.proxyToClientResponse.writeHead(401, { "Content-Type": "text/plain" }), o.proxyToClientResponse.end("Unauthorized: Invalid proxy token");
      return;
    }
    const y = o.clientToProxyRequest.headers.host || "", f = o.clientToProxyRequest.url || "", x = (o.isSSL ? "https:" : "http:") + "//" + y + f, l = {
      method: o.clientToProxyRequest.method || "GET",
      url: x,
      host: y,
      timestamp: Date.now(),
      type: "unknown"
    };
    if (y.includes("google-analytics.com") && f.includes("/g/collect")) {
      l.type = "ga4";
      try {
        const u = new URL(x);
        l.eventName = u.searchParams.get("en") || "unknown";
        const g = {};
        u.searchParams.forEach((j, I) => {
          g[I] = j;
        }), l.params = g;
      } catch (u) {
        console.error("Error parsing GA4 url", u);
      }
    }
    return e && e.webContents.send("proxy-request", l), d();
  }), r.listen({ port: t, sslCaDir: p }, (o) => {
    o ? (console.error("Failed to start proxy", o), e && e.webContents.send("proxy-error", {
      type: o.code === "EADDRINUSE" ? "port-in-use" : "unknown",
      message: o.message
    })) : (console.log("Proxy listening on port " + t), e && e.webContents.send("proxy-status", { status: "running", port: t }));
  }), r;
}
const k = n.dirname(v(import.meta.url));
process.env.APP_ROOT = n.join(k, "..");
const m = process.env.VITE_DEV_SERVER_URL, $ = n.join(process.env.APP_ROOT, "dist-electron"), S = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? n.join(process.env.APP_ROOT, "public") : S;
let s;
function D() {
  s = new R({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(k, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webSecurity: !0,
      allowRunningInsecureContent: !1
    }
  }), L(s), s.webContents.on("did-finish-load", () => {
    s == null || s.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), m ? s.loadURL(m) : s.loadFile(n.join(S, "index.html"));
}
P.handle("proxy:getToken", () => E());
P.handle("proxy:regenerateToken", () => q());
process.on("uncaughtException", (e) => {
  console.error("Uncaught exception:", e);
});
process.on("unhandledRejection", (e) => {
  console.error("Unhandled rejection:", e);
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), s = null);
});
c.on("activate", () => {
  R.getAllWindows().length === 0 && D();
});
c.whenReady().then(D);
export {
  $ as MAIN_DIST,
  S as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
