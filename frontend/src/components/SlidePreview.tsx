import type { BrandKit } from '../lib/setup';
import type { DraftSlide } from '../lib/drafts';

interface Props {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  format: 'carousel' | 'single_image';
}

/**
 * In-browser slide preview. Brand kit values inject as CSS custom properties so
 * the same template adapts to any project's palette + fonts. This is the
 * pre-Designer-via-Playwright stand-in: gives the operator a visual sense of
 * the carousel without the server-side rendering pipeline.
 */
export function SlidePreview({ slide, totalSlides, kit, format }: Props) {
  const palette = kit?.palette ?? defaultPalette;
  const fonts = kit?.fonts ?? { heading: 'Inter', body: 'Inter' };

  const style = {
    '--brand-primary': palette.primary,
    '--brand-secondary': palette.secondary,
    '--brand-accent': palette.accent,
    '--brand-background': palette.background,
    '--brand-text': palette.text,
    '--brand-font-heading': `'${fonts.heading}', sans-serif`,
    '--brand-font-body': `'${fonts.body}', sans-serif`,
    aspectRatio: format === 'carousel' ? '4 / 5' : '1 / 1',
  } as React.CSSProperties;

  return (
    <div
      style={style}
      className="relative w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm"
    >
      <div
        className="absolute inset-0 flex flex-col justify-between p-6"
        style={{ backgroundColor: 'var(--brand-background)', color: 'var(--brand-text)' }}
      >
        <SlideBody slide={slide} totalSlides={totalSlides} />
        <Footer slideIndex={slide.slideIndex} totalSlides={totalSlides} />
      </div>
    </div>
  );
}

function SlideBody({ slide, totalSlides }: { slide: DraftSlide; totalSlides: number }) {
  switch (slide.kind) {
    case 'cover':
      return (
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-3"
            style={{ color: 'var(--brand-accent)' }}
          >
            {totalSlides} {totalSlides === 1 ? 'slide' : 'slides'}
          </p>
          <h2
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-primary)' }}
          >
            {slide.title ?? slide.body.split('\n')[0]}
          </h2>
          {slide.title && <p className="mt-4 text-sm" style={{ fontFamily: 'var(--brand-font-body)' }}>{slide.body}</p>}
        </div>
      );

    case 'quote':
      return (
        <div className="flex-1 flex flex-col justify-center text-center">
          <span style={{ color: 'var(--brand-accent)' }} className="text-5xl leading-none">"</span>
          <p
            className="mt-2 text-2xl font-semibold leading-snug"
            style={{ fontFamily: 'var(--brand-font-heading)' }}
          >
            {slide.body}
          </p>
          {slide.title && (
            <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: 'var(--brand-secondary)' }}>
              — {slide.title}
            </p>
          )}
        </div>
      );

    case 'stat':
      return (
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-6xl font-extrabold leading-none"
            style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-primary)' }}
          >
            {extractStat(slide.body)}
          </p>
          {slide.title && (
            <p className="mt-3 text-base font-medium" style={{ fontFamily: 'var(--brand-font-heading)' }}>
              {slide.title}
            </p>
          )}
          <p className="mt-2 text-sm" style={{ fontFamily: 'var(--brand-font-body)' }}>
            {stripStat(slide.body)}
          </p>
        </div>
      );

    case 'bullet-list': {
      const items = slide.body
        .split(/\r?\n|·|•/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
      return (
        <div className="flex-1 flex flex-col">
          {slide.title && (
            <h3
              className="text-lg font-semibold mb-3"
              style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-primary)' }}
            >
              {slide.title}
            </h3>
          )}
          <ul className="space-y-2 text-sm" style={{ fontFamily: 'var(--brand-font-body)' }}>
            {items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: 'var(--brand-accent)' }}>›</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case 'cta':
      return (
        <div className="flex-1 flex flex-col justify-center">
          {slide.title && (
            <h3
              className="text-2xl font-bold leading-tight mb-3"
              style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-primary)' }}
            >
              {slide.title}
            </h3>
          )}
          <p
            className="text-base leading-relaxed"
            style={{ fontFamily: 'var(--brand-font-body)' }}
          >
            {slide.body}
          </p>
        </div>
      );

    case 'body':
    default:
      return (
        <div className="flex-1 flex flex-col">
          {slide.title && (
            <h3
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-primary)' }}
            >
              {slide.title}
            </h3>
          )}
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: 'var(--brand-font-body)' }}
          >
            {slide.body}
          </p>
        </div>
      );
  }
}

function Footer({ slideIndex, totalSlides }: { slideIndex: number; totalSlides: number }) {
  return (
    <div className="flex items-center justify-between text-[10px] uppercase tracking-wide opacity-60">
      <span>Bubbles</span>
      <span>
        {slideIndex + 1} / {totalSlides}
      </span>
    </div>
  );
}

function extractStat(body: string): string {
  const m = body.match(/\d[\d.,]*\s*(?:%|x|k|m|million|billion)?/i);
  return m ? m[0] : body.split(/\s+/)[0] ?? '';
}

function stripStat(body: string): string {
  return body.replace(/^[\d.,%xkm\s]+/i, '').trim();
}

const defaultPalette = {
  primary: '#111827',
  secondary: '#6b7280',
  accent: '#2563eb',
  background: '#ffffff',
  text: '#111827',
};
