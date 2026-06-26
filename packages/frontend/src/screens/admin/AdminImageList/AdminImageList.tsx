import { useEffect, useRef, useState } from "react";
import { api, type AdminImage } from "../../../api/client";

// TODO: Design-Pass – Admin-Bildkatalog-Tabelle, Statusanzeige, Upload-Bereich

interface AdminImageListProps {
  onEditImage: (imageId: string) => void;
  onLogout: () => void;
}

export function AdminImageList({ onEditImage, onLogout }: AdminImageListProps) {
  const [images, setImages] = useState<AdminImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Upload-State
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function loadImages() {
    setError(null);
    try {
      setImages(await api.adminGetImages());
    } catch {
      setError("Bildkatalog konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadImages(); }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await api.adminUploadImage(file);
      // direkt in den Editor navigieren
      onEditImage(result.id);
    } catch {
      setUploadError("Upload fehlgeschlagen. Erlaubte Formate: JPEG, PNG, WebP (max. 8 MB).");
      setUploading(false);
    }
  }

  async function handlePublish(id: string) {
    setBusyId(id);
    try {
      await api.adminPublishImage(id);
      await loadImages();
    } catch (e) {
      alert(`Veröffentlichen fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Bild wirklich archivieren?")) return;
    setBusyId(id);
    try {
      await api.adminArchiveImage(id);
      await loadImages();
    } catch {
      alert("Archivieren fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await api.adminLogout().catch(() => {});
    onLogout();
  }

  return (
    <div>
      <h2>Bildkatalog</h2>
      <button onClick={handleLogout}>Logout</button>

      <hr />

      <h3>Neues Bild hochladen</h3>
      {/* TODO: Design-Pass – Upload-Zone mit Drag-and-drop */}
      <div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" />
        {" "}
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? "Wird hochgeladen …" : "Hochladen"}
        </button>
        {uploadError && <span style={{ color: "red" }}> {uploadError}</span>}
      </div>

      <hr />

      <h3>Vorhandene Bilder</h3>
      {loading && <p>Lädt …</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && images.length === 0 && <p>Noch keine Bilder vorhanden.</p>}

      {!loading && !error && images.length > 0 && (
        <table border={1} cellPadding={4}>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Kategorie</th>
              <th>Eignung</th>
              <th>Bereiche</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id}>
                <td>{img.title}</td>
                <td>{img.category}</td>
                <td>{img.suitability}</td>
                <td>{img.anomalyAreas.length}</td>
                <td>{img.status}</td>
                <td>
                  <button onClick={() => onEditImage(img.id)} disabled={busyId === img.id}>
                    Bearbeiten
                  </button>
                  {" "}
                  {img.status === "draft" && (
                    <>
                      <button onClick={() => handlePublish(img.id)} disabled={busyId === img.id}>
                        Veröffentlichen
                      </button>
                      {" "}
                    </>
                  )}
                  {img.status !== "archived" && (
                    <button onClick={() => handleArchive(img.id)} disabled={busyId === img.id}>
                      Archivieren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
