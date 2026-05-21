import { useEffect, useRef, useState } from 'react';
import { Bold, List, Eraser, Minus, Plus } from 'lucide-react';
import { sanitizeRichHtml } from './lib/sanitizeHtml';

const MIN_SIZE = 8;
const MAX_SIZE = 48;
const DEFAULT_SIZE = 14;

/** execCommand is deprecated but is still the simplest cross-browser inline editor. */

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);

  // Sync external value into the DOM, but NEVER while the user is typing —
  // rewriting innerHTML on each keystroke resets the caret to the start (e.g.
  // when the sanitizer trims a trailing space). Only sync when the editor is
  // blurred, i.e. the value changed from the outside (loading a preset, reset).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(sanitizeRichHtml(ref.current.innerHTML));
  };

  // Bold, list, clear-format: styleWithCSS=false emits tag-based markup (<b>, <ul><li>)
  // that the sanitizer keeps.
  const applyCmd = (cmd: string) => {
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd, false);
    emit();
  };

  // Font size: wrap the current selection in <span style="font-size:Npx"> via
  // execCommand('insertHTML') so the change lands on the browser's undo stack
  // (manual range surgery would not be undoable). We clone the selection's HTML
  // — not just its text — so bold/italic/lists inside it are preserved.
  const applySize = (px: number) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // nothing selected → no-op
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return; // selection outside this editor
    const tmp = document.createElement('div');
    tmp.appendChild(range.cloneContents());
    document.execCommand('insertHTML', false, `<span style="font-size:${px}px">${tmp.innerHTML}</span>`);
    emit();
  };

  const stepSize = (next: number) => {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(next)));
    setSize(clamped);
    applySize(clamped);
  };

  const btn = 'px-2 py-1 rounded text-white/80 hover:bg-white/10 text-sm';
  const sizeBtn = 'p-1 rounded text-white/80 hover:bg-white/10 disabled:opacity-30';

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f2618]">
      <div className="flex items-center gap-1 border-b border-white/10 px-1 py-1 no-print">
        <button type="button" className={btn} title="Gras" onClick={() => applyCmd('bold')}>
          <Bold className="w-4 h-4" />
        </button>

        {/* Font size for the selected text — type a px value or step it.
            Useful to shrink a long désignation so the PDF stays on one page. */}
        <div className="flex items-center gap-0.5 rounded border border-white/10 px-1" title="Taille du texte sélectionné (px)">
          <button type="button" className={sizeBtn} title="Réduire" disabled={size <= MIN_SIZE}
            onClick={() => stepSize(size - 1)}>
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number" min={MIN_SIZE} max={MAX_SIZE} value={size}
            onChange={(e) => setSize(Number(e.target.value) || DEFAULT_SIZE)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); stepSize(size); } }}
            title="Sélectionnez du texte, entrez une taille puis Entrée (ou utilisez − / +)"
            className="w-9 bg-transparent text-center text-sm text-white/90 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button type="button" className={sizeBtn} title="Agrandir" disabled={size >= MAX_SIZE}
            onClick={() => stepSize(size + 1)}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button type="button" className={btn} title="Liste" onClick={() => applyCmd('insertUnorderedList')}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" className={btn} title="Effacer le format" onClick={() => applyCmd('removeFormat')}>
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder ?? ''}
        className="min-h-[120px] px-3 py-2 text-sm text-white/90 outline-none [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-white/30"
      />
    </div>
  );
}
