"use client";

import { useState } from "react";
import { Check, Download, Loader2, Scissors, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { slugifyName } from "@/components/kit/image-dropzone";
import { cutoutFor, type CutoutResult } from "@/lib/cutout";

const RAIL_BACKDROP = "linear-gradient(to bottom, #f7f4ed, #e9e4d6)";

/**
 * Turns the cover photo into the piece that hangs on the rail.
 *
 * The backdrop is separated in the browser — nothing is uploaded — and the
 * result is offered as a transparent WebP to sit beside the other static
 * product files, the same way the image dropzone works.
 */
export function RailCutoutField({
  images,
  folder,
  name,
  value,
  onChange,
}: {
  images: string[];
  /** Folder inside /public, e.g. "resources/products/rudraksh/boys-shirt". */
  folder: string;
  /** Base file name, usually the product slug. */
  name: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<CutoutResult | null>(null);
  const [savedMissing, setSavedMissing] = useState(false);

  const base = slugifyName(name) || "product";
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const target = `/${cleanFolder}/${base}-cutout.webp`;
  const source = images[0];

  async function makeCutout() {
    if (!source) {
      setError("Add a product photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await cutoutFor(source, { force: true });
      if (!result) {
        setError(
          "The backdrop could not be separated from this photo. Use a shot of the garment alone on a plain, light background.",
        );
        return;
      }
      // Preview only. The shop makes this same cut-out by itself, so nothing is saved unless
      // the owner commits a hand-tuned file and chooses to use it below.
      setMade(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Rail cut-out</Label>
      <p className="text-xs text-muted-foreground">
        The hanging rail shows the piece itself, not a framed photo. The shop cuts the first photo out
        automatically (trying the next photos if needed), so there is nothing to save. Preview it here; a
        plain, light background separates best.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={makeCutout}
          disabled={busy || !source}
          className="border-border bg-background"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Scissors className="h-4 w-4" aria-hidden />}
          {busy ? "Separating…" : "Preview the cut-out"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setMade(null);
              onChange("");
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {made ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span
            className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
            style={{ background: RAIL_BACKDROP }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={made.url} alt="" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs text-foreground">
              Backdrop removed. The shop makes this cut-out automatically; nothing needs saving.
            </p>
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">Use a hand-made file instead (advanced)</summary>
              <p className="mt-1">
                Save the file, commit it to <span className="font-mono">/public{target}</span>, deploy, then
                choose &ldquo;Use committed file&rdquo;.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <a
                  href={made.url}
                  download={`${base}-cutout.webp`}
                  className="inline-flex items-center gap-1 text-sage-ink hover:underline"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Save the file
                </a>
                <button
                  type="button"
                  className="text-sage-ink hover:underline"
                  onClick={() => {
                    setSavedMissing(false);
                    onChange(target);
                  }}
                >
                  Use committed file
                </button>
              </div>
            </details>
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span
            className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
            style={{ background: RAIL_BACKDROP }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-contain" onError={() => setSavedMissing(true)} />
          </span>
          <div className="min-w-0">
            {savedMissing ? (
              <p className="text-xs text-destructive">
                This file is missing from the site, so the shop is using the automatic cut-out. Choose
                Remove to clear it.
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-foreground">
                <Check className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
                The rail hangs this hand-made cut-out.
              </p>
            )}
            <p className="truncate font-mono text-[11px] text-muted-foreground">{value}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Automatic — the shop cuts the piece out of its photo. If no photo separates cleanly, the rail
          shows the photo hung from a hanger instead.
        </p>
      )}
    </div>
  );
}
