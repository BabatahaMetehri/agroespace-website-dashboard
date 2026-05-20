import { useEffect, useRef } from 'react';
import { Bold, List, Eraser } from 'lucide-react';
import { sanitizeRichHtml } from './lib/sanitizeHtml';

/** execCommand is deprecated but is still the simplest cross-browser inline editor. */
function exec(cmd: string, value?: string) {
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand(cmd, false, value);
}

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

  // Sync external value into the DOM only when it differs (avoids caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(sanitizeRichHtml(ref.current.innerHTML));
  };

  const btn = 'px-2 py-1 rounded text-white/80 hover:bg-white/10 text-sm';

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f2618]">
      <div className="flex items-center gap-1 border-b border-white/10 px-1 py-1 no-print">
        <button type="button" className={btn} title="Gras" onClick={() => { exec('bold'); emit(); }}>
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className={btn} title="Petit" onClick={() => { exec('fontSize', '2'); emit(); }}>A−</button>
        <button type="button" className={btn} title="Normal" onClick={() => { exec('fontSize', '4'); emit(); }}>A</button>
        <button type="button" className={btn} title="Grand" onClick={() => { exec('fontSize', '6'); emit(); }}>A+</button>
        <button type="button" className={btn} title="Liste" onClick={() => { exec('insertUnorderedList'); emit(); }}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" className={btn} title="Effacer le format" onClick={() => { exec('removeFormat'); emit(); }}>
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
