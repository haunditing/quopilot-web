import { useRef, useState } from "react";
import type { DragEvent } from "react";
import Icon from "./Icon.js";

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  hint?: string;
  accept?: string;
  maxSizeKB?: number;
  round?: boolean;
}

const DEFAULT_ACCEPT = "image/png,image/svg+xml";
const DEFAULT_MAX_SIZE_KB = 2048;

function readImage(
  file: File,
  accept: string,
  maxSizeKB: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const acceptedTypes = accept
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean);

    const typeMatches =
      acceptedTypes.length === 0 ||
      acceptedTypes.some((type) => {
        if (type === "image/*") {
          return file.type.startsWith("image/");
        }

        return file.type === type;
      });

    if (!typeMatches) {
      reject(new Error(`Formato no permitido. Usa: ${accept}`));
      return;
    }

    if (file.size > maxSizeKB * 1024) {
      reject(
        new Error(`El archivo supera el límite de ${maxSizeKB} KB`),
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error("No fue posible leer el archivo"));
    };

    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({
  label,
  value,
  onChange,
  hint,
  accept = DEFAULT_ACCEPT,
  maxSizeKB = DEFAULT_MAX_SIZE_KB,
  round = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    readImage(file, accept, maxSizeKB)
      .then((dataUrl) => {
        onChange(dataUrl);
        setError("");
      })
      .catch((readError: unknown) => {
        setError(
          readError instanceof Error ? readError.message : "Archivo inválido",
        );
      });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    handleFile(event.dataTransfer.files?.[0]);
  }

  const hasValue = Boolean(value);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-strong">{label}</span>

      {hasValue ? (
        <div className="flex items-center gap-4">
          <img
            className={
            round
              ? "w-14 h-14 rounded-full object-contain p-2 border border-line rounded-lg bg-surface-card"
              : "w-20 h-14 object-contain p-2 border border-line rounded-lg bg-surface-card"
          }
            src={value}
            alt={label}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 min-h-[32px] px-3 py-1.5 text-[13px] rounded-md font-semibold border cursor-pointer transition-colors border-line bg-surface-card text-ink-strong hover:border-accent-border hover:bg-accent-soft hover:text-accent"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="upload" size={16} />
              Cambiar
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 min-h-[32px] px-3 py-1.5 text-[13px] rounded-md font-semibold border cursor-pointer transition-colors border-red-200 bg-red-50 text-danger hover:bg-danger hover:text-white"
              onClick={() => onChange(undefined)}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-2.5 min-h-[120px] p-4 rounded-lg border-[1.5px] bg-surface-card text-center cursor-pointer transition-colors duration-150 ${
            dragging
              ? "border-accent bg-accent-soft text-accent"
              : "border-line hover:border-accent hover:bg-accent-soft hover:text-accent"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              inputRef.current?.click();
            }
          }}
        >
          <Icon name="upload" size={20} />

          <span>Arrastra una imagen o haz clic para subir</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="visually-hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {error && <span className="text-[11px] text-danger">{error}</span>}

      {hint && <div className="text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}