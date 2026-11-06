import React from 'react';
import { ADMIN_MANUAL_PAGES, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import { AdminManualShell, PageHero, WarnBox } from './generalShared';

const AdminManualIndex: React.FC = () => {
  const pages = ADMIN_MANUAL_PAGES.filter((p) => p.inToc);
  const sections = Array.from(new Set(pages.map((p) => p.section || 'その他')));

  return (
    <AdminManualShell slug="index" pageTitle="管理者ガイド" headerHref="#toc" headerLabel="目次へ">
      <PageHero
        badge="管理者向け"
        title={
          <>
            管理者パネルの
            <br />
            <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
              使い方ガイド
            </span>
          </>
        }
        lead={
          <>
            渡された管理者用URLで開くパネルの使い方です。確認・消込・名簿・期間・入場URLなど、パネル内の操作をまとめます。
            <br />
            初めてなら「画面の全体像」から、毎日の運用なら「確認と消込」からどうぞ。
          </>
        }
      />

      <div className="mb-8">
        <WarnBox>
          このガイドはログイン不要で開けます。操作は実データに影響するので、本番で試すときは内容を読んでからにしてください。
          <br />
          管理者パネルは、渡された管理者用URLから開きます。入力する人向けの説明は
          <a
            href={GENERAL_MANUAL_PATH}
            className="mx-1 font-bold text-teal-800 underline"
          >
            みなさん向けガイド
          </a>
          にあります。
        </WarnBox>
      </div>

      <section id="toc" className="space-y-8">
        {sections.map((section) => (
          <div key={section}>
            <p className="mb-3 text-xs font-bold text-slate-500">{section}</p>
            <div className="space-y-3">
              {pages
                .filter((p) => (p.section || 'その他') === section)
                .map((page, i) => (
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
                              おすすめ
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                          {page.desc}
                        </p>
                      </div>
                      <i className="fas fa-chevron-right mt-2 shrink-0 text-slate-300" />
                    </div>
                  </a>
                ))}
            </div>
          </div>
        ))}
      </section>
    </AdminManualShell>
  );
};

export default AdminManualIndex;
