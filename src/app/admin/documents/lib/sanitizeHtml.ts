const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'UL', 'OL', 'LI', 'SPAN',
]);

// Block tags that contentEditable inserts when the user presses Enter. We don't
// keep them as-is — each becomes a <br> line break so multi-line text survives
// sanitizing. (Keeping them inline like other disallowed tags used to smoosh
// every line together on save.) The conversion is idempotent: once a <div> is
// turned into <br>-separated text, re-sanitizing leaves it unchanged.
const BLOCK_TAGS = new Set(['DIV', 'P']);

const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE']);

/** Serialize a node's allowed children to a sanitized HTML string. */
function serializeChildren(node: Node): string {
  let out = '';
  let emitted = false; // whether any content/line has been written yet
  node.childNodes.forEach((child) => {
    if (child.nodeType === 1 && BLOCK_TAGS.has((child as Element).tagName.toUpperCase())) {
      const inner = serializeChildren(child);
      // Separate this line from the previous one, unless we're at the start or
      // the previous output already ended with a break.
      if (emitted && !out.endsWith('<br>')) out += '<br>';
      // A blank line (<div><br></div>) is fully represented by the break above.
      if (!/^(?:<br>)*$/.test(inner)) out += inner;
      emitted = true;
      return;
    }
    const s = serializeNode(child);
    out += s;
    if (s !== '') emitted = true;
  });
  return out;
}

function serializeNode(node: Node): string {
  // Text node: escape the five XML-significant characters.
  if (node.nodeType === 3) {
    return (node.textContent ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  if (node.nodeType !== 1) return '';

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROP_TAGS.has(tag)) return ''; // drop element AND its contents (XSS)
  if (!ALLOWED_TAGS.has(tag)) {
    // Disallowed element: drop the tag, keep sanitized children.
    return serializeChildren(el);
  }

  const lower = tag.toLowerCase();
  if (lower === 'br') return '<br>';

  // Only SPAN keeps a single allowed style: font-size.
  let attrs = '';
  if (lower === 'span') {
    const raw = (el as HTMLElement).style?.fontSize?.replace(/\s+/g, '') ?? '';
    if (/^[\d.]+(px|em|rem|%|pt)$/.test(raw)) attrs = ` style="font-size:${raw}"`;
  }
  return `<${lower}${attrs}>${serializeChildren(el)}</${lower}>`;
}

/** Whitelist-sanitize rich text HTML (bold/italic/underline/lists/span font-size). */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return serializeChildren(doc.body).trim();
}
