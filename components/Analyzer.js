"use client";
import { useState, useRef, useCallback, useEffect } from "react";

// ─── UTILS ──────────────────────────────────────────────────────────
const LOCAL_STORAGE_KEY = "ungrowth_session_v1";

function trySaveToStorage(dataArray) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataArray));
  } catch (error) {
    if (dataArray.length > 1) {
      // Si la memoria del celular se llena (QuotaExceeded), borramos el análisis más viejo e intentamos guardarlo de nuevo
      trySaveToStorage(dataArray.slice(0, dataArray.length - 1));
    }
  }
}

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
            <span className="md-dash">•</span>{line.slice(2)}
          </p>
        );
        if (line.trim() === "") return <div key={i} className="md-space" />;
        const html = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong style="color:#000; font-weight: 600">${m}</strong>`);
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
          <div class="entry-num">Análisis Estratégico #${i + 1}</div>
          <div class="entry-meta">${a.timestamp}</div>
          ${a.context ? `<div class="entry-context"><strong>Contexto:</strong> "${a.context}"</div>` : ''}
        </div>
      </div>
      ${a.text.split("\n").map(line => {
    if (line.startsWith("## ")) return `<h2>${line.replace("## ", "")}</h2>`;
    if (line.startsWith("- **")) {
      const m = line.match(/- \*\*(.+?)\*\*[:：]?\s*(.*)/);
      if (m) return `<p><strong>${m[1]}:</strong> ${m[2]}</p>`;
    }
    if (line.startsWith("- ")) return `<p>• ${line.slice(2)}</p>`;
    if (line.trim() === "") return "<br>";
    return `<p>${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
  }).join("")}
    </div>
  `).join("");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Estratégico</title>
  <style>
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:800px;margin:auto}
    h1{font-size:1.8rem;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:30px;font-weight:700;letter-spacing:-0.5px}
    .entry{margin-bottom:50px;padding-bottom:40px;border-bottom:1px solid #eee}
    .entry-header{display:flex;flex-direction:column;gap:16px;margin-bottom:20px;background:#fafafa;border:1px solid #eaeaea;padding:15px;border-radius:4px}
    .img-gallery{display:flex;flex-wrap:wrap;gap:10px}
    .entry-img{height:100px;max-width:200px;object-fit:cover;border-radius:2px;border:1px solid #ddd}
    .meta-section{margin-top:10px}
    .entry-num{font-size:1.1rem;font-weight:700;letter-spacing:-0.3px}.entry-meta{font-size:0.85rem;color:#777;margin-bottom:8px}
    .entry-context{font-size:0.85rem;color:#444;font-style:italic;background:#f4f4f4;padding:6px 10px;border-left:3px solid #000}
    h2{font-size:1.1rem;color:#000;margin-top:1.5rem;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;display:inline-block}
    p{font-size:0.9rem;line-height:1.6;margin:0.25rem 0;color:#333}
    footer{margin-top:40px;font-size:0.75rem;color:#999;text-align:center;text-transform:uppercase;letter-spacing:1px}
  </style></head><body>
  <h1>DOCUMENTO ESTRATÉGICO — UNGROWTH</h1>
  <p style="font-size:0.9rem;color:#666;margin-bottom:40px">
    Generado el: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long", timeStyle: "short" })}
  </p>
  ${content}
  <footer>Unanimous Growth (Ungrowth) · Privado y Confidencial</footer>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Analyzer() {
  const [images, setImages] = useState([]);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [dragOver, setDragOver] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef();

  // Load from local storage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAnalyses(parsed);
      } catch (e) { }
    }
  }, []);

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
      const newAnalysis = {
        id,
        imagesUrls: images.map(img => img.dataUrl),
        context,
        text: data.result,
        timestamp: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      };

      setAnalyses(prev => {
        const updated = [newAnalysis, ...prev];
        trySaveToStorage(updated);
        return updated;
      });

      setActiveTab(id);
      setSidebarOpen(false); // Cierra sidebar en movil si estaba abierto
      setImages([]);
      setContext("");
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeAnalysis = (idToRemove) => {
    if (!confirm("¿Eliminar este análisis permanentemente?")) return;
    setAnalyses(prev => {
      const updated = prev.filter(a => a.id !== idToRemove);
      trySaveToStorage(updated);
      return updated;
    });
    if (activeTab === idToRemove) {
      setActiveTab("new");
    }
  };

  const activeAnalysis = analyses.find(a => a.id === activeTab);

  if (!isClient) return null;

  return (
    <div className="layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

        body, html { margin: 0; padding: 0; background-color: #f9fafb; }
        
        .layout {
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
          color: #111827;
          display: flex;
          flex-direction: column;
        }

        /* TopBar */
        .topbar {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand {
          font-weight: 700;
          font-size: 1.1rem;
          color: #000;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mobile-menu-btn {
          display: none;
          background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #111;
        }

        /* Buttons */
        .btn {
          transition: all 0.2s ease;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          outline: none;
          border-radius: 6px;
        }
        
        .btn:active:not(:disabled) { transform: scale(0.98); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-primary {
          background: #111827;
          color: #ffffff;
          border: 1px solid #000;
          padding: 0.8rem 1.4rem;
          font-size: 0.9rem;
          font-weight: 500;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .btn-primary:hover:not(:disabled) {
          background: #374151;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .btn-outline {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .btn-outline:hover {
          background: #f3f4f6;
          color: #000;
          border-color: #9ca3af;
        }

        .btn-danger {
          color: #ef4444; border: 1px solid transparent; background: transparent;
        }
        .btn-danger:hover { background: #fef2f2; border-color: #fecaca; }

        /* Panels */
        .card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 2rem;
        }

        /* Sidebar & Layout */
        .main-container { display: flex; flex: 1; overflow: hidden; position: relative; }
        
        .sidebar {
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 1.5rem 1.5rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-content { padding: 0.5rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }

        .tab-new {
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .tab-new:hover { border-color: #9ca3af; background: #f9fafb; color: #111; }
        
        .history-item {
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }
        .history-item:hover { border-color: #9ca3af; }
        .history-item.active-item {
          border-color: #111827;
          border-width: 2px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        /* Content Area */
        .content-area {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .content-wrapper { width: 100%; max-width: 760px; }

        /* Upload Area */
        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 3rem 1.5rem;
          text-align: center;
          background: #f9fafb;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .drop-zone:hover, .drop-zone.over {
          border-color: #6b7280;
          background: #f3f4f6;
        }

        /* Grid */
        .img-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
          margin-bottom: 1rem;
        }

        .img-card {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          aspect-ratio: 1;
        }
        .img-card img { width: 100%; height: 100%; object-fit: cover; }
        
        .btn-remove {
          position: absolute;
          top: 6px; right: 6px;
          background: rgba(0,0,0,0.7);
          border: none; color: #fff;
          border-radius: 100%;
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px;
        }
        .btn-remove:hover { background: #ef4444; }

        /* Input */
        .input-gray {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0.8rem;
          color: #111827;
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
          transition: border-color 0.2s;
          outline: none;
        }
        .input-gray:focus {
          border-color: #111827;
          box-shadow: 0 0 0 1px #111827;
        }

        /* Markdown Styles */
        .md-h2 { font-size: 1rem; font-weight: 700; color: #000; margin-top: 2rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; display: inline-block; }
        .md-bullet-strong { margin: 0.5rem 0; font-size: 0.95rem; line-height: 1.6; }
        .md-accent { color: #111827; font-weight: 700; font-size: 0.9rem; }
        .md-text { color: #4b5563; }
        .md-bullet { margin: 0.4rem 0; font-size: 0.95rem; line-height: 1.6; color: #4b5563; }
        .md-dash { color: #9ca3af; margin-right: 0.4rem; }
        .md-space { height: 0.5rem; }
        .md-p { margin: 0.5rem 0; font-size: 0.95rem; line-height: 1.7; color: #374151; }

        /* Loader */
        @keyframes spin { to { transform: rotate(360deg); } }
        .loader { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }

        /* --- RESPONSIVE MEDIA QUERIES --- */
        @media (max-width: 768px) {
          .topbar { padding: 1rem; }
          .mobile-menu-btn { display: block; }
          
          .sidebar {
            position: absolute;
            top: 0; left: 0; bottom: 0;
            z-index: 40;
            transform: translateX(-100%);
            box-shadow: 4px 0 15px rgba(0,0,0,0.1);
          }
          .sidebar.open { transform: translateX(0); }

          .content-area { padding: 1.5rem 1rem; }
          .card { padding: 1.5rem; }
          .drop-zone { padding: 2rem 1rem; }

          .md-h2 { font-size: 0.95rem; }
          .md-p, .md-bullet, .md-bullet-strong { font-size: 0.9rem; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className="topbar">
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="brand">
            <span style={{ background: "#111", color: "#fff", padding: "2px 8px", borderRadius: 4 }}>UN</span>
            GROWTH
          </span>
        </div>
        <div>
          {analyses.length > 0 && (
            <button className="btn btn-outline" onClick={() => exportPDF(analyses)} style={{ fontSize: "0.75rem", padding: "6px 10px" }}>
              Exportar Todo PDF
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="main-container">

        {/* SIDEBAR */}
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">Historial de Análisis</div>
          <div className="sidebar-content">
            <div className="tab-new" onClick={() => { setActiveTab("new"); setSidebarOpen(false); }}>
              + Nuevo Análisis
            </div>

            {analyses.map((a, i) => (
              <div key={a.id} className={`history-item ${activeTab === a.id ? "active-item" : ""}`} onClick={() => { setActiveTab(a.id); setSidebarOpen(false); }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))", height: 60, borderBottom: "1px solid #e5e7eb" }}>
                  {a.imagesUrls.slice(0, 3).map((img, idx) => (
                    <img key={idx} src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ))}
                </div>
                <div style={{ padding: "10px", fontSize: "0.75rem", color: "#6b7280" }}>
                  <div style={{ color: "#111", fontWeight: 600, marginBottom: 2 }}>Análisis #{analyses.length - i}</div>
                  <div>{a.timestamp}</div>
                </div>
              </div>
            ))}
            {analyses.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>
                Aún no hay análisis previos
              </div>
            )}
          </div>
        </div>

        {/* OVERLAY PARA MÓVIL (cierra sidebar) */}
        {sidebarOpen && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 30 }}
            className="mobile-only" onClick={() => setSidebarOpen(false)} />
        )}

        {/* MAIN CONTENT */}
        <div className="content-area">
          <div className="content-wrapper">

            {/* NEW ANALYSIS */}
            {activeTab === "new" && (
              <div className="card">
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", letterSpacing: "-0.5px" }}>Evaluar Prospecto</h1>
                <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 2rem 0" }}>Sube múltiples capturas del negocio para un diagnóstico profundo con IA.</p>

                {images.length > 0 && (
                  <div className="img-grid">
                    {images.map((img, i) => (
                      <div key={i} className="img-card">
                        <img src={img.dataUrl} alt={`Upload ${i}`} />
                        <button className="btn-remove" onClick={() => removeImage(i)}>✕</button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileInputRef.current.click()}
                      style={{ border: "1px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", fontSize: "0.85rem", aspectRatio: "1" }}>
                      + Agregar
                    </div>
                  </div>
                )}

                {images.length === 0 && (
                  <div className={`drop-zone ${dragOver ? "over" : ""}`}
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem", color: "#9ca3af" }}>+</div>
                    <p style={{ fontSize: "0.95rem", color: "#111827", fontWeight: 500, margin: "0 0 0.2rem" }}>
                      Arrastra imágenes o haz clic aquí
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}>PNG, JPG. Soporte para múltiples archivos.</p>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />

                {images.length > 0 && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                      Contexto y Notas (Opcional)
                    </label>
                    <textarea
                      className="input-gray"
                      rows={3}
                      placeholder="Ej. Este negocio de comida rápida busca enfocarse en crecer sus ventas a domicilio..."
                      value={context}
                      onChange={e => setContext(e.target.value)}
                    />
                  </div>
                )}

                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "1rem", fontSize: "0.85rem", color: "#b91c1c", marginTop: "1.5rem" }}>
                    {error}
                  </div>
                )}

                {images.length > 0 && (
                  <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{ width: "100%" }}>
                      {loading ? <><span className="loader" /> Procesando Estrategia...</> : "Generar Documento Estratégico"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GUARDADO / RESULTS */}
            {activeTab !== "new" && activeAnalysis && (
              <>
                <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "1.5rem" }}>
                  <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <h2 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.5px" }}>Diagnóstico de Negocio</h2>
                      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Reporte generado el {activeAnalysis.timestamp}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-outline btn-danger" onClick={() => removeAnalysis(activeAnalysis.id)} title="Eliminar">🗑</button>
                    </div>
                  </div>

                  <div style={{ padding: "1.5rem" }}>
                    <div className="img-grid" style={{ marginBottom: activeAnalysis.context ? "1rem" : "0" }}>
                      {activeAnalysis.imagesUrls.map((img, idx) => (
                        <div key={idx} className="img-card"><img src={img} alt="" /></div>
                      ))}
                    </div>

                    {activeAnalysis.context && (
                      <div style={{ background: "#f9fafb", borderLeft: "3px solid #000", padding: "1rem", borderRadius: "4px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contexto Analizado</div>
                        <div style={{ fontSize: "0.9rem", color: "#374151" }}>"{activeAnalysis.context}"</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <RenderMd text={activeAnalysis.text} />

                  {/* GRAN BOTÓN PARA DESCARGAR PDF INDIVIDUAL */}
                  <div style={{ marginTop: "3rem", borderTop: "1px solid #e5e7eb", paddingTop: "2rem", display: "flex", justifyContent: "center" }}>
                    <button className="btn btn-primary" onClick={() => exportPDF([activeAnalysis])} style={{ padding: "1rem 2rem", fontSize: "1rem" }}>
                      📄 Descargar Detalles en PDF
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
