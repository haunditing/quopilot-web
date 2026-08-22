import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Info } from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import {
  ITEM_TYPE_OPTIONS,
  TAX_RATE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  WAREHOUSE_OPTIONS,
} from "../config/product-options.js";
import { formatCurrency } from "../lib/format.js";
import type { ItemType } from "../types/product.js";

interface ProductQuickModalProps {
  open: boolean;
  defaultItemType: ItemType;
  currency: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onGoAdvanced: (draft: {
    name: string;
    itemType: ItemType;
    unitOfMeasure: string;
    warehouse: string;
  }) => void;
  onSubmit: (input: {
    itemType: ItemType;
    name: string;
    warehouse: string;
    unitOfMeasure: string;
    quantity: string;
    cost: string;
    basePrice: string;
    taxRate: string;
  }) => void;
}

export default function ProductQuickModal({
  open,
  defaultItemType,
  currency,
  saving,
  error,
  onCancel,
  onGoAdvanced,
  onSubmit,
}: ProductQuickModalProps) {
  const [itemType, setItemType] = useState<ItemType>(defaultItemType);
  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("Principal");
  const [unitOfMeasure, setUnitOfMeasure] = useState("UNIT");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");

  const [nameError, setNameError] = useState("");

  const taxPercent = useMemo(() => {
    const parsed = Number(taxRate);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [taxRate]);

  const totalPrice = useMemo(() => {
    const base = Number(basePrice);

    if (!Number.isFinite(base) || base < 0) {
      return null;
    }

    return Number((base * (1 + taxPercent / 100)).toFixed(2));
  }, [basePrice, taxPercent]);

  const itemTypeLabel =
    ITEM_TYPE_OPTIONS.find((option) => option.value === itemType)?.label ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      return;
    }

    onSubmit({
      itemType,
      name: name.trim(),
      warehouse,
      unitOfMeasure,
      quantity,
      cost,
      basePrice,
      taxRate,
    });
  }

  function handleGoAdvanced() {
    onGoAdvanced({
      name: name.trim(),
      itemType,
      unitOfMeasure,
      warehouse,
    });
  }

  const taxOptionValue =
    TAX_RATE_OPTIONS.find((option) => Number(option.value) === taxPercent)
      ?.value ?? String(taxPercent);

  return (
    <Modal
      open={open}
      title="Nuevo producto / servicio"
      onClose={onCancel}
      panelClassName="max-w-[560px]"
    >
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
        {/* Selector de tipo */}
        <div
          className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-[10px]"
          role="group"
          aria-label="Tipo de ítem"
        >
          {ITEM_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                itemType === option.value
                  ? "product-modal__type-tab bg-white !text-ink-strong shadow-sm"
                  : "px-3 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-150 text-slate-500 hover:bg-white/60 disabled:opacity-55 disabled:cursor-not-allowed"
              }
              aria-pressed={itemType === option.value}
              onClick={() => setItemType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="flex items-center gap-1.5 m-0 text-xs text-slate-500 [&>svg]:shrink-0 [&>svg]:text-slate-400">
          <Info size={14} />
          El tipo de ítem no se puede modificar después de la creación.
        </p>

        <Field
          id="product-name"
          label="Nombre del producto/servicio"
          type="text"
          value={name}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
            setNameError("");
          }}
          placeholder='Ej.: Laptop HP 14"'
          required
        />

        <div className="grid grid-cols-2 gap-3.5 max-[480px]:grid-cols-1">
          <Field
            id="product-warehouse"
            label="Bodega / Almacén inicial"
            as="select"
            value={warehouse}
            onChange={(event) => setWarehouse(event.target.value)}
          >
            {WAREHOUSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>

          <Field
            id="product-unit-of-measure"
            label="Unidad de medida"
            as="select"
            value={unitOfMeasure}
            onChange={(event) => setUnitOfMeasure(event.target.value)}
          >
            {UNIT_OF_MEASURE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3.5 max-[480px]:grid-cols-1">
          <Field
            id="product-quantity"
            label="Cantidad inicial"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />

          <Field
            id="product-cost"
            label="Costo inicial (sin impuestos)"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5 max-[480px]:grid-cols-1">
          <Field
            id="product-base-price"
            label="Precio base"
            type="number"
            min="0"
            step="0.01"
            value={basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
            required
          />

          <Field
            id="product-tax-rate"
            label="Impuesto / IVA"
            as="select"
            value={taxOptionValue}
            onChange={(event) => setTaxRate(event.target.value)}
          >
            {TAX_RATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
        </div>

        {/* Resumen de precio total */}
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[10px] border border-indigo-200 bg-indigo-50 [&>div]:flex [&>div]:flex-col [&>div]:gap-0.5 [&>span]:text-indigo-900 [&>span]:text-[13px] [&>span]:font-bold [&>small]:text-indigo-600 [&>small]:text-xs">
          <div>
            <span>Precio total</span>
            <small>
              Precio base + {taxPercent}% de impuesto · {itemTypeLabel}
            </small>
          </div>

          <strong className="text-indigo-900 text-xl font-extrabold">
            {totalPrice === null ? "—" : formatCurrency(totalPrice, currency)}
          </strong>
        </div>

        {error && <FormMessage kind="error">{error}</FormMessage>}

        <div className="flex items-center justify-between gap-3 pt-1 max-[480px]:flex-col-reverse max-[480px]:items-stretch">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2 py-2 border-none font-[inherit] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 text-indigo-600 hover:text-indigo-900 max-[480px]:justify-center"
            onClick={handleGoAdvanced}
          >
            Ir al formulario avanzado
            <ArrowRight size={16} />
          </button>

          <div className="flex gap-2.5 max-[480px]:flex-col-reverse max-[480px]:[&>button]:w-full">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Creando..." : "Crear producto"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
