import { useRef, useState } from "react";
import { clearDealerPhoto, setDealerName, uploadDealerPhoto } from "../lib/api";

export function DealerCustomizeModal({
  code,
  currentName,
  hasPhoto,
  onClose,
}: {
  code: string;
  currentName: string;
  hasPhoto: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName === "Dealer" ? "" : currentName);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      if (file) await uploadDealerPhoto(code, file);
      if (name.trim() !== (currentName === "Dealer" ? "" : currentName)) {
        await setDealerName(code, name);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePhoto() {
    setBusy(true);
    try {
      await clearDealerPhoto(code);
      pickFile(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal dealer-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Cast your dealer</h3>
        <p>Upload a friend's photo to sit in the dealer's chair for this table — everyone will see it.</p>

        <button
          className="dealer-photo-picker"
          onClick={() => fileInput.current?.click()}
          style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        >
          {!preview && <span>Choose photo</span>}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <label className="field">
          <span>Dealer name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Dealer" />
        </label>

        {error && <div className="home-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={busy || (!file && name.trim() === (currentName === "Dealer" ? "" : currentName))}>
            Save
          </button>
          {hasPhoto && (
            <button className="btn" onClick={handleRemovePhoto} disabled={busy}>
              Remove photo
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
