import { useTranslation } from 'react-i18next';

/** Placeholder. Full "war room" dashboard = Area 12. */
export default function Dashboard() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-6 md:px-12 md:pb-24 md:pt-12">
      <p className="kicker">{t('dashboard.kicker')}</p>
      <h1 className="headline-display mt-2 text-display-xl text-text-hi">
        {t('dashboard.headline')}
      </h1>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['records', 'value', 'signals'] as const).map((k) => (
          <div
            key={k}
            className="border-t-4 border-accent-red bg-bg-panel p-6"
          >
            <p className="kicker">{t(`dashboard.stat.${k}`)}</p>
            <p className="numeric-tabular mt-3 font-display text-display-lg text-text-hi">
              —
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex h-[240px] items-center justify-center border border-line bg-bg-panel">
        <p className="kicker">{t('dashboard.chartPlaceholder')}</p>
      </div>
    </div>
  );
}
