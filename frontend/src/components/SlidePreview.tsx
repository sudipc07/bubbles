import type { BrandKit } from '../lib/setup';
import type { DraftSlide } from '../lib/drafts';

interface Props {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  format: 'carousel' | 'single_image';
}

/**
 * Slide preview rendered at its TRUE pixel dimensions (1080×1080 for single,
 * 1080×1350 for carousel), then visually shrunk via CSS transform so the
 * operator sees exactly what the post will look like — without the false
 * wrapping the old relative-size layout introduced.
 *
 * Brand kit values inject as CSS custom properties; templates use only
 * those (plus a logo if logoUrl is set). This is the same shape the
 * server-side Designer (Phase 5) will render — when Playwright lands, this
 * component IS the source of truth.
 */
export function SlidePreview({ slide, totalSlides, kit, format }: Props) {
  const palette = kit?.palette ?? defaultPalette;
  const fonts = kit?.fonts ?? { heading: 'Inter', body: 'Inter' };

  // Native pixel dimensions of the produced asset
  const W = 1080;
  const H = format === 'carousel' ? 1350 : 1080;

  const styleVars: React.CSSProperties = {
    // Brand kit injection
    ['--brand-primary' as never]: palette.primary,
    ['--brand-secondary' as never]: palette.secondary,
    ['--brand-accent' as never]: palette.accent,
    ['--brand-background' as never]: palette.background,
    ['--brand-text' as never]: palette.text,
    ['--brand-font-heading' as never]: `'${fonts.heading}', sans-serif`,
    ['--brand-font-body' as never]: `'${fonts.body}', sans-serif`,
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm bg-neutral-100"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: W,
          height: H,
          transform: 'scale(var(--scale))',
          // CSS-level scale: container queries would be cleaner but this works
          // everywhere. The container's width controls render size; we compute
          // scale from clientWidth / W using a CSS variable.
          // Trick: scale is set via inline style on the inner content using
          // 100cqw / 1080 via container query if available; fall back to JS.
        }}
        ref={(el) => {
          if (!el) return;
          const ro = new ResizeObserver(() => {
            const parent = el.parentElement;
            if (!parent) return;
            const scale = parent.clientWidth / W;
            el.style.setProperty('--scale', String(scale));
          });
          const parent = el.parentElement;
          if (parent) ro.observe(parent);
        }}
      >
        <SlideCanvas slide={slide} totalSlides={totalSlides} kit={kit} styleVars={styleVars} />
      </div>
    </div>
  );
}

function SlideCanvas({
  slide,
  totalSlides,
  kit,
  styleVars,
}: {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  styleVars: React.CSSProperties;
}) {
  return (
    <div
      className="w-full h-full relative"
      style={{
        ...styleVars,
        backgroundColor: 'var(--brand-background)',
        color: 'var(--brand-text)',
        fontFamily: 'var(--brand-font-body)',
      }}
    >
      {/* Decorative accent bar on the left */}
      <div
        className="absolute left-0 top-[8%] bottom-[8%] w-[18px]"
        style={{ backgroundColor: 'var(--brand-accent)' }}
      />

      {/* Logo top-right if available */}
      {kit?.logoUrl && (
        <img
          src={kit.logoUrl}
          alt=""
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="absolute top-[64px] right-[64px] h-[120px] object-contain"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      )}

      <div className="absolute inset-0 flex flex-col p-[88px] pl-[120px]">
        <SlideBody slide={slide} />
        <Footer slideIndex={slide.slideIndex} totalSlides={totalSlides} />
      </div>
    </div>
  );
}

function SlideBody({ slide }: { slide: DraftSlide }) {
  switch (slide.kind) {
    case 'cover':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[820px]">
          <p
            className="text-[24px] uppercase tracking-[0.3em] mb-[24px] font-medium"
            style={{ color: 'var(--brand-accent)' }}
          >
            Carousel
          </p>
          <h2
            className="text-[88px] font-bold leading-[1.05]"
            style={{
              fontFamily: 'var(--brand-font-heading)',
              color: 'var(--brand-primary)',
            }}
          >
            {slide.title ?? slide.body.split('\n')[0]}
          </h2>
          {slide.title && slide.body && (
            <p className="mt-[40px] text-[28px] leading-[1.4] max-w-[760px]">{slide.body}</p>
          )}
        </div>
      );

    case 'quote':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[800px]">
          <span
            className="text-[180px] leading-none mb-[-40px]"
            style={{ color: 'var(--brand-accent)', fontFamily: 'var(--brand-font-heading)' }}
          >
            “
          </span>
          <p
            className="text-[44px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--brand-font-heading)' }}
          >
            {slide.body}
          </p>
          {slide.title && (
            <p
              className="mt-[36px] text-[22px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--brand-secondary)' }}
            >
              — {slide.title}
            </p>
          )}
        </div>
      );

    case 'stat':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[820px]">
          <p
            className="text-[220px] font-extrabold leading-none"
            style={{
              fontFamily: 'var(--brand-font-heading)',
              color: 'var(--brand-primary)',
            }}
          >
            {extractStat(slide.body)}
          </p>
          {slide.title && (
            <p
              className="mt-[28px] text-[32px] font-semibold"
              style={{ fontFamily: 'var(--brand-font-heading)' }}
            >
              {slide.title}
            </p>
          )}
          <p className="mt-[16px] text-[24px] leading-[1.4]">{stripStat(slide.body)}</p>
        </div>
      );

    case 'bullet-list': {
      const items = slide.body
        .split(/\r?\n|·|•/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
      return (
        <div className="flex-1 flex flex-col max-w-[860px]">
          {slide.title && (
            <h3
              className="text-[52px] font-bold mb-[40px] leading-[1.1]"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: 'var(--brand-primary)',
              }}
            >
              {slide.title}
            </h3>
          )}
          <ul className="space-y-[20px] text-[28px] leading-[1.35]">
            {items.map((it, i) => (
              <li key={i} className="flex gap-[20px]">
                <span
                  className="font-bold shrink-0"
                  style={{ color: 'var(--brand-accent)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case 'cta':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[820px]">
          {slide.title && (
            <h3
              className="text-[72px] font-bold leading-[1.05] mb-[32px]"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: 'var(--brand-primary)',
              }}
            >
              {slide.title}
            </h3>
          )}
          <p className="text-[32px] leading-[1.4]">{slide.body}</p>
        </div>
      );

    case 'body':
    default:
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[840px]">
          {slide.title && (
            <h3
              className="text-[64px] font-bold leading-[1.05] mb-[36px]"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: 'var(--brand-primary)',
              }}
            >
              {slide.title}
            </h3>
          )}
          <p className="text-[32px] leading-[1.4]">{slide.body}</p>
        </div>
      );
  }
}

function Footer({ slideIndex, totalSlides }: { slideIndex: number; totalSlides: number }) {
  return (
    <div
      className="flex items-center justify-between text-[20px] uppercase tracking-[0.2em] opacity-60"
      style={{ color: 'var(--brand-secondary)' }}
    >
      <span>Bubbles</span>
      {totalSlides > 1 && (
        <span>
          {slideIndex + 1} / {totalSlides}
        </span>
      )}
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
