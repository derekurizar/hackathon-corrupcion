import { jsPDF } from 'jspdf';

export type CapturedPage = {
  /** `data:image/png;base64,...` of one fully-settled chapter. */
  dataUrl: string;
  /** CSS px width of the captured chapter (the stage content width). */
  width: number;
  /** CSS px height of the captured chapter (full natural/scroll height). */
  height: number;
};

/**
 * One PDF page per chapter, each page sized to that chapter's exact rendered
 * px box (variable page heights — reads like scrolling the site, no scene is
 * split or cropped). The PNGs are captured at 2× pixelRatio, so placing them
 * into a page measured in CSS px keeps them crisp.
 *
 * Triggers a browser download of `Expediente-{caseKey}-{lang}.pdf`.
 */
export function buildPdf(
  pages: CapturedPage[],
  opts: { caseKey: string; lang: string },
): void {
  const [first] = pages;
  if (!first) throw new Error('buildPdf: no pages captured');

  const orient = (p: CapturedPage): 'l' | 'p' =>
    p.width > p.height ? 'l' : 'p';

  const doc = new jsPDF({
    unit: 'px',
    format: [first.width, first.height],
    orientation: orient(first),
    compress: true,
  });

  const place = (p: CapturedPage) => {
    // px unit + format already match the image box, so draw edge-to-edge.
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.addImage(p.dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST');
  };

  place(first);
  for (let i = 1; i < pages.length; i += 1) {
    const p = pages[i];
    if (!p) continue;
    doc.addPage([p.width, p.height], orient(p));
    place(p);
  }

  const safeKey = opts.caseKey.replace(/[^\w.-]+/g, '_');
  doc.save(`Expediente-${safeKey}-${opts.lang}.pdf`);
}
