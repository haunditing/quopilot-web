import { forwardRef } from "react";
import { formatCurrency, formatDate } from "../lib/format.js";
import type { Customer } from "../types/customer.js";
import type { Quote } from "../types/quote.js";
import type { Tenant } from "../types/tenant.js";

interface QuotePrintTemplateProps {
  tenant: Tenant;
  quote: Quote;
  customer: Customer;
}

const STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  VIEWED: "Vista",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
};

const QuotePrintTemplate = forwardRef<HTMLDivElement, QuotePrintTemplateProps>(
  ({ tenant, quote, customer }, ref) => {
    const issueDate = new Date(quote.createdAt);
    const expiryDate = quote.validUntil ? new Date(quote.validUntil) : null;

    const subtotalBruto = quote.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const totalDescuentos = 0;
    const subtotalNeto = subtotalBruto - totalDescuentos;
    const tasaIva = 0.19;
    const totalImpuestos = subtotalNeto * tasaIva;
    const totalGeneral = subtotalNeto + totalImpuestos;

    return (
      <div ref={ref} className="quote-print">
        <header className="quote-print__header">
          <div className="quote-print__company">
            <h1>{tenant.legalName ?? tenant.name}</h1>
            <div className="quote-print__company-meta">
              {tenant.taxId && <span>NIT: {tenant.taxId}</span>}
              {tenant.email && <span>{tenant.email}</span>}
              {tenant.phone && <span>Tel: {tenant.phone}</span>}
              {tenant.country && <span>{tenant.country}</span>}
            </div>
          </div>

          <div className="quote-print__doc">
            <h2>Cotización / Estímulo de Venta</h2>
            <span className="quote-print__number">N° {quote.number}</span>
            <span className="quote-print__status">
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
        </header>

        <section className="quote-print__transaction">
          <div className="quote-print__client-info">
            <h3>Cliente / Razón social</h3>
            <p className="quote-print__client-name">
              {customer.name || "Cliente sin nombre"}
            </p>
            {customer.email && <p>{customer.email}</p>}
            {customer.phone && <p>Tel: {customer.phone}</p>}
            {customer.country && <p>{customer.country}</p>}
          </div>

          <div className="quote-print__dates">
            <div className="quote-print__date-row">
              <span>Fecha de creación / emisión</span>
              <strong>{formatDate(issueDate.toISOString())}</strong>
            </div>
            {expiryDate && (
              <div className="quote-print__date-row">
                <span>Fecha de vencimiento</span>
                <strong>{formatDate(expiryDate.toISOString())}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="quote-print__items">
          <table className="quote-print__table">
            <thead>
              <tr>
                <th>Ítem / N°</th>
                <th>Producto o servicio</th>
                <th>Cantidad</th>
                <th>Precio unitario ($)</th>
                <th>Descuento (%)</th>
                <th>Impuestos / IVA (%)</th>
                <th>Subtotal ($)</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice, quote.currency)}</td>
                  <td>0%</td>
                  <td>19%</td>
                  <td>{formatCurrency(item.subtotal, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="quote-print__summary">
          <div className="quote-print__summary-row">
            <span>Subtotal bruto</span>
            <strong>{formatCurrency(subtotalBruto, quote.currency)}</strong>
          </div>
          <div className="quote-print__summary-row">
            <span>Total de descuentos aplicados</span>
            <strong>{formatCurrency(totalDescuentos, quote.currency)}</strong>
          </div>
          <div className="quote-print__summary-row">
            <span>Subtotal neto</span>
            <strong>{formatCurrency(subtotalNeto, quote.currency)}</strong>
          </div>
          <div className="quote-print__summary-row">
            <span>Total de impuestos</span>
            <strong>{formatCurrency(totalImpuestos, quote.currency)}</strong>
          </div>
          <div className="quote-print__summary-row quote-print__summary-row--total">
            <span>Total general</span>
            <strong>{formatCurrency(totalGeneral, quote.currency)}</strong>
          </div>
        </section>

        <section className="quote-print__notes">
          <h3>Notas</h3>
          <p>
            Esta cotización tiene carácter informativo y no constituye una
            obligación comercial. Los precios y condiciones están sujetos a
            cambios previa notificación.
          </p>
        </section>

        <section className="quote-print__terms">
          <h3>Términos y condiciones</h3>
          <ul>
            <li>
              <strong>Forma de pago:</strong> Acordada con el asesor comercial.
            </li>
            <li>
              <strong>Tiempo de entrega:</strong> A convenir según
              disponibilidad de productos y ubicación.
            </li>
            <li>
              <strong>Validez de la propuesta: </strong>
              {expiryDate
                ? `Hasta el ${formatDate(expiryDate.toISOString())}.`
                : "Por definir con el asesor."}
            </li>
            <li>
              <strong>IVA:</strong> Los precios incluyen IVA del 19% cuando
              aplique.
            </li>
          </ul>
        </section>

        <footer className="quote-print__footer">
          <p>
            Documento generado por {tenant.name}
            {tenant.email ? ` · ${tenant.email}` : ""}
          </p>
        </footer>
      </div>
    );
  },
);

QuotePrintTemplate.displayName = "QuotePrintTemplate";

export default QuotePrintTemplate;
