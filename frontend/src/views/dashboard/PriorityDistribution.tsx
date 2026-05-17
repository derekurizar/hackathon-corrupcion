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

interface Props {
  priorityDist: StatsDTO['priorityDist'];
}

export default function PriorityDistribution({ priorityDist }: Props) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const data = useMemo(
    () => [
      {
        label: t('newsroom.priority.high'),
        key: 'high',
        value: priorityDist.high,
        fill: '#E10600',
      },
      {
        label: t('newsroom.priority.medium'),
        key: 'medium',
        value: priorityDist.medium,
        fill: '#E6A100',
      },
      {
        label: t('newsroom.priority.low'),
        key: 'low',
        value: priorityDist.low,
        fill: '#6B7280',
      },
    ],
    [priorityDist, t],
  );

  return (
    <div
      className="mt-4"
      role="img"
      aria-label={t('dashboard.chart.priority.ariaLabel')}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis
            dataKey="label"
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
            itemStyle={{ color: '#F5F5F5' }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar
            dataKey="value"
            radius={[2, 2, 0, 0]}
            isAnimationActive={!reduce}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
