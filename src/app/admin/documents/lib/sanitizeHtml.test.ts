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
  it('unwraps disallowed tags but keeps their text', () => {
    expect(sanitizeRichHtml('<div><a href="x">link</a> text</div>')).toBe(
      'link text',
    );
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
