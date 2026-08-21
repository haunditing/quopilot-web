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
    <div className="image-uploader">
      <span className="image-uploader__label">{label}</span>

      {hasValue ? (
        <div className="image-uploader__preview">
          <img
            className={round ? "image-uploader__img image-uploader__img--round" : "image-uploader__img"}
            src={value}
            alt={label}
          />

          <div className="image-uploader__preview-actions">
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="upload" size={16} />
              Cambiar
            </button>

            <button
              type="button"
              className="button button--danger button--small"
              onClick={() => onChange(undefined)}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div
          className={
            dragging
              ? "image-uploader__drop image-uploader__drop--dragging"
              : "image-uploader__drop"
          }
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