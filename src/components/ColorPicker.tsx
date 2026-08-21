import type { ReactNode } from "react";

/**
 * Molécula: selector de color (swatch nativo + input hex + presets).
 * Las reglas ::-webkit del color input viven en index.css bajo
 * `.color-picker-native` (no expresables como utilidades).
 */

export interface ColorPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  presets?: string[];
  /** Texto alternativo para el label interno del swatch. */
  swatchTitle?: string;
  children?: ReactNode;
}

const PRESET_ACTIVE_RING =
  "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]";

export default function ColorPicker({
  id,
  value,
  onChange,
  onClear,
  presets,
  swatchTitle = "Elegir color",
  children,
}: ColorPickerProps) {
  const showClear = Boolean(onClear) && value.trim() !== "";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <label
          className="relative w-11 h-11 shrink-0 rounded-lg border border-line cursor-pointer overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-accent focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-bg)]"
          title={swatchTitle}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="color-picker-native absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] border-0 p-0 bg-transparent cursor-pointer"
          />
        </label>

        <input
          id={id}
          type="text"
          value={value}
          placeholder="#2563eb"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 min-w-0 lowercase bg-surface-card border border-line rounded-lg px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-accent"
        />

        {showClear && (
          <button
            type="button"
            onClick={onClear}
            title="Quitar color personalizado"
            aria-label="Quitar color personalizado"
            className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-line bg-surface-card text-ink-muted transition-colors duration-150 hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        )}
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = value.trim().toLowerCase() === preset;
            return (
              <button
                key={preset}
                type="button"
                style={{ background: preset }}
                title={preset}
                aria-label={`Usar color ${preset}`}
                onClick={() => onChange(preset)}
                className={`w-6 h-6 p-0 rounded-md border border-black/10 cursor-pointer transition-transform duration-100 hover:scale-110 ${
                  active ? PRESET_ACTIVE_RING : ""
                }`}
              />
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}
