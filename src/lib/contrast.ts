export function parseHexColor(color: string): {
  r: number;
  g: number;
  b: number;
} | null {
  const trimmed = color.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return null;
  }

  const hex = trimmed.toLowerCase();

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const s = value / 255;

    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(
  l1: number,
  l2: number,
): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastTextFor(
  color: string,
): "#ffffff" | "#0f172a" {
  const parsed = parseHexColor(color);

  if (!parsed) {
    return "#ffffff";
  }

  const whiteL = relativeLuminance(255, 255, 255);
  const darkL = relativeLuminance(15, 23, 42);
  const bgL = relativeLuminance(parsed.r, parsed.g, parsed.b);

  const whiteContrast = contrastRatio(whiteL, bgL);
  const darkContrast = contrastRatio(darkL, bgL);

  return whiteContrast >= darkContrast ? "#ffffff" : "#0f172a";
}