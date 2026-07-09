import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, RefreshCw } from "lucide-react";
import { ImageEditor } from "./ImageEditor";

interface AdminImage {
  id: string;
  title: string;
  image_path: string;
  category: string;
  suitability: string;
  status: string;
  time_limit_seconds: number;
  max_wrong_attempts: number;
  anomalyAreas: { id?: string; polygon: { x: number; y: number }[]; explanation: string }[];
}

const SUITABILITY_COLOR: Record<string, string> = {
  jungfuchs: "#00FF41",
  waldfuchs: "#FEE600",
  erzfuchs:  "#8A2BE2",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  published: { color: "#00FF41", bg: "rgba(0,255,65,0.08)", border: "rgba(0,255,65,0.3)", label: "PUBLISHED" },
  draft:     { color: "#FEE600", bg: "rgba(254,230,0,0.08)", border: "rgba(254,230,0,0.3)", label: "DRAFT" },
  archived:  { color: "#A8ABA7", bg: "rgba(168,171,167,0.08)", border: "rgba(168,171,167,0.2)", label: "ARCHIVIERT" },
};

export function ImagesScreen() {
  const [images, setImages] = useState<AdminImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState<AdminImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/images", { credentials: "include" });
      if (res.ok) setImages(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/admin/images", { method: "POST", credentials: "include", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload fehlgeschlagen");
      }
      await load();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSaved(updated: AdminImage) {
    setImages(prev => prev.map(img => img.id === updated.id ? updated : img));
    setEditingImage(updated);
  }

  function handleDeleted(id: string) {
    setImages(prev => prev.filter(img => img.id !== id));
    setEditingImage(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-code text-xs tracking-widest" style={{ color: "#8A2BE2" }}>
          BILD-KATALOG — {images.length} EINTRÄGE
        </span>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 font-code text-xs tracking-widest text-muted-foreground px-3 py-1.5"
            style={{ border: "1px solid rgba(138,43,226,0.3)" }}
          >
            <RefreshCw size={11} /> AKTUALISIEREN
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 font-code text-xs tracking-widest px-3 py-1.5 disabled:opacity-50"
            style={{ background: "rgba(138,43,226,0.1)", border: "1px solid #8A2BE2", color: "#8A2BE2" }}
          >
            <Upload size={11} /> {uploading ? "HOCHLADEN …" : "BILD HOCHLADEN"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 px-3 py-2 font-code text-xs" style={{ color: "#FF5050", border: "1px solid rgba(255,80,80,0.4)", background: "rgba(255,80,80,0.06)" }}>
          {uploadError}
        </div>
      )}

      <div style={{ border: "1px solid rgba(138,43,226,0.3)", background: "rgba(138,43,226,0.03)" }}>
        {loading ? (
          <div className="p-8 text-center font-code text-xs text-muted-foreground">LADE …</div>
        ) : images.length === 0 ? (
          <div className="p-8 text-center font-code text-xs text-muted-foreground">
            KEINE BILDER VORHANDEN — BILD HOCHLADEN UM ZU STARTEN
          </div>
        ) : (
          <div className="p-4 grid grid-cols-3 gap-3">
            {images.map(img => {
              const s = STATUS_STYLE[img.status] ?? STATUS_STYLE.archived;
              return (
                <button
                  key={img.id}
                  onClick={() => setEditingImage(img)}
                  className="overflow-hidden text-left transition-all"
                  style={{
                    border: "1px solid rgba(254,230,0,0.12)",
                    background: "transparent",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(254,230,0,0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(254,230,0,0.12)")}
                >
                  <img
                    src={`/images/${img.id}`}
                    alt={img.title}
                    className="w-full h-28 object-cover bg-black/20"
                  />
                  <div className="p-2.5">
                    <p className="font-code text-xs text-foreground truncate font-bold">{img.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-code text-xs text-muted-foreground opacity-50">{img.category}</span>
                      <span className="font-code text-xs opacity-30 text-muted-foreground">·</span>
                      <span className="font-code text-xs" style={{ color: SUITABILITY_COLOR[img.suitability] ?? "#A8ABA7" }}>
                        {img.suitability}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="font-code text-xs px-1.5 py-0.5"
                        style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
                      >
                        {s.label}
                      </span>
                      <span className="font-code text-xs text-muted-foreground">
                        {img.anomalyAreas.length} Bereiche
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {editingImage && (
        <ImageEditor
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
