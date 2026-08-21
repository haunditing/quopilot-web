import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: IconName;
}

interface ComboboxProps {
  id: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
}

export default function Combobox({
  id,
  value,
  options,
  onChange,
  placeholder = "Selecciona una opción",
  searchPlaceholder = "Buscar...",
  required,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  function openCombobox() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) =>
          current < filtered.length - 1 ? current + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) =>
          current > 0 ? current - 1 : filtered.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        selectOption(filtered[activeIndex]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative" data-open={open}>
      <button
        id={id}
        type="button"
        className={`flex items-center justify-between gap-2.5 w-full min-h-[44px] px-3 py-2.5 rounded-lg border bg-surface-card text-ink-strong text-left cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-accent-border focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-bg)]`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openCombobox())}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <Icon name={selected.icon} size={16} className="shrink-0 text-ink-muted" />
          )}

          <span
            className={`overflow-hidden text-ellipsis whitespace-nowrap ${
              selected ? "" : "text-ink-muted"
            }`}
          >
            {selected?.label ?? placeholder}
          </span>
        </span>

        <Icon name="chevron-down" size={16} className={`shrink-0 text-ink-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          style={{ display: "none" }}
          value={selected?.value ?? ""}
          readOnly
          required
        />
      )}

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 rounded-xl border border-line bg-surface-card shadow-card overflow-hidden" role="listbox">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line text-ink-muted">
            <Icon name="search" size={16} />

            <input
              ref={searchRef}
              type="text"
              className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-ink-strong placeholder:text-ink-muted"
              value={query}
              placeholder={searchPlaceholder}
              autoComplete="off"
              aria-autocomplete="list"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          <ul className="max-h-60 overflow-y-auto list-none m-0 p-1">
            {filtered.length === 0 ? (
              <li className="p-3 text-sm text-center text-ink-muted">
                Sin resultados
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;

                return (
                  <li
                    key={option.value}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer ${
                      index === activeIndex
                        ? "bg-accent-soft text-accent"
                        : "text-ink-strong"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {option.icon && (
                        <Icon name={option.icon} size={16} className="shrink-0 text-ink-muted" />
                      )}

                      <span>{option.label}</span>
                    </span>

                    {isSelected && <Icon name="check" size={16} />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}