import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const CHAPTER_SLOTS = [
  { numeral: '—', key: 'chapter.cover' },
  { numeral: '01', key: 'chapter.01' },
  { numeral: '02', key: 'chapter.02' },
  { numeral: '03', key: 'chapter.03' },
  { numeral: '04', key: 'chapter.04' },
  { numeral: '05', key: 'chapter.05' },
  { numeral: '—', key: 'chapter.cierre' },
] as const;

/**
 * Placeholder cinematic article shell. 7 chapter slots (the fixed spine);
 * ScenePicker + scene catalog + scroll/presentation/podcast = Area 11.
 */
export default function Investigation() {
  const { t } = useTranslation();
  const { caseKey } = useParams<{ caseKey: string }>();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-6 md:px-12 md:pb-24 md:pt-12">
      <p className="kicker">{t('investigation.kicker')}</p>
      <p className="mt-2 font-body text-body-sm text-text-mid">
        {t('investigation.caseLabel')}: <span className="text-text-hi">{caseKey}</span>
      </p>

      {CHAPTER_SLOTS.map((ch) => (
        <section
          key={ch.key}
          className="flex min-h-[80vh] flex-col justify-center border-t border-line"
        >
          <div className="flex items-baseline gap-4">
            <span
              className="font-display text-chapter-num text-text-dim opacity-30"
              style={{ letterSpacing: '-0.03em' }}
            >
              {ch.numeral}
            </span>
            <span className="kicker">{t(ch.key)}</span>
          </div>
          <div className="mt-6 flex h-[240px] items-center justify-center border border-line bg-bg-panel">
            <p className="kicker">{t('investigation.scenePending')}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
