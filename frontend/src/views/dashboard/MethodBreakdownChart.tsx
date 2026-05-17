import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StatsDTO } from '@/api/schemas';
import { useCountUp } from '@/article/scenes/useCountUp';

interface Props {
  methodBreakdown: StatsDTO['methodBreakdown'];
}

export default function MethodBreakdownChart({ methodBreakdown }: Props) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const data = useMemo(
    () =>
      Object.entries(methodBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [methodBreakdown],
  );

  const topValue = data[0]?.value ?? 0;
  const count = useCountUp(topValue, { duration: 1.8, enabled: true });

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="kicker text-text-dim">{t('placeholder.noData')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Punchline — single key datum gets the red glow (once, never looped) */}
      <p className="numeric-tabular font-display text-display-lg text-accent-red red-glow">
        {count.toFixed(1)}%
      </p>
      <div
        className="mt-4"
        role="img"
        aria-label={t('dashboard.chart.methods.ariaLabel')}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart layout="vertical" data={data}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#5A5A5E', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tickFormatter={(v: string) =>
                v.length > 26 ? v.slice(0, 26).trimEnd() + '…' : v
              }
              tick={{ fill: '#5A5A5E', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#121214',
                border: '1px solid #262629',
                color: '#F5F5F5',
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar
              dataKey="value"
              radius={[0, 2, 2, 0]}
              isAnimationActive={!reduce}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={index === 0 ? '#E10600' : '#262629'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
