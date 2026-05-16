import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StatsDTO } from '@/api/schemas';

interface Props {
  trend: StatsDTO['trend'];
}

/** Local runtime guard — `StatsDTO.trend` is `unknown[]` by contract. */
function isTrendEntry(v: unknown): v is { month: string; count: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { month?: unknown }).month === 'string' &&
    typeof (v as { count?: unknown }).count === 'number'
  );
}

export default function TrendChart({ trend }: Props) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const data = useMemo(() => trend.filter(isTrendEntry), [trend]);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="kicker text-text-dim">{t('placeholder.noData')}</p>
      </div>
    );
  }

  return (
    <div
      className="mt-4"
      role="img"
      aria-label={t('dashboard.chart.trend.ariaLabel')}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#262629"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: '#5A5A5E', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5A5A5E', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#121214',
              border: '1px solid #262629',
              color: '#F5F5F5',
              fontSize: 12,
            }}
            cursor={{ stroke: '#262629' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#E10600"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={!reduce}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
