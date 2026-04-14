"use client";
// components/Analyzer.js

import { useState, useRef, useCallback } from "react";

// ─── RENDER MARKDOWN ──────────────────────────────────────────────────────────
function RenderMd({ text }) {
  return (
    <div>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c8f04e", marginTop: "1.2rem", marginBottom: "0.35rem", fontFamily: "'DM Mono',monospace" }}>
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("- **")) {
          const m = line.match(/- \*\*(.+?)\*\*[:：]?\s*(.*)/);
          if (m) return (
            <p key={i} style={{ margin: "0.25rem 0", fontSize: "0.83rem", lineHeight: 1.6 }}>
              <span style={{ color: "#c8f04e", fontWeight: 600 }}>→ {m[1]}:</span>{" "}
              <span style={{ color: "#ccc" }}>{m[2]}</span>
            </p>
          );
        }
        if (line.startsWith("- ")) return (
          <p key={i} style={{ margin: "0.25rem 0", fontSize: "0.83rem", lineHeight: 1.6, color: "#ccc" }}>
            <span style={{ color: "#555", marginRight: "0.35rem" }}>–</span>{line.slice(2)}
          </p>
        );
        if (line.trim() === "") return <div key={i} style={{ height: "0.25rem" }} />;
        const html = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong style="color:#ddd">${m}</strong>`);
        return <p key={i} style={{ margin: "0.2rem 0", fontSize: "0.83rem", lineHeight: 1.65, color: "#aaa" }} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

// ─── EXPORTAR PDF ─────────────────────────────────────────────────────────────
function exportPDF(analyses) {
  const win = window.open("", "_blank");
  const content = analyses.map((a, i) => `
    <div class="entry">
      <div class="entry-header">
        <img class="entry-img" src="${a.imageUrl}" />
        <div>
          <div class="entry-num">Análisis #${i + 1}</div>
          <div class="entry-meta">${a.timestamp}</div>
        </div>
      </div>
      ${a.text.split("\n").map(line => {
        if (line.startsWith("## ")) return `<h2>${line.replace("## ", "")}</h2>`;
        if (line.startsWith("- **")) {
          const m = line.match(/- \*\*(.+?)\*\*[:：]?\s*(.*)/);
          if (m) return `<p><strong>${m[1]}:</strong> ${m[2]}</p>`;
        }
        if (line.startsWith("- ")) return `<p>– ${line.slice(2)}</p>`;
        if (line.trim() === "") return "<br>";
        return `<p>${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
      }).join("")}
    </div>
  `).join("");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Ungrowth</title>
  <style>
    body{font-family:Georgia,serif;background:#fff;color:#111;padding:40px;max-width:780px;margin:auto}
    h1{font-size:1.6rem;border-bottom:3px solid #c8f04e;padding-bottom:10px}
    .entry{margin-bottom:40px;padding-bottom:30px;border-bottom:1px solid #ddd}
    .entry-header{display:flex;align-items:center;gap:16px;margin-bottom:12px}
    .entry-img{width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
    .entry-num{font-size:1.1rem;font-weight:700}.entry-meta{font-size:0.8rem;color:#888}
    h2{font-size:0.9rem;color:#333;margin-top:1rem;margin-bottom:0.3rem;font-family:monospace}
    p{font-size:0.85rem;line-height:1.65;margin:0.2rem 0;color:#444}
    footer{margin-top:40px;font-size:0.7rem;color:#aaa;text-align:center}
  </style></head><body>
  <h1>📊 Reporte de Análisis — Ungrowth</h1>
  <p style="font-size:0.8rem;color:#999;margin-bottom:30px">
    ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })} · ${analyses.length} perfil${analyses.length !== 1 ? "es" : ""} analizados
  </p>
  ${content}
  <footer>Ungrowth · Saltillo, México</footer>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Analyzer() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMime }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const id = Date.now();
      setAnalyses(prev => [{
        id,
        imageUrl: image,
        text: data.result,
        timestamp: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      }, ...prev]);
      setActiveTab(id);
      setImage(null); setImageBase64(null); setImageMime(null);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeAnalysis = analyses.find(a => a.id === activeTab);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e0e0e0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        .btn-primary{transition:all 0.2s;cursor:pointer}
        .btn-primary:hover:not(:disabled){background:#d4f55a !important;transform:translateY(-1px);box-shadow:0 4px 16px rgba(200,240,78,0.2)}
        .btn-primary:disabled{opacity:0.4;cursor:not-allowed}
        .btn-ghost{transition:all 0.15s;cursor:pointer}
        .btn-ghost:hover{color:#c8f04e !important;border-color:#c8f04e !important}
        .drop-zone{transition:all 0.2s;cursor:pointer}
        .drop-zone:hover,.drop-zone.over{border-color:#c8f04e !important;background:#111 !important}
        .history-item{transition:all 0.15s;cursor:pointer}
        .history-item:hover{background:#161616 !important}
        .history-item.active-item{border-color:#c8f04e !important}
        .tab-new{transition:all 0.15s;cursor:pointer;border-radius:6px;padding:6px 8px;font-size:0.78rem}
        .tab-new:hover{background:#1a1a1a}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.75rem", fontWeight: 500, color: "#c8f04e", letterSpacing: "0.05em" }}>UNGROWTH</span>
          <span style={{ fontSize: "0.7rem", color: "#444" }}>/ analizador de perfiles</span>
        </div>
        {analyses.length > 0 && (
          <button className="btn-ghost" onClick={() => exportPDF(analyses)}
            style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 12px", color: "#888", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif" }}>
            ↓ Exportar PDF ({analyses.length})
          </button>
        )}
      </div>

      {/* LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        {analyses.length > 0 && (
          <div style={{ width: 180, borderRight: "1px solid #1a1a1a", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", overflowY: "auto", background: "#0d0d0d" }}>
            <div style={{ fontSize: "0.65rem", color: "#444", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: "0.3rem", paddingLeft: "4px" }}>HISTORIAL</div>
            <div className="tab-new" onClick={() => setActiveTab("new")}
              style={{ color: activeTab === "new" ? "#c8f04e" : "#666", background: activeTab === "new" ? "#1e1e1e" : "transparent" }}>
              + Nuevo análisis
            </div>
            {analyses.map((a, i) => (
              <div key={a.id} className={`history-item ${activeTab === a.id ? "active-item" : ""}`}
                onClick={() => setActiveTab(a.id)}
                style={{ borderRadius: 6, border: "1px solid #1a1a1a", overflow: "hidden", background: "#0a0a0a" }}>
                <img src={a.imageUrl} alt="" style={{ width: "100%", height: 70, objectFit: "cover", display: "block", opacity: 0.85 }} />
                <div style={{ padding: "4px 6px", fontSize: "0.68rem", color: "#555" }}>#{analyses.length - i} · {a.timestamp}</div>
              </div>
            ))}
          </div>
        )}

        {/* MAIN */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 680, margin: "0 auto", width: "100%" }}>

          {/* NUEVO ANÁLISIS */}
          {activeTab === "new" && (
            <>
              {!image ? (
                <div className={`drop-zone ${dragOver ? "over" : ""}`}
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
                  style={{ border: "1.5px dashed #222", borderRadius: 10, padding: "3.5rem 2rem", textAlign: "center", background: "#0d0d0d" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.7rem" }}>📸</div>
                  <p style={{ fontSize: "0.88rem", color: "#777", margin: "0 0 0.3rem" }}>
                    Arrastra aquí o <span style={{ color: "#c8f04e" }}>selecciona una imagen</span>
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "#444", margin: 0 }}>Perfil de TikTok, Instagram o Facebook</p>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => processFile(e.target.files[0])} />
                </div>
              ) : (
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#111", border: "1px solid #1e1e1e" }}>
                  <img src={image} alt="Preview" style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
                  <button className="btn-ghost" onClick={() => { setImage(null); setImageBase64(null); setImageMime(null); }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.75)", border: "1px solid #333", borderRadius: 5, padding: "3px 9px", color: "#888", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif" }}>
                    × Cambiar
                  </button>
                </div>
              )}

              {error && (
                <div style={{ background: "#160a0a", border: "1px solid #3a1010", borderRadius: 8, padding: "0.8rem 1rem", fontSize: "0.82rem", color: "#f08080" }}>{error}</div>
              )}

              {image && (
                <button className="btn-primary" onClick={analyze} disabled={loading}
                  style={{ background: "#c8f04e", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "0.8rem", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontFamily: "'DM Sans',sans-serif" }}>
                  {loading
                    ? <><span style={{ width: 15, height: 15, border: "2px solid #0a0a0a", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Analizando...</>
                    : "✦ Analizar con Ungrowth AI"}
                </button>
              )}

              {analyses.length === 0 && !image && (
                <p style={{ textAlign: "center", color: "#2a2a2a", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  Los análisis guardados aparecerán en el panel izquierdo
                </p>
              )}
            </>
          )}

          {/* ANÁLISIS GUARDADO */}
          {activeTab !== "new" && activeAnalysis && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "flex-start" }}>
                <img src={activeAnalysis.imageUrl} alt="" style={{ width: 100, height: 75, objectFit: "cover", borderRadius: 7, border: "1px solid #1e1e1e", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "#555", fontFamily: "'DM Mono',monospace", marginBottom: "0.4rem" }}>
                    Análisis #{analyses.length - analyses.findIndex(a => a.id === activeTab)} · {activeAnalysis.timestamp}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="btn-ghost" onClick={() => exportPDF([activeAnalysis])}
                      style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 5, padding: "4px 10px", color: "#777", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif" }}>
                      ↓ PDF este análisis
                    </button>
                    <button className="btn-ghost" onClick={() => {
                      const remaining = analyses.filter(a => a.id !== activeTab);
                      setAnalyses(remaining);
                      setActiveTab(remaining.length > 0 ? remaining[0].id : "new");
                    }}
                      style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 5, padding: "4px 10px", color: "#555", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif" }}>
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "1.2rem 1.3rem" }}>
                <RenderMd text={activeAnalysis.text} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
