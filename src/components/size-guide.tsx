"use client";

import { Ruler } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A general Indian children's-wear chart. Brands cut slightly differently, so
 * it is presented as a guide and paired with advice for in-between sizes.
 */
const KIDS_SIZES: Array<{ size: string; age: string; height: string; chest: string }> = [
  { size: "0–3 M", age: "0–3 months", height: "50–60", chest: "40–43" },
  { size: "3–6 M", age: "3–6 months", height: "60–68", chest: "43–45" },
  { size: "6–12 M", age: "6–12 months", height: "68–76", chest: "45–48" },
  { size: "1–2 Y", age: "1–2 years", height: "76–90", chest: "48–52" },
  { size: "2–3 Y", age: "2–3 years", height: "90–98", chest: "52–54" },
  { size: "3–4 Y", age: "3–4 years", height: "98–104", chest: "54–56" },
  { size: "4–5 Y", age: "4–5 years", height: "104–110", chest: "56–58" },
  { size: "5–6 Y", age: "5–6 years", height: "110–116", chest: "58–61" },
  { size: "7–8 Y", age: "7–8 years", height: "122–128", chest: "63–66" },
  { size: "9–10 Y", age: "9–10 years", height: "134–140", chest: "69–72" },
  { size: "11–12 Y", age: "11–12 years", height: "146–152", chest: "75–79" },
  { size: "13–14 Y", age: "13–14 years", height: "158–164", chest: "82–86" },
];

export function SizeGuide({ whatsappLink }: { whatsappLink?: string | null }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Ruler className="h-3.5 w-3.5" /> Size guide
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Children&apos;s size guide</DialogTitle>
          <DialogDescription>
            Go by height before age — children of the same age vary a lot. Measurements are in
            centimetres.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Age</th>
                <th className="px-3 py-2 font-medium">Height</th>
                <th className="px-3 py-2 font-medium">Chest</th>
              </tr>
            </thead>
            <tbody>
              {KIDS_SIZES.map((row) => (
                <tr key={row.size} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.size}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.age}</td>
                  <td className="px-3 py-2">{row.height}</td>
                  <td className="px-3 py-2">{row.chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Between two sizes?</span> Choose the larger
            one — children grow into it, and a slightly loose fit is more comfortable.
          </li>
          <li>
            <span className="font-medium text-foreground">How to measure chest:</span> wrap a tape
            around the fullest part, under the arms, keeping it level and not tight.
          </li>
          <li>
            This is a general guide; individual brands may run a little smaller or larger. A wrong
            size can be exchanged within the return window.
          </li>
        </ul>

        {whatsappLink && (
          <a
            href={`${whatsappLink}?text=${encodeURIComponent("Hi, I need help choosing a size.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Still unsure? Ask us on WhatsApp
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
