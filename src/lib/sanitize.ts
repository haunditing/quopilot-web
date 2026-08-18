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

function markdownToHtml(content: string): string {
  let html = content;

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold (process before italic to avoid conflicts)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic (single asterisks, not preceded or followed by another asterisk on the same word)
  html = html.replace(/\*(?!\*)(.+?)(?!\*)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2'>$1</a>");

  // Inline code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Line breaks -> br
  html = html.replace(/\n/g, "<br>");

  return html;
}

export function sanitizeChatContent(content: string): string {
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "strong",
      "em",
      "a",
      "code",
      "br",
      "h1",
      "h2",
      "h3",
    ],
    ALLOWED_ATTR: [
      "href",
    ],
  });

  return stripControlCharacters(cleaned).trim();
}

export function renderMarkdown(content: string): string {
  const html = markdownToHtml(content);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "strong",
      "em",
      "a",
      "code",
      "br",
      "h1",
      "h2",
      "h3",
    ],
    ALLOWED_ATTR: ["href"],
  });
}