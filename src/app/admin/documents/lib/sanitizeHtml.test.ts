import { describe, it, expect } from 'vitest';
import { sanitizeRichHtml } from './sanitizeHtml';

describe('sanitizeRichHtml', () => {
  it('keeps whitelisted formatting tags', () => {
    const html = '<b>Bold</b> <strong>strong</strong><br><ul><li>a</li></ul>';
    expect(sanitizeRichHtml(html)).toBe(
      '<b>Bold</b> <strong>strong</strong><br><ul><li>a</li></ul>',
    );
  });
  it('keeps font-size style on span but strips other styles', () => {
    const html = '<span style="font-size: 18px; color: red;">big</span>';
    expect(sanitizeRichHtml(html)).toBe('<span style="font-size:18px">big</span>');
  });
  it('removes script tags and event handlers', () => {
    const html = '<b onclick="alert(1)">x</b><script>alert(2)</script>';
    expect(sanitizeRichHtml(html)).toBe('<b>x</b>');
  });
  it('unwraps a standalone disallowed wrapper but keeps its text', () => {
    expect(sanitizeRichHtml('<div><a href="x">link</a> text</div>')).toBe(
      'link text',
    );
  });

  it('converts contentEditable line <div>s into <br> breaks', () => {
    // Chrome/Edge wrap each new line in a <div>; previously these were inlined
    // and the text smooshed together on save.
    expect(sanitizeRichHtml('a<div>b</div><div>c</div>')).toBe('a<br>b<br>c');
    expect(sanitizeRichHtml('<div>a</div><div>b</div>')).toBe('a<br>b');
  });

  it('treats <p> paragraphs as line breaks too', () => {
    expect(sanitizeRichHtml('<p>one</p><p>two</p>')).toBe('one<br>two');
  });

  it('keeps a single break between lines (blank line collapses, idempotent)', () => {
    expect(sanitizeRichHtml('a<div><br></div><div>b</div>')).toBe('a<br>b');
    // Re-sanitizing the result must not pile up extra breaks.
    expect(sanitizeRichHtml('a<br>b<br>c')).toBe('a<br>b<br>c');
  });
  it('returns empty string for empty/nullish input', () => {
    expect(sanitizeRichHtml('')).toBe('');
    expect(sanitizeRichHtml(null as unknown as string)).toBe('');
  });
  it('emits font-size when value matches allowlist pattern', () => {
    expect(sanitizeRichHtml('<span style="font-size:18px">big</span>')).toBe(
      '<span style="font-size:18px">big</span>',
    );
  });
  it('strips font-size when value contains expression (invalid pattern)', () => {
    expect(
      sanitizeRichHtml('<span style="font-size:expression(alert(1))">x</span>'),
    ).toBe('<span>x</span>');
  });
  it('drops meta tag entirely but keeps surrounding text', () => {
    expect(
      sanitizeRichHtml('<meta http-equiv="refresh" content="0">text'),
    ).toBe('text');
  });
});
