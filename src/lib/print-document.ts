/**
 * Print one element as its own document.
 *
 * Printing the live page went wrong in two ways: the bill sits in a fixed,
 * scrolling dialog, so only a clipped slice reached the paper, and the invoice
 * was hidden by the page-wide print rule. Copying the element into a blank
 * same-origin frame with the site's stylesheets prints exactly that element,
 * on A4, at its real size. The frame's title becomes the default PDF file name.
 */
export function printElement(element: HTMLElement | null, title: string) {
  if (!element || typeof document === "undefined") return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (!doc || !view) {
    frame.remove();
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");
  const safeTitle = title.replace(/[<>&"]/g, "");

  doc.open();
  doc.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${safeTitle}</title>${styles}
<style>
  @page { size: A4; margin: 10mm; }
  html, body { background: #fff !important; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-doc-root { width: 190mm; margin: 0 auto; }
  .print-doc-root .print-area { position: static !important; }
  .print-doc-root [data-print-hide] { display: none !important; }
</style></head>
<body><div class="print-doc-root">${element.outerHTML}</div></body></html>`);
  doc.close();

  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  view.addEventListener("afterprint", cleanup, { once: true });

  // Wait for the copied stylesheets and the brand fonts before printing.
  const ready = async () => {
    const sheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    await Promise.all(
      sheets.map(
        (link) =>
          new Promise<void>((resolve) => {
            if (link.sheet) return resolve();
            link.addEventListener("load", () => resolve(), { once: true });
            link.addEventListener("error", () => resolve(), { once: true });
            window.setTimeout(resolve, 3000);
          }),
      ),
    );
    try {
      await Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 2500))]);
    } catch {
      // Fonts API missing: print with fallbacks.
    }
    view.focus();
    view.print();
    // Browsers without afterprint in frames still get cleaned up.
    window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };
  void ready();
}
