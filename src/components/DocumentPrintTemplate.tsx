import { forwardRef, useState } from "react";
import { formatCurrency, formatDate } from "../lib/format.js";

// --- Tipos e Interfaces Locales ---

export interface PrintTenantInfo {
  name: string;
  legalName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  logoMode?: "main" | "custom";
  documentLogoUrl?: string;
  brandColor?: string;
  footerText?: string;
}

export interface PrintCustomerInfo {
  name?: string;
  address?: string;
  municipality?: string;
  phone?: string;
  identificationNumber?: string;
}

export interface PrintItemInfo {
  name: string;
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
  subtotal: number;
}

export interface PrintDocumentInfo {
  number: string;
  createdAt: string;
  validUntil?: string | null;
  soldAt?: string | null;
  currency?: string;
  total?: number;
  items: PrintItemInfo[];
}

export interface DocumentPrintTemplateProps {
  documentTypeLabel: string;
  tenant: PrintTenantInfo;
  document: PrintDocumentInfo;
  customer: PrintCustomerInfo;
  notes?: string;
  issueDateKey?: "createdAt" | "soldAt";
  showExpiryDate?: boolean;
}

interface BrandingState {
  logoUrl: string;
  documentLogoMode: "main" | "custom";
  documentLogoUrl: string;
  brandColor: string;
  footerText: string;
}

const DocumentPrintTemplate = forwardRef<
  HTMLDivElement,
  DocumentPrintTemplateProps
>(
  (
    {
      documentTypeLabel,
      tenant,
      document,
      customer,
      notes,
      issueDateKey = "createdAt",
      showExpiryDate = true,
    },
    ref,
  ) => {
    const issueDate = new Date(document[issueDateKey] ?? document.createdAt);
    const expiryDate = showExpiryDate
      ? document.validUntil
        ? new Date(document.validUntil)
        : null
      : null;

  const subtotalBruto = document.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const [branding] = useState<BrandingState>({
    logoUrl: tenant.logoUrl ?? "",
    documentLogoMode: tenant.logoMode ?? "main",
    documentLogoUrl: tenant.documentLogoUrl ?? "",
    brandColor: tenant.brandColor ?? "#000000",
    footerText: tenant.footerText ?? "",
  });

  const totalGeneral = document.total ?? subtotalBruto;
  const currency = document.currency ?? "COP";
  const effectiveDocumentLogo =
    branding.documentLogoMode === "custom"
      ? branding.documentLogoUrl
      : branding.logoUrl;

  function companyInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return "Q";
    }

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return (
    <div ref={ref} className="quopilot-quote-sheet">
      <div>
        {/* ENCABEZADO EMPRESA */}
        <table className="quopilot-quote-header">
          <tbody>
            <tr>
              <td className="quopilot-quote-header-col-left">
                <div className="settings-preview__doc-header">
                  {effectiveDocumentLogo ? (
                    <img
                      className="quote-erp__logo"
                      src={effectiveDocumentLogo}
                      alt="Logo de la empresa"
                    />
                  ) : (
                    <span
                      className="settings-preview__doc-avatar"
                      aria-hidden="true"
                    >
                      {companyInitials(tenant.name)}
                    </span>
                  )}
                </div>
              </td>
              <td className="quopilot-quote-header-col-center">
                <h2 className="quopilot-quote-header-title">
                  {tenant.legalName ?? tenant.name}
                </h2>
                {tenant.taxId && (
                  <p className="quopilot-quote-header-text">
                    NIT {tenant.taxId}
                  </p>
                )}
                {tenant.address && (
                  <p className="quopilot-quote-header-text">{tenant.address}</p>
                )}
                {tenant.phone && (
                  <p className="quopilot-quote-header-text">{tenant.phone}</p>
                )}
                {tenant.email && (
                  <p className="quopilot-quote-header-text">{tenant.email}</p>
                )}
              </td>
              <td className="quopilot-quote-header-col-right">
                <span className="quopilot-quote-type-label">
                  {documentTypeLabel}
                </span>
                <h1 className="quopilot-quote-number">No. {document.number}</h1>
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATOS CLIENTE Y FECHAS */}
        <table className="quopilot-quote-customer-dates-table">
          <tbody>
            <tr>
              <td className="quopilot-quote-customer-cell">
                <div>
                  <strong>SEÑOR(ES)</strong> {customer.name || ""}
                </div>
                <div>
                  <strong>DIRECCIÓN</strong> {customer.address || ""}
                </div>
                <div>
                  <strong>CIUDAD</strong> {customer.municipality || ""}
                </div>
                <div className="quopilot-quote-customer-flex-row">
                  <span>
                    <strong>TELÉFONO</strong> {customer.phone || ""}
                  </span>
                  {customer.identificationNumber && (
                    <span className="quopilot-quote-customer-id-span">
                      <strong>NIT/CC</strong> {customer.identificationNumber}
                    </span>
                  )}
                </div>
              </td>
              <td className="quopilot-quote-dates-cell">
                <table className="quopilot-quote-dates-table">
                  <tbody>
                    <tr className="quopilot-quote-date-header-row">
                      <td className="quopilot-quote-date-header">
                        FECHA DE EXPEDICIÓN
                      </td>
                    </tr>
                    <tr>
                      <td className="quopilot-quote-date-value">
                        {formatDate(issueDate.toISOString())}
                      </td>
                    </tr>
                    <tr className="quopilot-quote-date-header-row">
                      <td className="quopilot-quote-date-header">
                        FECHA DE VENCIMIENTO
                      </td>
                    </tr>
                    <tr>
                      <td className="quopilot-quote-date-value-last">
                        {expiryDate
                          ? formatDate(expiryDate.toISOString())
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="quopilot-quote-table-container">
        <table className="quopilot-quote-items-table">
          <thead>
            <tr className="quopilot-quote-table-header-row">
              <th className="quopilot-quote-th quopilot-quote-th-item">Item</th>
              <th className="quopilot-quote-th quopilot-quote-th-price">
                Precio
              </th>
              <th className="quopilot-quote-th quopilot-quote-th-quantity">
                Cantidad
              </th>
              <th className="quopilot-quote-th quopilot-quote-th-discount">
                Descuento
              </th>
              <th className="quopilot-quote-th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, index) => {
              const discount = item.discountPercent ?? 0;
              return (
                <tr key={index} className="quopilot-quote-tr-item">
                  <td className="quopilot-quote-td">{item.name}</td>
                  <td className="quopilot-quote-td quopilot-quote-td-align-right">
                    {formatCurrency(item.unitPrice, currency)}
                  </td>
                  <td className="quopilot-quote-td quopilot-quote-td-align-center">
                    {item.quantity}
                  </td>
                  <td className="quopilot-quote-td quopilot-quote-td-align-right">
                    {discount.toFixed(2)}%
                  </td>
                  <td className="quopilot-quote-td-last">
                    {formatCurrency(item.subtotal, currency)}
                  </td>
                </tr>
              );
            })}
            <tr className="quopilot-quote-tr-filler">
              <td className="quopilot-quote-td"></td>
              <td className="quopilot-quote-td"></td>
              <td className="quopilot-quote-td"></td>
              <td className="quopilot-quote-td"></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PIE DE PÁGINA */}
      <div>
        <div className="quopilot-quote-footer-flex">
          <div className="quopilot-quote-notes">
            <p className="quopilot-quote-notes-text">
              {notes ??
                "Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora."}
            </p>
          </div>
          <div className="quopilot-quote-totals-wrapper">
            <table className="quopilot-quote-totals-table">
              <tbody>
                <tr>
                  <td className="quopilot-quote-subtotal-label">Subtotal</td>
                  <td className="quopilot-quote-subtotal-value">
                    {formatCurrency(subtotalBruto, currency)}
                  </td>
                </tr>
                <tr className="quopilot-quote-total-row">
                  <td className="quopilot-quote-total-label">Total</td>
                  <td className="quopilot-quote-total-value">
                    {formatCurrency(totalGeneral, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="quopilot-quote-signature">ELABORADO POR</div>
      </div>
    </div>
  );
  },
);

DocumentPrintTemplate.displayName = "DocumentPrintTemplate";
export default DocumentPrintTemplate;
