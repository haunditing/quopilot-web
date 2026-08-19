import DOMPurify from "dompurify";

function stripControlCharacters(value: string): string {
  let result = "";

  for (const character of value) {
    const code = character.charCodeAt(0);

    const isControl =
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127;

    if (!isControl) {
      result += character;
    }
  }

  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(content: string): string {
  let html = escapeHtml(content);

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  html = html.replace(/\n/g, "<br>");

  return html;
}

export function sanitizeChatContent(content: string): string {
  const html = markdownToHtml(content);

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "a", "code", "br", "h1", "h2", "h3"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });

  return stripControlCharacters(sanitized).trim();
}

export function renderMarkdown(content: string): string {
  return sanitizeChatContent(content);
}
