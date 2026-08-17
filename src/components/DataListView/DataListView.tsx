import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
} from "lucide-react";
import "./DataListView.css";
import type { DataListViewProps } from "./types";
import Button from "../Button";

const DEFAULT_PAGE_SIZE = 10;

export default function DataListView<T extends object>({
  items,
  columns,
  rowKey,
  filters: initialFilters = [],
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  onFilterChange,
  onPageChange,
  totalItems,
  loading = false,
  emptyState = "No hay datos disponibles",
}: DataListViewProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {},
  );

  const [showFilters, setShowFilters] = useState(false);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenChipKey(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const next = { ...activeFilters };
      if (!value || value.trim() === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      setActiveFilters(next);
      onFilterChange?.(next);
      setPage(1);
    },
    [activeFilters, onFilterChange],
  );

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm("");
    onFilterChange?.({});
    setPage(1);
    setOpenChipKey(null);
  }, [onFilterChange]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      onPageChange?.(newPage);
    },
    [onPageChange],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemRecord = item as Record<string, unknown>;

      const matchesSearch =
        !searchTerm ||
        Object.values(itemRecord).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        );

      const matchesFilters = Object.entries(activeFilters).every(
        ([key, filterVal]) => {
          if (!filterVal) return true;
          const itemVal = String(itemRecord[key] ?? "").toLowerCase();
          return itemVal.includes(filterVal.toLowerCase());
        },
      );

      return matchesSearch && matchesFilters;
    });
  }, [items, searchTerm, activeFilters]);

  const total = totalItems ?? filteredItems.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const hasActiveFilters =
    searchTerm !== "" || Object.keys(activeFilters).length > 0;

  return (
    <div className="data-list-container">
      <div className="card-table">
        {/* Toolbar superior */}
        <div className="card-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {initialFilters.length > 0 && (
            <Button
              icon="filter"
              iconOnly
              className={`btn-filter-trigger ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((prev) => !prev)}
            >
              Filtrar
            </Button>
          )}
        </div>

        {/* Panel de chips de filtros */}
        {showFilters && initialFilters.length > 0 && (
          <div className="filters-bar" ref={containerRef}>
            <div className="filters-group">
              {initialFilters.map((filter) => {
                const isOpen = openChipKey === filter.key;
                const currentValue = activeFilters[filter.key] || "";

                return (
                  <div key={filter.key} className="chip-wrapper">
                    <button
                      type="button"
                      className={`filter-chip ${currentValue ? "has-value" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenChipKey(isOpen ? null : filter.key);
                      }}
                    >
                      <Filter size={14} className="chip-icon" />
                      <span>{filter.label}</span>
                      <ChevronDown size={14} className="chip-arrow" />
                    </button>

                    {isOpen && (
                      <div className="chip-popover">
                        <div className="chip-popover-header">
                          <span className="chip-popover-title">
                            {filter.label}
                          </span>
                          {currentValue && (
                            <button
                              type="button"
                              className="btn-clear-chip"
                              title="Limpiar filtro"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFilterChange(filter.key, "");
                                setOpenChipKey(null);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="chip-popover-body">
                          {filter.options && filter.options.length > 0 ? (
                            <select
                              className="chip-select"
                              value={currentValue}
                              onChange={(e) => {
                                handleFilterChange(filter.key, e.target.value);
                                setOpenChipKey(null);
                              }}
                            >
                              <option value="">Todos</option>
                              {filter.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="chip-input"
                              placeholder={`Filtrar ${filter.label.toLowerCase()}...`}
                              value={currentValue}
                              onChange={(e) =>
                                handleFilterChange(filter.key, e.target.value)
                              }
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn-remove-filters"
              >
                Remover filtros
              </button>
            )}
          </div>
        )}

        {/* Tabla */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.align === "right" ? "text-right" : ""}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="state-cell">
                    Cargando...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="state-cell">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const itemRecord = item as Record<string, unknown>;
                  return (
                    <tr key={rowKey(item)}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={col.align === "right" ? "text-right" : ""}
                        >
                          {col.render
                            ? col.render(item)
                            : String(itemRecord[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pagination-container">
          <div className="pagination-left">
            <span>Resultados por página:</span>
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="pagination-range">
              {startItem}-{endItem} de {total}
            </span>
          </div>

          <div className="pagination-right">
            <span>Página</span>
            <input
              type="number"
              className="page-input"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= totalPages) {
                  handlePageChange(val);
                }
              }}
            />
            <span>de {totalPages}</span>
            <div className="pagination-nav-buttons">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="page-nav-btn"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
