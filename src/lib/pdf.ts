import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function generatePdfBlob(
  element: ReactElement<DocumentProps>,
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  return pdf(element).toBlob();
}

export async function downloadPdf(
  element: ReactElement<DocumentProps>,
  filename: string,
): Promise<void> {
  const blob = await generatePdfBlob(element);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}