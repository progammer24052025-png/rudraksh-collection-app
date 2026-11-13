"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SizeDepartment = "kids" | "men" | "women";

type Chart = {
  label: string;
  intro: string;
  columns: string[];
  rows: string[][];
  tips: Array<{ title: string; text: string }>;
};

/**
 * General Indian size charts. Brands cut slightly differently, so each is
 * presented as a guide and paired with advice for in-between sizes.
 */
const CHARTS: Record<SizeDepartment, Chart> = {
  kids: {
    label: "Kids",
    intro: "Go by height before age — children of the same age vary a lot. Measurements in centimetres.",
    columns: ["Size", "Age", "Height", "Chest"],
    rows: [
      ["0–3 M", "0–3 months", "50–60", "40–43"],
      ["3–6 M", "3–6 months", "60–68", "43–45"],
      ["6–12 M", "6–12 months", "68–76", "45–48"],
      ["1–2 Y", "1–2 years", "76–90", "48–52"],
      ["2–3 Y", "2–3 years", "90–98", "52–54"],
      ["3–4 Y", "3–4 years", "98–104", "54–56"],
      ["4–5 Y", "4–5 years", "104–110", "56–58"],
      ["5–6 Y", "5–6 years", "110–116", "58–61"],
      ["7–8 Y", "7–8 years", "122–128", "63–66"],
      ["9–10 Y", "9–10 years", "134–140", "69–72"],
      ["11–12 Y", "11–12 years", "146–152", "75–79"],
      ["13–14 Y", "13–14 years", "158–164", "82–86"],
    ],
    tips: [
      { title: "Between two sizes?", text: "Choose the larger one — children grow into it, and a slightly loose fit is more comfortable." },
      { title: "How to measure chest:", text: "wrap a tape around the fullest part, under the arms, keeping it level and not tight." },
    ],
  },
  men: {
    label: "Men",
    intro: "Shirts, T-shirts and kurtas. Measure over a thin shirt; measurements in inches.",
    columns: ["Size", "Chest", "Waist", "Shoulder"],
    rows: [
      ["S", "36–38", "30–32", "16.5–17"],
      ["M", "38–40", "32–34", "17–17.5"],
      ["L", "40–42", "34–36", "17.5–18"],
      ["XL", "42–44", "36–38", "18–18.5"],
      ["XXL", "44–46", "38–40", "18.5–19"],
      ["3XL", "46–48", "40–42", "19–19.5"],
    ],
    tips: [
      { title: "Between two sizes?", text: "Go by chest for shirts and kurtas; choose the larger size for a relaxed fit." },
      { title: "Trousers:", text: "waist size is printed in inches on the label (30, 32, 34…)." },
    ],
  },
  women: {
    label: "Women",
    intro: "Tops, kurtis and dresses. Measure over light clothing; measurements in inches.",
    columns: ["Size", "Bust", "Waist", "Hip"],
    rows: [
      ["XS", "32", "26", "35"],
      ["S", "34", "28", "37"],
      ["M", "36", "30", "39"],
      ["L", "38", "32", "41"],
      ["XL", "40", "34", "43"],
      ["XXL", "42", "36", "45"],
      ["3XL", "44", "38", "47"],
    ],
    tips: [
      { title: "Between two sizes?", text: "Go by your bust for tops and kurtis and by your hip for bottoms; choose the larger size if unsure." },
      { title: "How to measure bust:", text: "wrap the tape around the fullest part, keeping it level and snug but not tight." },
    ],
  },
};

const DEPARTMENTS: SizeDepartment[] = ["kids", "men", "women"];

/** Best guess at which chart a product needs, from its category and tags. */
export function sizeDepartmentFor(product: {
  category_slug?: string | null;
  category_name?: string | null;
  tags?: string[];
}): SizeDepartment {
  const text = [product.category_slug, product.category_name, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\bwomen|\bladies|\bkurti|\bsaree|\bsari\b/.test(text)) return "women";
  if (/\bmen\b|\bmens\b|\bmen's|\bgents/.test(text)) return "men";
  return "kids";
}

export function SizeGuide({
  whatsappLink,
  department = "kids",
}: {
  whatsappLink?: string | null;
  department?: SizeDepartment;
}) {
  const [active, setActive] = useState<SizeDepartment>(department);
  const chart = CHARTS[active];

  return (
    <Dialog onOpenChange={(open) => open && setActive(department)}>
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
          <DialogTitle className="font-serif">Size guide</DialogTitle>
          <DialogDescription>{chart.intro}</DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-fit rounded-lg border border-border p-1" role="tablist" aria-label="Size chart">
          {DEPARTMENTS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => setActive(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CHARTS[key].label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border border-border" role="tabpanel">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {chart.columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  {row.map((cell, index) => (
                    <td key={index} className={cn("px-3 py-2", index === 0 && "font-medium")}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {chart.tips.map((tip) => (
            <li key={tip.title}>
              <span className="font-medium text-foreground">{tip.title}</span> {tip.text}
            </li>
          ))}
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
