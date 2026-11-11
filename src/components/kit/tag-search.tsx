"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Reference #4 — Tag search pills, re-skinned.
 * Dark blue-grey chrome → ivory chips with sage affordances.
 * Suggestions always come from our own vocabulary, never free text chaos.
 */
export function TagSearch({
  value,
  onChange,
  suggestions,
  label = "Selected Tags",
  placeholder = "Search tags…",
  max = 12,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  label?: string;
  placeholder?: string;
  max?: number;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return suggestions
      .filter((tag) => !value.includes(tag))
      .filter((tag) => (needle ? tag.toLowerCase().includes(needle) : true))
      .slice(0, 8);
  }, [query, suggestions, value]);

  function add(tag: string) {
    if (value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setQuery("");
  }

  function remove(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filtered.length) {
      event.preventDefault();
      add(filtered[0]);
    }
    if (event.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>

      <div
        className="relative rounded-lg border border-input bg-background p-2 transition-shadow focus-within:ring-2 focus-within:ring-sage/40"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-sage/15 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  remove(tag);
                }}
                aria-label={`Remove ${tag}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-sage/25 hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}

          <div className="flex min-w-[10rem] flex-1 items-center gap-1.5 px-1">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKeyDown}
              placeholder={value.length >= max ? `Up to ${max} tags` : placeholder}
              disabled={value.length >= max}
              className="h-7 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {open && filtered.length ? (
          <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {filtered.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(tag)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                >
                  {tag}
                  <Plus className="h-3.5 w-3.5 text-sage" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestions
            .filter((tag) => !value.includes(tag))
            .slice(0, 10)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => add(tag)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sage hover:text-foreground"
              >
                {tag}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
