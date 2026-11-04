import React, { useEffect } from 'react';
import { setDocumentTitle } from '../../services/documentTitle';
import {
  ADMIN_MANUAL_PAGES,
  ADMIN_MANUAL_PATH,
  GENERAL_MANUAL_PAGES,
  GENERAL_MANUAL_PATH,
  type ManualNavPage,
} from '../../services/manualPath';

export const PhoneChrome: React.FC<{ children: React.ReactNode; label: string }> = ({
  children,
  label,
}) => (
  <div className="relative mx-auto w-full max-w-[280px]">
    <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-teal-400/20 via-transparent to-sky-500/10 blur-xl" />
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-800/10 bg-slate-900 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between bg-indigo-600 px-4 pb-2 pt-3 text-white">
        <div className="flex min-w-0 items-center gap-1.5">
          <i className="fas fa-calendar-check text-xs opacity-90" />
          <span className="truncate text-[10px] font-bold">{label}</span>
        </div>
        <i className="fas fa-sign-out-alt text-[10px] opacity-70" />
      </div>
      <div className="min-h-[200px] bg-slate-50">{children}</div>
    </div>
    <p className="mt-2 text-center text-[11px] font-bold text-slate-400">※ 説明用の画面イメージです</p>
  </div>
);

export const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-teal-600 font-display text-sm font-extrabold text-white shadow-lg shadow-teal-600/25">
    {n}
  </span>
);

export const StepCard: React.FC<{ children: React.ReactNode; emphasize?: boolean }> = ({
  children,
  emphasize,
}) => (
  <section
    className={`relative overflow-hidden rounded-[1.75rem] p-5 sm:p-8 ${
      emphasize
        ? 'border border-teal-200/80 bg-white/95 shadow-[0_20px_50px_-28px_rgba(13,148,136,0.45)]'
        : 'border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]'
    }`}
  >
    {emphasize && (
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl" />
    )}
    {children}
  </section>
);

export const TipCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
    <h3 className="font-display text-sm font-extrabold text-slate-900">{title}</h3>
    <div className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{children}</div>
  </div>
);

export const WarnBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-relaxed text-amber-950">
    {children}
  </div>
);

/** 画面の外から指す吹き出し */
export const SideCallout: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`mb-2 lg:mb-0 lg:pointer-events-none lg:absolute lg:-left-3 lg:z-20 lg:w-[9.5rem] lg:-translate-x-full ${className}`}
  >
    <div className="rounded-2xl border border-teal-200 bg-teal-600 px-2.5 py-2 text-center text-[11px] font-bold leading-snug text-white shadow-lg shadow-teal-600/25 sm:text-xs lg:text-left">
      {children}
    </div>
    <div className="mx-auto hidden h-0 w-0 border-x-[7px] border-t-[10px] border-x-transparent border-t-teal-600 lg:mx-0 lg:ml-auto lg:mr-0 lg:block lg:border-x-0 lg:border-y-[7px] lg:border-l-[10px] lg:border-t-0 lg:border-y-transparent lg:border-l-teal-600" />
    <div className="mx-auto h-0 w-0 border-x-[7px] border-t-[10px] border-x-transparent border-t-teal-600 lg:hidden" />
  </div>
);

type ManualShellProps = {
  slug: string;
  pageTitle: string;
  eyebrow?: string;
  children: React.ReactNode;
  headerHref?: string;
  headerLabel?: string;
  homePath?: string;
  pages?: ManualNavPage[];
};

export const ManualShell: React.FC<ManualShellProps> = ({
  slug,
  pageTitle,
  eyebrow = '使い方ガイド（みなさん向け）',
  children,
  headerHref,
  headerLabel,
  homePath = GENERAL_MANUAL_PATH,
  pages = GENERAL_MANUAL_PAGES,
}) => {
  useEffect(() => {
    setDocumentTitle(pageTitle);
    window.scrollTo(0, 0);
  }, [pageTitle, slug]);

  const tocPages = pages.filter((p) => p.inToc);
  const idx = tocPages.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? tocPages[idx - 1] : null;
  const next = idx >= 0 && idx < tocPages.length - 1 ? tocPages[idx + 1] : null;
  const isIndex = slug === 'index';

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-slate-800 antialiased">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(14,165,233,0.12), transparent 50%), linear-gradient(180deg, #f8fafc 0%, #eef6f4 45%, #f1f5f9 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black, transparent 85%)',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="font-display text-[11px] font-bold tracking-wide text-teal-700">{eyebrow}</p>
            <p className="truncate text-sm font-bold text-slate-900">{pageTitle}</p>
          </div>
          <a
            href={headerHref || (isIndex ? '#toc' : homePath)}
            className="shrink-0 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            {headerLabel || (isIndex ? '目次へ' : '目次に戻る')}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">{children}</main>

      {!isIndex && (
        <nav className="border-t border-slate-200/80 bg-white/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <a
              href={homePath}
              className="text-sm font-bold text-slate-500 transition hover:text-slate-800"
            >
              ← 目次
            </a>
            <div className="flex flex-wrap gap-2">
              {prev && (
                <a
                  href={prev.path}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800"
                >
                  ← {prev.short}
                </a>
              )}
              {next && (
                <a
                  href={next.path}
                  className="rounded-full bg-teal-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
                >
                  次へ: {next.short} →
                </a>
              )}
            </div>
          </div>
        </nav>
      )}

      <div className="space-y-1 pb-8 text-center text-xs font-medium text-slate-400">
        <p>使い方ガイド · {pageTitle}</p>
        <p>&copy; AS2WORKS</p>
      </div>
    </div>
  );
};

export function AdminManualShell(
  props: Omit<ManualShellProps, 'eyebrow' | 'homePath' | 'pages'> & {
    eyebrow?: string;
  }
) {
  return (
    <ManualShell
      {...props}
      eyebrow={props.eyebrow || '使い方ガイド（管理者向け）'}
      homePath={ADMIN_MANUAL_PATH}
      pages={ADMIN_MANUAL_PAGES}
    />
  );
}

export function PageHero(props: {
  badge?: string;
  title: React.ReactNode;
  lead: React.ReactNode;
}) {
  return (
    <section className="mb-8 sm:mb-10">
      {props.badge && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          {props.badge}
        </p>
      )}
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.25]">
        {props.title}
      </h1>
      <div className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
        {props.lead}
      </div>
    </section>
  );
}

export function SummaryList(props: {
  label?: string;
  items: Array<{ n: number; title: string; desc: string }>;
}) {
  return (
    <section className="mb-10 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:mb-14 sm:p-6">
      <p className="mb-3 text-xs font-bold text-slate-500">{props.label || 'このページのまとめ'}</p>
      <ol className="space-y-3">
        {props.items.map((item) => (
          <li
            key={item.n}
            className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-extrabold text-white">
              {item.n}
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold text-slate-900 sm:text-base">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-600">{item.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DarkRecap(props: { label?: string; children: React.ReactNode }) {
  return (
    <aside className="mt-12 rounded-2xl bg-slate-900 px-5 py-6 text-slate-100 sm:px-8">
      <p className="text-xs font-bold tracking-wide text-teal-300">
        {props.label || 'もう一度だけ確認'}
      </p>
      <div className="mt-3 space-y-2 text-base font-bold">{props.children}</div>
    </aside>
  );
}
