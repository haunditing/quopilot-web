import { forwardRef } from "react";
import { formatCurrency, formatDate } from "../lib/format.js";
import type { Customer } from "../types/customer.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";

interface SalePrintTemplateProps {
  tenant: Tenant;
  sale: Sale;
  customer: Customer;
}

const SalePrintTemplate = forwardRef<HTMLDivElement, SalePrintTemplateProps>(
  ({ tenant, sale, customer }, ref) => {
    const issueDate = new Date(sale.createdAt);
    const expiryDate = sale.soldAt ? new Date(sale.soldAt) : null;

    const subtotalBruto = sale.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const totalGeneral = sale.total ?? subtotalBruto;

    return (
      <div
        ref={ref}
        className="alegra-quote-sheet"
        style={{
          width: "100%",
          maxWidth: "800px",
          minHeight: "1050px",
          padding: "30px",
          margin: "0 auto",
          backgroundColor: "#fff",
          color: "#000",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "11px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* ENCABEZADO */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "15px",
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: "20%" }}></td>
                <td style={{ width: "60%", textAlign: "center" }}>
                  <h2
                    style={{
                      margin: "0 0 2px 0",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    {tenant.legalName ?? tenant.name}
                  </h2>
                  {tenant.taxId && (
                    <p style={{ margin: "1px 0" }}>NIT {tenant.taxId}</p>
                  )}
                  {tenant.address && (
                    <p style={{ margin: "1px 0" }}>{tenant.address}</p>
                  )}
                  {tenant.phone && (
                    <p style={{ margin: "1px 0" }}>{tenant.phone}</p>
                  )}
                  {tenant.email && (
                    <p style={{ margin: "1px 0" }}>{tenant.email}</p>
                  )}
                </td>
                <td
                  style={{
                    width: "20%",
                    textAlign: "right",
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#444" }}>Venta</span>
                  <h1
                    style={{
                      margin: "2px 0 0 0",
                      fontSize: "18px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    No. {sale.number}
                  </h1>
                </td>
              </tr>
            </tbody>
          </table>

          {/* DATOS CLIENTE Y FECHAS */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "12px",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    border: "1px solid #aaa",
                    padding: "6px 8px",
                    width: "65%",
                    verticalAlign: "top",
                    lineHeight: "1.3",
                  }}
                >
                  <div>
                    <strong>SEÑOR(ES)</strong> {customer.name || ""}
                  </div>
                  <div>
                    <strong>DIRECCIÓN</strong> {customer.address || ""}
                  </div>
                  <div>
                    <strong>CIUDAD</strong> {customer.municipality || ""}
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>
                      <strong>TELÉFONO</strong> {customer.phone || ""}
                    </span>
                    {customer.identificationNumber && (
                      <span style={{ paddingRight: "10px" }}>
                        <strong>NIT</strong> {customer.identificationNumber}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    border: "1px solid #aaa",
                    padding: 0,
                    width: "35%",
                    verticalAlign: "top",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "center",
                    }}
                  >
                    <tbody>
                      <tr style={{ backgroundColor: "#e0e0e0" }}>
                        <td
                          style={{
                            padding: "3px",
                            fontWeight: "bold",
                            borderBottom: "1px solid #aaa",
                            fontSize: "10px",
                          }}
                        >
                          FECHA DE EXPEDICIÓN
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            padding: "3px",
                            borderBottom: "1px solid #aaa",
                          }}
                        >
                          {formatDate(issueDate.toISOString())}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: "#e0e0e0" }}>
                        <td
                          style={{
                            padding: "3px",
                            fontWeight: "bold",
                            borderBottom: "1px solid #aaa",
                            fontSize: "10px",
                          }}
                        >
                          FECHA DE VENCIMIENTO
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px" }}>
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

        {/* TABLA DE PRODUCTOS (CUBRE EL ALTO HASTA ABAJO SIN DESBORDAR) */}
        <div
          style={{
            flexGrow: 1,
            minHeight: "450px",
            marginBottom: "15px",
            display: "flex",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #aaa",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#bebebe",
                  color: "#000",
                  height: "24px",
                }}
              >
                <th
                  style={{
                    borderBottom: "1px solid #aaa",
                    borderRight: "1px solid #aaa",
                    padding: "4px 6px",
                    textAlign: "left",
                    width: "45%",
                  }}
                >
                  Item
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #aaa",
                    borderRight: "1px solid #aaa",
                    padding: "4px 6px",
                    textAlign: "right",
                    width: "15%",
                  }}
                >
                  Precio
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #aaa",
                    borderRight: "1px solid #aaa",
                    padding: "4px 6px",
                    textAlign: "center",
                    width: "10%",
                  }}
                >
                  Cantidad
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #aaa",
                    borderRight: "1px solid #aaa",
                    padding: "4px 6px",
                    textAlign: "right",
                    width: "15%",
                  }}
                >
                  Descuento
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #aaa",
                    padding: "4px 6px",
                    textAlign: "right",
                    width: "15%",
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr
                  key={index}
                  style={{ height: "22px", verticalAlign: "top" }}
                >
                  <td
                    style={{
                      borderRight: "1px solid #aaa",
                      padding: "3px 6px",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #aaa",
                      padding: "3px 6px",
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(item.unitPrice, sale.currency)}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #aaa",
                      padding: "3px 6px",
                      textAlign: "center",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #aaa",
                      padding: "3px 6px",
                      textAlign: "right",
                    }}
                  >
                    0.00%
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {formatCurrency(item.subtotal, sale.currency)}
                  </td>
                </tr>
              ))}
              {/* Celda vacía que absorbe la altura restante */}
              <tr style={{ height: "100%" }}>
                <td style={{ borderRight: "1px solid #aaa" }}></td>
                <td style={{ borderRight: "1px solid #aaa" }}></td>
                <td style={{ borderRight: "1px solid #aaa" }}></td>
                <td style={{ borderRight: "1px solid #aaa" }}></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "58%",
                fontSize: "9px",
                color: "#333",
                lineHeight: "1.3",
              }}
            >
              <p style={{ margin: 0 }}>
                Este documento se asimila en todos sus efectos a una letra de
                cambio de conformidad con el Art. 774 del código de comercio.
                Autorizo que en caso de incumplimiento de esta obligación sea
                reportado a las centrales de riesgo, se cobraran intereses por
                mora.
              </p>
            </div>
            <div style={{ width: "38%" }}>
              <table style={{ width: "100%", fontSize: "11px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: "bold" }}>
                      Subtotal
                    </td>
                    <td style={{ padding: "2px 0", textAlign: "right" }}>
                      {formatCurrency(subtotalBruto, sale.currency)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: "bold" }}>
                    <td
                      style={{
                        padding: "4px 0 2px 0",
                        borderTop: "1px solid #000",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        padding: "4px 0 2px 0",
                        textAlign: "right",
                        borderTop: "1px solid #000",
                      }}
                    >
                      {formatCurrency(totalGeneral, sale.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              width: "180px",
              borderTop: "1px solid #000",
              textAlign: "center",
              paddingTop: "3px",
              fontSize: "10px",
            }}
          >
            ELABORADO POR
          </div>
        </div>
      </div>
    );
  },
);

SalePrintTemplate.displayName = "SalePrintTemplate";
export default SalePrintTemplate;
