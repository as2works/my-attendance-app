import React from 'react';
import { GENERAL_MANUAL_PAGES } from '../../services/manualPath';
import { ManualShell, PageHero } from './generalShared';

const GeneralManualIndex: React.FC = () => {
  const pages = GENERAL_MANUAL_PAGES.filter((p) => p.inToc);

  return (
    <ManualShell slug="index" pageTitle="使い方ガイド" headerHref="#toc" headerLabel="目次へ">
      <PageHero
        badge="みなさん向け"
        title={
          <>
            出勤予定の
            <br />
            <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
              使い方ガイド
            </span>
          </>
        }
        lead={
          <>
            むずかしい言葉は使いません。
            <br />
            まずは「予定を入れる」から読んでください。
          </>
        }
      />

      <section id="toc" className="space-y-3">
        <p className="text-xs font-bold text-slate-500">目次</p>
        {pages.map((page, i) => (
          <a
            key={page.slug}
            href={page.path}
            className={`block rounded-[1.5rem] border p-4 transition sm:p-5 ${
              page.emphasize
                ? 'border-teal-200 bg-teal-50/80 shadow-sm hover:border-teal-300 hover:bg-teal-50'
                : 'border-slate-200/80 bg-white/90 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                  page.emphasize ? 'bg-teal-600 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-extrabold text-slate-900 sm:text-lg">
                    {page.title}
                  </h2>
                  {page.emphasize && (
                    <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      いちばん大事
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{page.desc}</p>
              </div>
              <i className="fas fa-chevron-right mt-2 shrink-0 text-slate-300" />
            </div>
          </a>
        ))}
      </section>
    </ManualShell>
  );
};

export default GeneralManualIndex;
