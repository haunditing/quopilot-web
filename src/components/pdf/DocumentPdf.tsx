import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  PrintCustomerInfo,
  PrintDocumentInfo,
  PrintTenantInfo,
} from "./types.js";

interface DocumentPdfProps {
  documentTypeLabel: string;
  tenant: PrintTenantInfo;
  document: PrintDocumentInfo;
  customer: PrintCustomerInfo;
  notes?: string;
  issueDateKey?: "createdAt" | "soldAt";
  showExpiryDate?: boolean;
}

function companyInitials(name?: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "Q";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatCurrency(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `${amount.toLocaleString("es-CO")} ${currency}`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("es-CO");
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 14,
  },
  headerLeft: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 70,
    backgroundColor: "#111827",
    color: "#ffffff",
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
    textAlign: "center",
    marginBottom: 1,
    color: "#374151",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  documentType: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 2,
  },
  documentNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  customerRow: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 14,
  },
  customerCell: {
    flex: 3,
  },
  datesCell: {
    flex: 1,
    alignItems: "flex-end",
  },
  customerLine: {
    fontSize: 9,
    marginBottom: 2,
    color: "#111827",
  },
  customerStrong: {
    fontFamily: "Helvetica-Bold",
  },
  dateHeader: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  dateValue: {
    fontSize: 9,
    textAlign: "right",
  },
  itemsTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colItem: { width: "42%" },
  colPrice: { width: "17%", textAlign: "right" },
  colQuantity: { width: "12%", textAlign: "center" },
  colDiscount: { width: "13%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
  },
  notesCell: {
    flex: 2,
    paddingRight: 12,
  },
  notesText: {
    fontSize: 7,
    lineHeight: 1.5,
    color: "#374151",
  },
  totalsCell: {
    flex: 1,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 2,
  },
  subtotalLabel: {
    fontSize: 8,
  },
  subtotalValue: {
    fontSize: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 4,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  signature: {
    marginTop: 28,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
});

export default function DocumentPdf({
  documentTypeLabel,
  tenant,
  document,
  customer,
  notes,
  issueDateKey = "createdAt",
  showExpiryDate = true,
}: DocumentPdfProps) {
  const issueDate = new Date(document[issueDateKey] ?? document.createdAt);
  const expiryDate = showExpiryDate && document.validUntil
    ? new Date(document.validUntil)
    : null;

  const subtotalBruto = document.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const totalGeneral = document.total ?? subtotalBruto;
  const currency = document.currency ?? "COP";

  const logoMode = tenant.logoMode ?? "main";
  const effectiveLogo =
    logoMode === "custom" ? tenant.documentLogoUrl : tenant.logoUrl;

  const defaultNotes =
    "Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.";

  return (
    <Document
      title={`${documentTypeLabel} ${document.number}`}
      author={tenant.legalName ?? tenant.name}
      subject={`${documentTypeLabel} No. ${document.number}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {effectiveLogo ? (
              <Image src={effectiveLogo} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text>{companyInitials(tenant.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>{tenant.legalName ?? tenant.name}</Text>
            {tenant.taxId && <Text style={styles.companyLine}>NIT {tenant.taxId}</Text>}
            {tenant.address && <Text style={styles.companyLine}>{tenant.address}</Text>}
            {tenant.phone && <Text style={styles.companyLine}>{tenant.phone}</Text>}
            {tenant.email && <Text style={styles.companyLine}>{tenant.email}</Text>}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.documentType}>{documentTypeLabel}</Text>
            <Text style={styles.documentNumber}>No. {document.number}</Text>
          </View>
        </View>

        <View style={styles.customerRow}>
          <View style={styles.customerCell}>
            <Text style={styles.customerLine}>
              <Text style={styles.customerStrong}>SEÑOR(ES) </Text>
              {customer.name ?? ""}
            </Text>
            <Text style={styles.customerLine}>
              <Text style={styles.customerStrong}>DIRECCIÓN </Text>
              {customer.address ?? ""}
            </Text>
            <Text style={styles.customerLine}>
              <Text style={styles.customerStrong}>CIUDAD </Text>
              {customer.municipality ?? ""}
            </Text>
            <Text style={styles.customerLine}>
              <Text style={styles.customerStrong}>TELÉFONO </Text>
              {customer.phone ?? ""}
              {customer.identificationNumber ? (
                <Text>
                  {"   "}
                  <Text style={styles.customerStrong}>NIT/CC </Text>
                  {customer.identificationNumber}
                </Text>
              ) : null}
            </Text>
          </View>

          <View style={styles.datesCell}>
            <Text style={styles.dateHeader}>FECHA DE EXPEDICIÓN</Text>
            <Text style={styles.dateValue}>{formatDate(issueDate)}</Text>
            {showExpiryDate && (
              <>
                <Text style={styles.dateHeader}>FECHA DE VENCIMIENTO</Text>
                <Text style={styles.dateValue}>
                  {expiryDate ? formatDate(expiryDate) : "-"}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio</Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Cantidad</Text>
            <Text style={[styles.tableHeaderCell, styles.colDiscount]}>Descuento</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>

          {document.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colItem]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrency(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.tableCell, styles.colQuantity]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.colDiscount]}>
                {(item.discountPercent ?? 0).toFixed(2)}%
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(item.subtotal, currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.notesCell}>
            <Text style={styles.notesText}>{notes ?? defaultNotes}</Text>
          </View>

          <View style={styles.totalsCell}>
            <View style={styles.totalsRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>
                {formatCurrency(subtotalBruto, currency)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalGeneral, currency)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.signature}>ELABORADO POR</Text>
      </Page>
    </Document>
  );
}