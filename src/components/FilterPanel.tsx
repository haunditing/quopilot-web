import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Button from "./Button.js";
import Icon from "./Icon.js";
import type { FilterValues } from "../hooks/useFilteredList.js";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilterFieldConfig {
  type: "select";
  id: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  loading?: boolean;
}

export interface TextFilterFieldConfig {
  type: "text";
  id: string;
  label: string;
  placeholder?: string;
}

export interface DateFilterFieldConfig {
  type: "date";
  id: string;
  label: string;
}

export interface DateRangeFilterFieldConfig {
  type: "date-range";
  id: string;
  label: string;
}

export interface NumberFilterFieldConfig {
  type: "number";
  id: string;
  label: string;
  placeholder?: string;
}

export interface NumberRangeFilterFieldConfig {
  type: "number-range";
  id: string;
  label: string;
  placeholderFrom?: string;
  placeholderTo?: string;
}

export type FilterFieldConfig =
  | SelectFilterFieldConfig
  | TextFilterFieldConfig
  | DateFilterFieldConfig
  | DateRangeFilterFieldConfig
  | NumberFilterFieldConfig
  | NumberRangeFilterFieldConfig;

interface FilterPanelProps {
  fields: FilterFieldConfig[];
  values: FilterValues;
  onSet: (id: string, value: string) => void;
  onClear?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

function isRangeField(
  field: FilterFieldConfig,
): field is DateRangeFilterFieldConfig | NumberRangeFilterFieldConfig {
  return field.type === "date-range" || field.type === "number-range";
}

interface ActiveFilter {
  keys: string[];
  label: string;
}

function buildActiveFilters(
  fields: FilterFieldConfig[],
  values: FilterValues,
): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  for (const field of fields) {
    if (isRangeField(field)) {
      const from = values[`${field.id}From`] ?? "";
      const to = values[`${field.id}To`] ?? "";

      if (from) {
        active.push({
          keys: [`${field.id}From`],
          label: `${field.label}: desde ${from}`,
        });
      }

      if (to) {
        active.push({
          keys: [`${field.id}To`],
          label: `${field.label}: hasta ${to}`,
        });
      }
    } else {
      const value = values[field.id] ?? "";

      if (value === "") {
        continue;
      }

      const displayLabel =
        field.type === "select"
          ? (field.options.find((option) => option.value === value)?.label ??
            value)
          : value;

      active.push({ keys: [field.id], label: `${field.label}: ${displayLabel}` });
    }
  }

  return active;
}

export default function FilterPanel({
  fields,
  values,
  onSet,
  onClear,
  search = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const activeFilters = buildActiveFilters(fields, values);
  const activeCount = activeFilters.length;

  function removeFilter(filter: ActiveFilter) {
    filter.keys.forEach((key) => onSet(key, ""));
  }

  return (
    <section className="filter-panel">
      <div className="filter-panel__toolbar">
        {onSearchChange && (
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        <div className="filter-panel__toggle">
          <Button
            icon="filter"
            variant="secondary"
            className={activeCount > 0 ? "filter-panel__toggle--active" : undefined}
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
          >
            Filtros
          </Button>

          {activeCount > 0 && (
            <span className="filter-panel__badge" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </div>
      </div>

      {(activeFilters.length > 0 || search !== "") && (
        <div className="filter-panel__chips">
          {search !== "" && (
            <button
              type="button"
              className="filter-panel__chip"
              onClick={() => onSearchChange?.("")}
              title="Quitar búsqueda"
            >
              <span>Búsqueda: “{search}”</span>
              <Icon name="close" size={12} />
            </button>
          )}

          {activeFilters.map((filter) => (
            <button
              type="button"
              key={filter.keys.join("-")}
              className="filter-panel__chip"
              onClick={() => removeFilter(filter)}
              title={`Quitar filtro: ${filter.label}`}
            >
              <span>{filter.label}</span>
              <Icon name="close" size={12} />
            </button>
          ))}

          {onClear && (
            <button
              type="button"
              className="filter-panel__chips-clear"
              onClick={onClear}
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="filter-panel__body">
          <div className="filter-panel__fields">
            {fields.map((field) => (
              <FilterField
                key={field.id}
                field={field}
                values={values}
                onSet={onSet}
              />
            ))}
          </div>

          {onClear && activeCount > 0 && (
            <div className="filter-panel__actions">
              <Button icon="close" variant="secondary" onClick={onClear}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(value), 0);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;

    setDraft(next);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => onChange(next), 300);
  }

  function clearSearch() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setDraft("");
    onChange("");
  }

  return (
    <div className="filter-panel__search">
      <Icon name="search" size={16} />

      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={handleChange}
      />

      {draft !== "" && (
        <button
          type="button"
          className="filter-panel__search-clear"
          onClick={clearSearch}
          aria-label="Borrar búsqueda"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

function FilterField({
  field,
  values,
  onSet,
}: {
  field: FilterFieldConfig;
  values: FilterValues;
  onSet: (id: string, value: string) => void;
}): ReactNode {
  const fieldId = `filter-${field.id}`;

  switch (field.type) {
    case "select":
      return (
        <div className="form-field filter-panel__field--select">
          <label htmlFor={fieldId}>{field.label}</label>

          <select
            id={fieldId}
            value={values[field.id] ?? ""}
            onChange={(event) => onSet(field.id, event.target.value)}
            disabled={field.loading}
          >
            <option value="">{field.placeholder ?? "Todos"}</option>

            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "text":
      return (
        <TextFilterField
          field={field}
          value={values[field.id] ?? ""}
          onSet={onSet}
        />
      );

    case "date":
      return (
        <div className="form-field filter-panel__field--date">
          <label htmlFor={fieldId}>{field.label}</label>

          <input
            id={fieldId}
            type="date"
            value={values[field.id] ?? ""}
            onChange={(event) => onSet(field.id, event.target.value)}
          />
        </div>
      );

    case "number":
      return (
        <div className="form-field filter-panel__field--number">
          <label htmlFor={fieldId}>{field.label}</label>

          <input
            id={fieldId}
            type="number"
            value={values[field.id] ?? ""}
            placeholder={field.placeholder}
            onChange={(event) => onSet(field.id, event.target.value)}
          />
        </div>
      );

    case "date-range":
      return (
        <RangeField
          className="filter-panel__field--range"
          label={field.label}
          fromValue={values[`${field.id}From`] ?? ""}
          toValue={values[`${field.id}To`] ?? ""}
          onFromChange={(value) => onSet(`${field.id}From`, value)}
          onToChange={(value) => onSet(`${field.id}To`, value)}
          fromPlaceholder="Desde"
          toPlaceholder="Hasta"
          type="date"
        />
      );

    case "number-range":
      return (
        <RangeField
          className="filter-panel__field--range"
          label={field.label}
          fromValue={values[`${field.id}From`] ?? ""}
          toValue={values[`${field.id}To`] ?? ""}
          onFromChange={(value) => onSet(`${field.id}From`, value)}
          onToChange={(value) => onSet(`${field.id}To`, value)}
          fromPlaceholder={field.placeholderFrom ?? "Desde"}
          toPlaceholder={field.placeholderTo ?? "Hasta"}
          type="number"
        />
      );
  }
}

function RangeField({
  className,
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromPlaceholder,
  toPlaceholder,
  type,
}: {
  className?: string;
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromPlaceholder: string;
  toPlaceholder: string;
  type: "date" | "number";
}) {
  return (
    <div className={`form-field ${className ?? ""}`.trim()}>
      <label>{label}</label>

      <div className="filter-panel__range">
        <input
          type={type}
          value={fromValue}
          placeholder={fromPlaceholder}
          aria-label={`${label} desde`}
          onChange={(event) => onFromChange(event.target.value)}
        />

        <input
          type={type}
          value={toValue}
          placeholder={toPlaceholder}
          aria-label={`${label} hasta`}
          onChange={(event) => onToChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function TextFilterField({
  field,
  value,
  onSet,
}: {
  field: TextFilterFieldConfig;
  value: string;
  onSet: (id: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(value), 0);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;

    setDraft(next);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => onSet(field.id, next), 300);
  }

  return (
    <div className="form-field">
      <label htmlFor={`filter-${field.id}`}>{field.label}</label>

      <input
        id={`filter-${field.id}`}
        type="text"
        value={draft}
        placeholder={field.placeholder ?? "Buscar..."}
        onChange={handleChange}
      />
    </div>
  );
}
