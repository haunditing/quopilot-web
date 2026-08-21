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
    <div ref={containerRef} className="product-search">
      <input
        ref={inputRef}
        type="text"
        className="product-search__input"
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
        <LoadingGlyph size="sm" className="product-search__spinner" />
      )}

      {open && (
        <ul className="product-search__dropdown" role="listbox">
          {results.length === 0 ? (
            <li className="product-search__empty">
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
                    ? "product-search__option product-search__option--active"
                    : "product-search__option"
                }
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => handleSelect(product)}
              >
                <span className="product-search__option-name">
                  {product.name}
                </span>
                <span className="product-search__option-meta">
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
