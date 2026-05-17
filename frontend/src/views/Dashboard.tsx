import { useTranslation } from 'react-i18next';
import { useStats } from '@/api/hooks';
import Counters from './dashboard/Counters';
import MethodBreakdownChart from './dashboard/MethodBreakdownChart';
import SignalsByFamily from './dashboard/SignalsByFamily';
import PriorityDistribution from './dashboard/PriorityDistribution';
import TopInvestigations from './dashboard/TopInvestigations';

/**
 * "War room" dashboard — counters + four hero charts + top investigations.
 * Replaces the `src/routes/Dashboard.tsx` placeholder.
 */
export default function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useStats();

  // TODO(P4): full skeleton on load.
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="kicker text-text-dim">{t('placeholder.loading')}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="kicker text-text-dim">{t('dashboard.empty')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-[clamp(1rem,5vw,6rem)] pb-20 pt-6 md:pb-24 md:pt-12">
      {/* Region A — header */}
      <p className="kicker">{t('dashboard.kicker')}</p>
      <h1 className="headline-display mt-2 text-display-xl text-text-hi text-balance">
        {t('dashboard.headline')}
      </h1>

      {/* Region B — counters */}
      <div className="mt-10">
        <Counters counters={data.counters} />
      </div>

      {/* Region C — hero charts */}
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="bg-bg-panel border-t-2 border-accent-red p-6">
          <p className="kicker">{t('dashboard.section.methods')}</p>
          <MethodBreakdownChart methodBreakdown={data.methodBreakdown} />
        </div>
        <div className="bg-bg-panel p-6">
          <p className="kicker">{t('dashboard.section.signals')}</p>
          <SignalsByFamily byFamily={data.byFamily} />
        </div>
      </div>

      {/* Region D — priority */}
      <div className="mt-6">
        <div className="bg-bg-panel p-6">
          <p className="kicker">{t('dashboard.section.priority')}</p>
          <PriorityDistribution priorityDist={data.priorityDist} />
        </div>
      </div>

      {/* Region E — top investigations */}
      <div className="mt-12">
        <p className="kicker">{t('dashboard.section.top')}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TopInvestigations topBuyers={data.topBuyersByFlaggedValue} />
        </div>
      </div>
    </div>
  );
}
