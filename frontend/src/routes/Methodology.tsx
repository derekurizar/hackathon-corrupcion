import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/** Placeholder. Full methodology copy + sources = Area 12. */
export default function Methodology() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-6 md:px-12 md:pb-24 md:pt-12">
      <p className="kicker">{t('methodology.kicker')}</p>
      <h1 className="headline-display mt-2 text-display-xl text-text-hi">
        {t('methodology.headline')}
      </h1>
      <hr className="mt-6 border-line" />
      <div className="mt-8 max-w-[68ch] border border-line bg-bg-panel p-6">
        {(['source', 'detection', 'limits'] as const).map((s) => (
          <div key={s} className="mb-6 last:mb-0">
            <h2 className="kicker">{t(`methodology.section.${s}`)}</h2>
            <p className="mt-2 font-body text-body-md leading-[1.6] text-text-mid">
              {t('placeholder.comingSoon')}
            </p>
          </div>
        ))}
        <p className="mt-6 border-t border-line pt-4 font-body text-body-sm text-text-dim">
          {t('methodology.caveat')}
        </p>
      </div>
      <Link
        to="/newsroom"
        className="mt-8 inline-block font-body text-body-sm uppercase tracking-label text-accent-red hover:text-accent-red-deep"
      >
        {t('methodology.backToNewsroom')}
      </Link>
    </div>
  );
}
