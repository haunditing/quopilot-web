import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingGlyph } from "./Loading.js";
import { getProducts } from "../services/product-service.js";
import { formatCurrency } from "../lib/format.js";
import type { Product } from "../types/product.js";

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export default function ProductSearch({
  onSelect,
  placeholder = "Buscar producto por nombre o SKU...",
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequenceRef = useRef(0);

  const searchProducts = useCallback(async (search: string) => {
    const requestId = ++searchSequenceRef.current;

    if (search.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setNoResults(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setNoResults(false);

    try {
      const response = await getProducts({
        search: search.trim(),
        limit: 20,
        status: "ACTIVE",
      });

      if (requestId !== searchSequenceRef.current) {
        return; // llegó una respuesta obsoleta: ignorar
      }

      setResults(response.data);
      setNoResults(response.data.length === 0);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      if (requestId !== searchSequenceRef.current) {
        return;
      }
      setResults([]);
      setNoResults(true);
      setOpen(true);
    } finally {
      if (requestId === searchSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void searchProducts(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchProducts]);

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

  function handleSelect(product: Product) {
    onSelect(product);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "ArrowDown" && results.length > 0) {
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) =>
          current < results.length - 1 ? current + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) =>
          current > 0 ? current - 1 : results.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full py-2.5 pl-3 pr-9 rounded-[10px] border border-line bg-surface-card text-sm leading-snug text-ink-strong focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
        value={query}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0 || query.trim().length >= MIN_QUERY_LENGTH) {
            setOpen(true);
          }
        }}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
      />

      {loading && (
        <LoadingGlyph size="sm" className="absolute right-3 top-1/2 -mt-2 w-4 h-4 rounded-full border-2 border-line border-t-accent animate-spin" />
      )}

      {open && (
        <ul className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 max-h-[280px] overflow-y-auto m-0 p-1.5 list-none rounded-[10px] border border-line bg-surface-card shadow-[0_8px_24px_rgba(0,0,0,0.12)]" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-3.5 text-sm text-center text-ink-muted">
              {noResults
                ? "No se encontraron productos"
                : "Escribe al menos 2 caracteres para buscar"}
            </li>
          ) : (
            results.map((product, index) => (
              <li
                key={product._id}
                className={
                  index === activeIndex
                    ? "flex flex-col gap-0.5 px-3 py-2.5 rounded-lg bg-accent-soft cursor-pointer transition-colors duration-150"
                    : "flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-accent-soft"
                }
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => handleSelect(product)}
              >
                <span className="text-sm font-semibold text-ink-strong truncate whitespace-nowrap">
                  {product.name}
                </span>
                <span className="text-[13px] text-ink-muted">
                  {product.sku ? `${product.sku} · ` : ""}
                  {formatCurrency(product.unitPrice, product.currency)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
