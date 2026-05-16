import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { StatsDTO } from '@/api/schemas';

interface Props {
  byFamily: StatsDTO['byFamily'];
}

export default function SignalsByFamily({ byFamily }: Props) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const data = useMemo(
    () => [
      { family: 'F1', count: byFamily.F1 },
      { family: 'F2', count: byFamily.F2 },
      { family: 'F3', count: byFamily.F3 },
      { family: 'F4', count: byFamily.F4 },
    ],
    [byFamily],
  );

  return (
    <div
      className="mt-4"
      role="img"
      aria-label={t('dashboard.chart.signals.ariaLabel')}
    >
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid gridType="polygon" stroke="#262629" />
          <PolarAngleAxis
            dataKey="family"
            tick={{ fill: '#5A5A5E', fontSize: 11 }}
          />
          <PolarRadiusAxis stroke="transparent" tick={false} />
          <Radar
            dataKey="count"
            stroke="#E10600"
            fill="#E10600"
            fillOpacity={0.12}
            isAnimationActive={!reduce}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
