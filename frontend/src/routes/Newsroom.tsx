import { useTranslation } from 'react-i18next';

/** Placeholder. Dossier feed + edition banner + filters = Area 12. */
export default function Newsroom() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-6 md:px-12 md:pb-24 md:pt-12">
      <p className="kicker">{t('newsroom.kicker')}</p>
      <h1 className="headline-display mt-2 text-display-xl text-text-hi">
        {t('newsroom.headline')}
      </h1>
      <div className="vignette-heavy mt-8 flex h-[200px] items-center justify-center overflow-hidden bg-bg-panel-2">
        <p className="kicker relative z-10">{t('placeholder.noArticle')}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-[160px] flex-col justify-between border border-line bg-bg-panel p-5"
          >
            <p className="kicker">
              {t('newsroom.dossier')} 0{i + 1}
            </p>
            <p className="font-body text-body-sm text-text-dim">
              {t('placeholder.comingSoon')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
