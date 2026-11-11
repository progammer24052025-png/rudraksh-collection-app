"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, ImagePlus, Link2, Loader2, Star, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function slugifyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function compressToWebp(file: File, maxEdge = 1400, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/webp", quality),
  );
  if (!blob) throw new Error("Could not compress this image");
  return blob;
}

type Prepared = { path: string; objectUrl: string; fileName: string };

/**
 * Reference #3 — Image dropzone, re-skinned.
 *
 * The deployment serves static files read-only, so a dropped image is
 * compressed, named by our convention and handed back as a download that
 * belongs in `public/<folder>/`. The product stores the public path and links
 * up as soon as the file is committed and deployed.
 */
export function ImageDropzone({
  value,
  onChange,
  folder,
  name,
  max = 6,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Path inside /public, e.g. "resources/products/macho/boys-shirts". */
  folder: string;
  /** Base file name, usually the product or user name. */
  name: string;
  max?: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [prepared, setPrepared] = useState<Prepared[]>([]);

  const preparedByPath = useMemo(() => {
    const map = new Map<string, Prepared>();
    for (const item of prepared) map.set(item.path, item);
    return map;
  }, [prepared]);

  const base = slugifyName(name) || "image";
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (!list.length) return;
      setError(null);
      setBusy(true);
      try {
        const additions: Prepared[] = [];
        const start = value.length;
        for (const [index, file] of list.entries()) {
          if (start + index >= max) {
            setError(`You can keep up to ${max} images.`);
            break;
          }
          const blob = await compressToWebp(file);
          const fileName = `${base}${start + index > 0 ? `-${start + index + 1}` : ""}.webp`;
          const path = `/${cleanFolder}/${fileName}`;
          additions.push({ path, fileName, objectUrl: URL.createObjectURL(blob) });
        }
        if (additions.length) {
          setPrepared((current) => [...current, ...additions]);
          onChange([...value, ...additions.map((item) => item.path)]);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not read that image");
      } finally {
        setBusy(false);
      }
    },
    [base, cleanFolder, max, onChange, value],
  );

  function addUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (value.length >= max) {
      setError(`You can keep up to ${max} images.`);
      return;
    }
    setError(null);
    onChange([...value, trimmed]);
    setUrlDraft("");
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors",
          dragging ? "border-sage bg-sage/10" : "border-border bg-cream/60 hover:border-sage/60",
        )}
      >
        {busy ? (
          <Loader2 className="h-7 w-7 animate-spin text-sage-ink" aria-hidden />
        ) : (
          <UploadCloud className="h-7 w-7 text-sage-ink" aria-hidden />
        )}
        <p className="text-sm font-medium text-foreground">
          {busy ? "Preparing image…" : "Drop images here"}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Compressed to WebP and named <span className="font-mono text-[11px]">{base}.webp</span> for{" "}
          <span className="font-mono text-[11px]">/public/{cleanFolder}/</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="mt-1 border-border bg-background"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addUrl();
              }
            }}
            placeholder="…or paste an image URL"
            className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="button" variant="outline" onClick={addUrl} className="border-border bg-background">
          Add
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {value.length ? (
        <ul className="flex flex-col gap-2">
          {value.map((src, index) => {
            const ready = preparedByPath.get(src);
            return (
              <li
                key={`${src}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ready?.objectUrl ?? src}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{src}</p>
                  <p className="text-xs text-foreground">
                    {index === 0 ? "Cover image" : `Image ${index + 1}`}
                    {ready ? " · needs committing to the repo" : ""}
                  </p>
                </div>
                {ready ? (
                  <a
                    href={ready.objectUrl}
                    download={ready.fileName}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sage-ink hover:bg-sage/10"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Save file
                  </a>
                ) : null}
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => move(index, 0)}
                    aria-label="Make cover image"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Move earlier"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move later"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label="Remove image"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No images yet.</p>
      )}
    </div>
  );
}
