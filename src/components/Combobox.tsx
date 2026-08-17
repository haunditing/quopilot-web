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
    <div ref={containerRef} className="combobox" data-open={open}>
      <button
        id={id}
        type="button"
        className="combobox__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openCombobox())}
      >
        <span className="combobox__trigger-main">
          {selected?.icon && (
            <Icon name={selected.icon} size={16} className="combobox__option-icon" />
          )}

          <span
            className={
              selected ? "combobox__value" : "combobox__placeholder"
            }
          >
            {selected?.label ?? placeholder}
          </span>
        </span>

        <Icon name="chevron-down" size={16} className="combobox__chevron" />
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
        <div className="combobox__panel" role="listbox">
          <div className="combobox__search">
            <Icon name="search" size={16} />

            <input
              ref={searchRef}
              type="text"
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

          <ul className="combobox__list">
            {filtered.length === 0 ? (
              <li className="combobox__empty">Sin resultados</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;

                return (
                  <li
                    key={option.value}
                    className={
                      index === activeIndex
                        ? "combobox__option combobox__option--active"
                        : "combobox__option"
                    }
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span className="combobox__option-main">
                      {option.icon && (
                        <Icon name={option.icon} size={16} className="combobox__option-icon" />
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