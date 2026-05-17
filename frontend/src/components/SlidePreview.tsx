import type { BrandKit } from '../lib/setup';
import type { DraftSlide } from '../lib/drafts';

interface Props {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  format: 'carousel' | 'single_image';
  projectName: string;
  publicUrl: string | null;
}

/**
 * Slide preview rendered at its TRUE pixel dimensions (1080×1080 for single,
 * 1080×1350 for carousel) and visually scaled to fit. Operator sees exactly
 * what the post will look like.
 *
 * Brand kit injects via CSS custom properties. The same templates will become
 * the server-side Designer output when Playwright lands (Phase 5).
 *
 * Layout strategy: single_image (always) and cta-kind in carousels render as
 * a centred "hero card" — logo lockup top, oversized headline, accent divider,
 * concise body, optional CTA + URL at the bottom. Other carousel kinds keep
 * their information-dense left-aligned layouts.
 */
export function SlidePreview({ slide, totalSlides, kit, format, projectName, publicUrl }: Props) {
  const palette = kit?.palette ?? defaultPalette;
  const fonts = kit?.fonts ?? { heading: 'Inter', body: 'Inter' };

  const W = 1080;
  const H = format === 'carousel' ? 1350 : 1080;

  const styleVars: React.CSSProperties = {
    ['--brand-primary' as never]: palette.primary,
    ['--brand-secondary' as never]: palette.secondary,
    ['--brand-accent' as never]: palette.accent,
    ['--brand-background' as never]: palette.background,
    ['--brand-text' as never]: palette.text,
    ['--brand-font-heading' as never]: `'${fonts.heading}', serif`,
    ['--brand-font-body' as never]: `'${fonts.body}', sans-serif`,
  };

  // Hero layout for single_image (every slide) and for cta-kind in carousels.
  const isHero = format === 'single_image' || slide.kind === 'cta' || slide.kind === 'cover';

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm bg-neutral-100"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        data-slide-canvas={slide.id}
        data-slide-index={slide.slideIndex}
        style={{ width: W, height: H, transform: 'scale(var(--scale))' }}
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
        <div
          className="w-full h-full relative"
          style={{
            ...styleVars,
            backgroundColor: 'var(--brand-background)',
            color: 'var(--brand-text)',
            fontFamily: 'var(--brand-font-body)',
          }}
        >
          {isHero ? (
            <HeroLayout
              slide={slide}
              totalSlides={totalSlides}
              kit={kit}
              projectName={projectName}
              publicUrl={publicUrl}
            />
          ) : (
            <ContentLayout
              slide={slide}
              totalSlides={totalSlides}
              kit={kit}
              projectName={projectName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── Hero layout (single image, covers, CTAs) ─────────

function HeroLayout({
  slide,
  totalSlides,
  kit,
  projectName,
  publicUrl,
}: {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  projectName: string;
  publicUrl: string | null;
}) {
  const isCta = slide.kind === 'cta';
  const isCover = slide.kind === 'cover';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-[120px] py-[100px]">
      <BrandLockup logoUrl={kit?.logoUrl ?? null} projectName={projectName} />

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[840px] mx-auto">
        {isCover && (
          <p
            className="text-[26px] uppercase tracking-[0.3em] mb-[36px] font-medium"
            style={{ color: 'var(--brand-accent)' }}
          >
            Carousel
          </p>
        )}

        {slide.title && (
          <HeadlineWithAccent
            text={slide.title}
            className="font-bold leading-[1.05]"
            style={{
              fontFamily: 'var(--brand-font-heading)',
              color: 'var(--brand-primary)',
              fontSize: isCover ? 92 : 110,
            }}
          />
        )}

        <Divider />

        {slide.body && (
          <p
            className="text-[36px] leading-[1.35] max-w-[760px]"
            style={{ fontFamily: 'var(--brand-font-body)', color: 'var(--brand-text)' }}
          >
            {slide.body}
          </p>
        )}

        {isCta && publicUrl && (
          <>
            <Divider />
            <p
              className="text-[28px]"
              style={{ color: 'var(--brand-secondary)', fontFamily: 'var(--brand-font-body)' }}
            >
              Try it at
            </p>
            <p
              className="mt-[8px] text-[56px] font-bold"
              style={{
                color: 'var(--brand-accent)',
                fontFamily: 'var(--brand-font-heading)',
              }}
            >
              {stripScheme(publicUrl)}
            </p>
          </>
        )}
      </div>

      <PageIndicator slideIndex={slide.slideIndex} totalSlides={totalSlides} />
    </div>
  );
}

// ───────── Content layout (carousel middle slides) ─────────

function ContentLayout({
  slide,
  totalSlides,
  kit,
  projectName,
}: {
  slide: DraftSlide;
  totalSlides: number;
  kit: BrandKit | null;
  projectName: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col p-[88px]">
      {/* Top bar: logo + brand name on the left, accent stripe spacer on the right */}
      <div className="flex items-center justify-between mb-[40px]">
        <div className="flex items-center gap-[24px]">
          {kit?.logoUrl && (
            <img
              src={kit.logoUrl}
              alt=""
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="h-[120px] max-w-[280px] object-contain"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
          )}
          <p
            className="text-[28px] uppercase tracking-[0.2em] font-semibold"
            style={{
              color: 'var(--brand-primary)',
              fontFamily: 'var(--brand-font-heading)',
            }}
          >
            {projectName}
          </p>
        </div>
        <div
          className="h-[8px] w-[120px] rounded-full"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        />
      </div>

      <ContentBody slide={slide} />
      <Footer projectName={projectName} slideIndex={slide.slideIndex} totalSlides={totalSlides} />
    </div>
  );
}

function ContentBody({ slide }: { slide: DraftSlide }) {
  switch (slide.kind) {
    case 'quote':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[900px]">
          <span
            className="text-[240px] leading-none mb-[-60px]"
            style={{ color: 'var(--brand-accent)', fontFamily: 'var(--brand-font-heading)' }}
          >
            “
          </span>
          <p
            className="text-[60px] font-semibold leading-[1.18]"
            style={{ fontFamily: 'var(--brand-font-heading)' }}
          >
            {slide.body}
          </p>
          {slide.title && (
            <p
              className="mt-[44px] text-[28px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--brand-secondary)' }}
            >
              — {slide.title}
            </p>
          )}
        </div>
      );

    case 'stat':
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[900px]">
          <p
            className="text-[280px] font-extrabold leading-none"
            style={{
              fontFamily: 'var(--brand-font-heading)',
              color: 'var(--brand-primary)',
            }}
          >
            {extractStat(slide.body)}
          </p>
          {slide.title && (
            <p
              className="mt-[36px] text-[44px] font-semibold leading-[1.1]"
              style={{ fontFamily: 'var(--brand-font-heading)' }}
            >
              {slide.title}
            </p>
          )}
          <p className="mt-[20px] text-[34px] leading-[1.35]">{stripStat(slide.body)}</p>
        </div>
      );

    case 'bullet-list': {
      const items = slide.body
        .split(/\r?\n|·|•/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
      return (
        <div className="flex-1 flex flex-col max-w-[900px]">
          {slide.title && (
            <h3
              className="text-[68px] font-bold mb-[48px] leading-[1.05]"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: 'var(--brand-primary)',
              }}
            >
              {slide.title}
            </h3>
          )}
          <ul className="space-y-[28px] text-[38px] leading-[1.35]">
            {items.map((it, i) => (
              <li key={i} className="flex gap-[28px] items-baseline">
                <span
                  className="font-bold shrink-0 text-[44px]"
                  style={{
                    color: 'var(--brand-accent)',
                    fontFamily: 'var(--brand-font-heading)',
                  }}
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

    case 'body':
    default:
      return (
        <div className="flex-1 flex flex-col justify-center max-w-[900px]">
          {slide.title && (
            <h3
              className="text-[80px] font-bold leading-[1.05] mb-[44px]"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: 'var(--brand-primary)',
              }}
            >
              {slide.title}
            </h3>
          )}
          <p className="text-[40px] leading-[1.4]">{slide.body}</p>
        </div>
      );
  }
}

// ───────── Building blocks ─────────

function BrandLockup({ logoUrl, projectName }: { logoUrl: string | null; projectName: string }) {
  return (
    <div className="flex flex-col items-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={projectName}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="h-[120px] max-w-[280px] object-contain"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      ) : null}
      <p
        className="mt-[16px] text-[24px] tracking-[0.2em] uppercase font-semibold"
        style={{
          color: 'var(--brand-primary)',
          fontFamily: 'var(--brand-font-heading)',
        }}
      >
        {projectName}
      </p>
    </div>
  );
}

/**
 * Renders a title, putting any text wrapped in `**asterisks**` (markdown-bold
 * style) in the accent colour. The Writer can produce these tokens; if it
 * doesn't, the whole title renders in primary. Gives us the "split colour"
 * headline effect ("What's your **ATS score?**") without a schema change.
 */
function HeadlineWithAccent({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <h2 className={className} style={style}>
      {parts.map((part, i) => {
        const isAccent = part.startsWith('**') && part.endsWith('**');
        if (isAccent) {
          return (
            <span key={i} style={{ color: 'var(--brand-accent)' }}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </h2>
  );
}

function Divider() {
  return (
    <div
      className="my-[40px] mx-auto"
      style={{
        width: 96,
        height: 3,
        backgroundColor: 'var(--brand-accent)',
      }}
    />
  );
}

function PageIndicator({ slideIndex, totalSlides }: { slideIndex: number; totalSlides: number }) {
  if (totalSlides <= 1) return null;
  return (
    <p
      className="text-[22px] tracking-[0.2em] self-end"
      style={{ color: 'var(--brand-secondary)', fontFamily: 'var(--brand-font-body)' }}
    >
      {slideIndex + 1} / {totalSlides}
    </p>
  );
}

function Footer({
  projectName,
  slideIndex,
  totalSlides,
}: {
  projectName: string;
  slideIndex: number;
  totalSlides: number;
}) {
  return (
    <div
      className="flex items-center justify-between text-[22px] uppercase tracking-[0.2em] opacity-70"
      style={{ color: 'var(--brand-secondary)' }}
    >
      <span>{projectName}</span>
      {totalSlides > 1 && (
        <span>
          {slideIndex + 1} / {totalSlides}
        </span>
      )}
    </div>
  );
}

// ───────── Helpers ─────────

function extractStat(body: string): string {
  const m = body.match(/\d[\d.,]*\s*(?:%|x|k|m|million|billion)?/i);
  return m ? m[0] : body.split(/\s+/)[0] ?? '';
}

function stripStat(body: string): string {
  return body.replace(/^[\d.,%xkm\s]+/i, '').trim();
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const defaultPalette = {
  primary: '#111827',
  secondary: '#6b7280',
  accent: '#2563eb',
  background: '#ffffff',
  text: '#111827',
};
