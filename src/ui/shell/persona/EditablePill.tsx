import { useEffect, useRef, useState } from 'react';

type EditablePillProps = {
  text: string;
  display: 'div' | 'span';
  baseClassName: string;
  editingClassName: string;
  inputClassName: string;
  textareaClassName?: string;
  textClassName?: string;
  removeButtonClassName: string;
  removeLabel: string;
  leadingDotClassName?: string;
  multiline?: boolean;
  selectOnFocus?: boolean;
  onEdit: (value: string) => void;
  onRemove: () => void;
  editRequest?: object;
};

export function EditablePill({
  text,
  display,
  baseClassName,
  editingClassName,
  inputClassName,
  textareaClassName,
  textClassName,
  removeButtonClassName,
  removeLabel,
  leadingDotClassName,
  multiline = false,
  selectOnFocus = true,
  onEdit,
  onRemove,
  editRequest
}: EditablePillProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const Tag = display;

  useEffect(() => {
    if (editRequest) setEditing(true);
  }, [editRequest]);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => {
    if (!editing) return;

    if (multiline && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      if (selectOnFocus) {
        textarea.select();
      }
      return;
    }

    if (inputRef.current) {
      inputRef.current.focus();
      if (selectOnFocus) {
        inputRef.current.select();
      }
    }
  }, [editing, multiline, selectOnFocus]);

  useEffect(() => {
    if (!editing || !multiline || !textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft, editing, multiline]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== text) {
      onEdit(trimmed);
    } else {
      setDraft(text);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Tag className={`${baseClassName} ${editingClassName}`}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            className={textareaClassName ?? inputClassName}
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                commit();
              }
              if (event.key === 'Escape') {
                setDraft(text);
                setEditing(false);
              }
            }}
          />
        ) : (
          <input
            ref={inputRef}
            className={inputClassName}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setDraft(text);
                setEditing(false);
              }
            }}
          />
        )}
      </Tag>
    );
  }

  return (
    <Tag className={baseClassName} onClick={() => setEditing(true)}>
      {leadingDotClassName ? <span className={leadingDotClassName} /> : null}
      <span className={textClassName}>{text}</span>
      <button
        type="button"
        className={removeButtonClassName}
        aria-label={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </Tag>
  );
}
