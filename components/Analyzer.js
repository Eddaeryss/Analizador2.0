"use client";
// components/Analyzer.js

import { useState, useRef, useCallback } from "react";

// ─── RENDER MARKDOWN ──────────────────────────────────────────────────────────
function RenderMd({ text }) {
  return (
    <div className="prose">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="md-h2">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("- **")) {
          const m = line.match(/- \*\*(.+?)\*\*[:：]?\s*(.*)/);
          if (m) return (
            <p key={i} className="md-bullet-strong">
              <span className="md-accent">→ {m[1]}:</span>{" "}
              <span className="md-text">{m[2]}</span>
            </p>
          );
        }
        if (line.startsWith("- ")) return (
          <p key={i} className="md-bullet">
            <span className="md-dash">–</span>{line.slice(2)}
          </p>
        );
        if (line.trim() === "") return <div key={i} className="md-space" />;
        const html = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong style="color:#fff">${m}</strong>`);
        return <p key={i} className="md-p" dangerouslySetInnerHTML={{ __html: html }} />;
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
        <div class="img-gallery">
          ${a.imagesUrls.map(img => `<img class="entry-img" src="${img}" />`).join("")}
        </div>
        <div class="meta-section">
          <div class="entry-num">Análisis #${i + 1}</div>
          <div class="entry-meta">${a.timestamp}</div>
          ${a.context ? `<div class="entry-context"><strong>Contexto adjunto:</strong> "${a.context}"</div>` : ''}
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
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:800px;margin:auto}
    h1{font-size:1.8rem;border-bottom:3px solid #d4f55a;padding-bottom:12px;margin-bottom:30px;}
    .entry{margin-bottom:50px;padding-bottom:40px;border-bottom:1px solid #eee}
    .entry-header{display:flex;flex-direction:column;gap:16px;margin-bottom:20px;background:#f9f9f9;padding:15px;border-radius:10px}
    .img-gallery{display:flex;flex-wrap:wrap;gap:10px}
    .entry-img{height:100px;max-width:200px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
    .meta-section{margin-top:10px}
    .entry-num{font-size:1.2rem;font-weight:700}.entry-meta{font-size:0.85rem;color:#777;margin-bottom:8px}
    .entry-context{font-size:0.85rem;color:#444;font-style:italic;background:#f0f0f0;padding:6px 10px;border-radius:4px;border-left:3px solid #d4f55a}
    h2{font-size:1.1rem;color:#222;margin-top:1.5rem;margin-bottom:0.5rem;font-family:monospace}
    p{font-size:0.9rem;line-height:1.6;margin:0.25rem 0;color:#333}
    footer{margin-top:40px;font-size:0.75rem;color:#999;text-align:center}
  </style></head><body>
  <h1>📊 Reporte Ejecutivo — Ungrowth</h1>
  <p style="font-size:0.9rem;color:#666;margin-bottom:40px">
    Generado el: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long", timeStyle: "short" })}
  </p>
  ${content}
  <footer>Unanimous Growth (Ungrowth) · Saltillo, México</footer>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Analyzer() {
  const [images, setImages] = useState([]); // { dataUrl, base64, mimeType }
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const processFiles = useCallback((filesList) => {
    setError(null);
    const validFiles = Array.from(filesList).filter(f => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          dataUrl: e.target.result,
          base64: e.target.result.split(",")[1],
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
          context: context.trim()
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const id = Date.now();
      setAnalyses(prev => [{
        id,
        imagesUrls: images.map(img => img.dataUrl),
        context,
        text: data.result,
        timestamp: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      }, ...prev]);

      setActiveTab(id);
      setImages([]);
      setContext("");
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeAnalysis = analyses.find(a => a.id === activeTab);

  return (
    <div className="layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');
        
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

        body, html { margin: 0; padding: 0; }
        
        .layout {
          min-height: 100vh;
          background: radial-gradient(circle at top right, #111511 0%, #050505 50%, #020202 100%);
          font-family: 'Inter', system-ui, sans-serif;
          color: #e0e0e0;
          display: flex;
          flex-direction: column;
        }

        /* TopBar */
        .topbar {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0.8rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(10,10,10,0.4);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .brand {
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          font-weight: 500;
          color: #d4f55a;
          letter-spacing: 0.06em;
          text-shadow: 0 0 12px rgba(212,245,90,0.3);
        }

        /* Buttons */
        .btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          outline: none;
        }
        
        .btn:active:not(:disabled) { transform: scale(0.97); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-primary {
          background: #d4f55a;
          color: #050505;
          border: none;
          border-radius: 8px;
          padding: 0.9rem 1.2rem;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(212, 245, 90, 0.15);
        }

        .btn-primary:hover:not(:disabled) {
          background: #e1fc7a;
          box-shadow: 0 6px 20px rgba(212, 245, 90, 0.25);
          transform: translateY(-1px);
        }

        .btn-ghost {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 6px 12px;
          color: #aaa;
          font-size: 0.75rem;
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border-color: rgba(255,255,255,0.2);
        }

        .btn-glass {
          background: rgba(20,20,20,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          border-radius: 6px;
          padding: 6px 12px;
          color: #ccc;
          font-size: 0.75rem;
        }

        .btn-glass:hover {
          background: rgba(20,20,20,0.8);
          color: #d4f55a;
          border-color: rgba(212,245,90,0.5);
        }

        /* Glass Panel */
        .glass-panel {
          background: rgba(18, 18, 18, 0.6);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          backdrop-filter: blur(12px);
          border-radius: 12px;
        }

        /* Sidebar & Layout */
        .main-container { display: flex; flex: 1; overflow: hidden; }
        
        .sidebar {
          width: 220px;
          border-right: 1px solid rgba(255,255,255,0.06);
          padding: 1rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
          background: rgba(5,5,5,0.5);
          backdrop-filter: blur(6px);
        }

        .sidebar-title {
          font-size: 0.65rem;
          color: #666;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.08em;
          margin-bottom: 0.5rem;
          padding-left: 8px;
        }

        .tab-new {
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tab-new:hover { background: rgba(255,255,255,0.04); }
        .tab-active { background: rgba(212,245,90,0.08); color: #d4f55a; }
        .tab-inactive { color: #888; }

        .history-item {
          border-radius: 8px;
          border: 1px solid transparent;
          overflow: hidden;
          background: rgba(20,20,20,0.5);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .history-item:hover { background: rgba(30,30,30,0.7); }
        .history-item.active-item {
          border-color: rgba(212,245,90,0.3);
          background: rgba(212,245,90,0.03);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        /* Content Area */
        .content-area {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        /* Upload Area */
        .drop-zone {
          border: 1.5px dashed rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 4rem 2rem;
          text-align: center;
          background: rgba(15,15,15,0.4);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .drop-zone:hover, .drop-zone.over {
          border-color: #d4f55a;
          background: rgba(212,245,90,0.02);
        }

        .drop-icon { font-size: 2.5rem; margin-bottom: 1rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
        
        /* Grid */
        .img-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 0.5rem;
        }

        .img-card {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: #0d0d0d;
          border: 1px solid rgba(255,255,255,0.08);
          aspect-ratio: 1;
        }

        .img-card img { width: 100%; height: 100%; object-fit: cover; }
        
        .btn-remove {
          position: absolute;
          top: 6px; right: 6px;
          background: rgba(0,0,0,0.6);
          border: none;
          color: #fff;
          border-radius: 4px;
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 14px;
          transition: 0.2s;
        }
        .btn-remove:hover { background: #e54d4d; }

        /* Input */
        .input-glass {
          width: 100%;
          background: rgba(20,20,20,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 1rem;
          color: #fff;
          font-family: inherit;
          font-size: 0.85rem;
          resize: vertical;
          transition: border-color 0.2s;
          outline: none;
        }
        .input-glass:focus {
          border-color: rgba(212,245,90,0.5);
          background: rgba(25,25,25,0.7);
        }

        /* Animations */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        /* Markdown Styles */
        .md-h2 { font-size: 0.9rem; font-weight: 600; color: #d4f55a; margin-top: 1.8rem; margin-bottom: 0.5rem; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em; }
        .md-bullet-strong { margin: 0.35rem 0; font-size: 0.88rem; line-height: 1.6; }
        .md-accent { color: #d4f55a; font-weight: 500; font-family: 'DM Mono', monospace; font-size: 0.82rem; }
        .md-text { color: #ccc; }
        .md-bullet { margin: 0.35rem 0; font-size: 0.88rem; line-height: 1.6; color: #bbb; }
        .md-dash { color: #555; margin-right: 0.4rem; }
        .md-space { height: 0.4rem; }
        .md-p { margin: 0.3rem 0; font-size: 0.88rem; line-height: 1.7; color: #bbb; }
      `}</style>

      {/* TOP BAR */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <span className="brand">UNGROWTH</span>
          <span style={{ fontSize: "0.75rem", color: "#666" }}>/ analizador de inteligencia</span>
        </div>
        {analyses.length > 0 && (
          <button className="btn btn-ghost" onClick={() => exportPDF(analyses)}>
            ↓ Exportar Global ({analyses.length})
          </button>
        )}
      </div>

      {/* BODY */}
      <div className="main-container">

        {/* SIDEBAR */}
        {analyses.length > 0 && (
          <div className="sidebar">
            <div className="sidebar-title">HISTORIAL</div>
            <div className={`tab-new ${activeTab === "new" ? "tab-active" : "tab-inactive"}`} onClick={() => setActiveTab("new")}>
              ✦ Nuevo análisis
            </div>
            {analyses.map((a, i) => (
              <div key={a.id} className={`history-item ${activeTab === a.id ? "active-item" : ""}`} onClick={() => setActiveTab(a.id)}>
                <div style={{ display: "grid", gridTemplateColumns: a.imagesUrls.length > 1 ? "1fr 1fr" : "1fr", height: 80, gap: 1 }}>
                  {a.imagesUrls.slice(0, 2).map((img, idx) => (
                    <img key={idx} src={img} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                  ))}
                </div>
                <div style={{ padding: "8px 10px", fontSize: "0.7rem", color: "#888" }}>
                  <div style={{ color: "#fff", marginBottom: 3, fontWeight: 500 }}>Reporte #{analyses.length - i}</div>
                  {a.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="content-area">

          {/* NEW ANALYSIS */}
          {activeTab === "new" && (
            <div style={{ animation: "fadeIn 0.4s ease forwards" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 400, marginBottom: "0.5rem", marginTop: 0 }}>Analizar <span style={{ color: "#d4f55a", fontWeight: 600 }}>Prospecto</span></h1>
              <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "2rem" }}>Sube múltiples capturas del perfil y contenido para un diagnóstico integral de IA.</p>

              {images.length > 0 && (
                <div className="img-grid">
                  {images.map((img, i) => (
                    <div key={i} className="img-card">
                      <img src={img.dataUrl} alt={`Upload ${i}`} />
                      <button className="btn-remove" onClick={() => removeImage(i)}>×</button>
                    </div>
                  ))}
                  <div
                    onClick={() => fileInputRef.current.click()}
                    style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888", fontSize: "0.8rem", aspectRatio: "1" }}>
                    + Añadir
                  </div>
                </div>
              )}

              {images.length === 0 && (
                <div className={`drop-zone ${dragOver ? "over" : ""}`}
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}>
                  <div className="drop-icon">📸</div>
                  <p style={{ fontSize: "1rem", color: "#ddd", margin: "0 0 0.5rem" }}>
                    Arrastra capturas o <span style={{ color: "#d4f55a" }}>explora tus archivos</span>
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#666", margin: 0 }}>Puedes seleccionar múltiples imágenes a la vez</p>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />

              {images.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#aaa", marginBottom: "0.5rem", paddingLeft: "4px" }}>
                    Contexto Estratégico (Opcional)
                  </label>
                  <textarea
                    className="input-glass"
                    rows={3}
                    placeholder="Ej. Este cliente vende ropa boutique y quiere enfocarse en campañas pagadas..."
                    value={context}
                    onChange={e => setContext(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div style={{ background: "rgba(229, 77, 77, 0.1)", border: "1px solid rgba(229, 77, 77, 0.3)", borderRadius: 8, padding: "1rem", fontSize: "0.85rem", color: "#ff8c8c", marginTop: "1.5rem" }}>
                  {error}
                </div>
              )}

              {images.length > 0 && (
                <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{ minWidth: 200 }}>
                    {loading ? (
                      <><span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.1)", borderTopColor: "#000", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Procesando...</>
                    ) : (
                      "✦ Generar Diagnóstico"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GUARDADO / RESULTS */}
          {activeTab !== "new" && activeAnalysis && (
            <div style={{ animation: "fadeIn 0.4s ease forwards" }}>
              <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ margin: "0 0 0.3rem 0", fontSize: "1.1rem", color: "#fff" }}>Reporte Ejecutivo</h2>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>Generado el {activeAnalysis.timestamp}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className="btn btn-glass" onClick={() => exportPDF([activeAnalysis])}>↓ Generar PDF</button>
                    <button className="btn btn-glass" onClick={() => {
                      if (confirm("¿Eliminar este análisis?")) {
                        const remaining = analyses.filter(a => a.id !== activeTab);
                        setAnalyses(remaining);
                        setActiveTab(remaining.length > 0 ? remaining[0].id : "new");
                      }
                    }} style={{ color: "#ff8c8c" }}>
                      🗑 Eliminar
                    </button>
                  </div>
                </div>

                <div className="img-grid" style={{ marginBottom: activeAnalysis.context ? "1rem" : "0" }}>
                  {activeAnalysis.imagesUrls.map((img, idx) => (
                    <div key={idx} className="img-card"><img src={img} alt="" /></div>
                  ))}
                </div>

                {activeAnalysis.context && (
                  <div style={{ background: "rgba(255,255,255,0.03)", borderLeft: "3px solid #d4f55a", padding: "0.8rem", borderRadius: "0 8px 8px 0" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", fontFamily: "'DM Mono', monospace" }}>CONTEXTO DEL USUARIO</div>
                    <div style={{ fontSize: "0.85rem", color: "#ddd", fontStyle: "italic" }}>"{activeAnalysis.context}"</div>
                  </div>
                )}
              </div>

              <div className="glass-panel" style={{ padding: "2rem", borderTop: "3px solid #d4f55a" }}>
                <RenderMd text={activeAnalysis.text} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
