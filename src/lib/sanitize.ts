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

export function sanitizeChatContent(content: string): string {
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return stripControlCharacters(cleaned).trim();
}