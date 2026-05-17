import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

/**
 * Capture a single `[data-slide-canvas]` element (rendered at its native pixel
 * dimensions, e.g. 1080x1080) and return a PNG data URL. The element is
 * cloned into an off-screen container with its CSS transform reset so we
 * always export at native size regardless of how the preview is scaled.
 */
async function capture(slide: HTMLElement): Promise<string> {
  const clone = slide.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.position = 'fixed';
  clone.style.top = '-100000px';
  clone.style.left = '-100000px';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);
  try {
    // Re-flow: ensure web fonts and any logo images inside the clone are
    // loaded before snapshot. document.fonts.ready handles fonts; images we
    // wait for explicitly.
    await document.fonts?.ready;
    const imgs = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalHeight > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // don't block on broken images
        });
      }),
    );
    return await toPng(clone, { cacheBust: true, pixelRatio: 1, skipFonts: false });
  } finally {
    document.body.removeChild(clone);
  }
}

function triggerDownload(blobOrDataUrl: Blob | string, filename: string) {
  const url = typeof blobOrDataUrl === 'string' ? blobOrDataUrl : URL.createObjectURL(blobOrDataUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof blobOrDataUrl !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export interface SlideExport {
  el: HTMLElement;
  index: number;
}

export async function downloadSlidePng(slide: SlideExport, baseName: string): Promise<void> {
  const dataUrl = await capture(slide.el);
  triggerDownload(dataUrl, `${baseName}-slide-${String(slide.index + 1).padStart(2, '0')}.png`);
}

export async function downloadAllSlidesAsZip(slides: SlideExport[], baseName: string): Promise<void> {
  if (slides.length === 0) return;
  if (slides.length === 1) return downloadSlidePng(slides[0]!, baseName);

  const zip = new JSZip();
  for (const s of slides) {
    const dataUrl = await capture(s.el);
    const blob = await dataUrlToBlob(dataUrl);
    zip.file(`slide-${String(s.index + 1).padStart(2, '0')}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${baseName}.zip`);
}

export async function downloadAllSlidesAsPdf(slides: SlideExport[], baseName: string): Promise<void> {
  if (slides.length === 0) return;

  // Capture first to determine native size.
  const first = await capture(slides[0]!.el);
  const firstImg = new Image();
  firstImg.src = first;
  await new Promise<void>((resolve) => {
    firstImg.onload = () => resolve();
    firstImg.onerror = () => resolve();
  });
  const w = firstImg.naturalWidth;
  const h = firstImg.naturalHeight;

  const pdf = new jsPDF({
    unit: 'px',
    format: [w, h],
    orientation: w >= h ? 'landscape' : 'portrait',
    hotfixes: ['px_scaling'],
  });

  pdf.addImage(first, 'PNG', 0, 0, w, h);
  for (let i = 1; i < slides.length; i++) {
    const dataUrl = await capture(slides[i]!.el);
    pdf.addPage([w, h], w >= h ? 'landscape' : 'portrait');
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
  }

  pdf.save(`${baseName}.pdf`);
}
