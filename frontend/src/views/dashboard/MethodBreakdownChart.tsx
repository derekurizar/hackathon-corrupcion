import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatInt } from '@/article/scenes/format';

interface Props {
  methodBreakdown: StatsDTO['methodBreakdown'];
}

// Conservative upper bound for glyph width at fontSize 11 in this UI font,
// and the px the tick eats before the text starts (axis offset + the 4px
// `dx` gap). Used to derive a per-label character budget so the single-line
// label never overflows the gutter and gets clipped on the left.
const PX_PER_CHAR = 7;
const TICK_INSET = 16;

/**
 * Single-line, never-wrapping y-axis tick. A plain SVG <text> has no automatic
 * line breaking, so long method names always render on one line and ellipsize
 * cleanly — unlike Recharts' default tick, which word-wraps inside the gutter.
 */
function MethodTick({
  x,
  y,
  payload,
  max,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  max: number;
}) {
  const raw = payload?.value ?? '';
  const label = raw.length > max ? raw.slice(0, max).trimEnd() + '…' : raw;
  return (
    <text
      x={x}
      y={y}
      dx={-4}
      textAnchor="end"
      dominantBaseline="central"
      fill="#5A5A5E"
      fontSize={11}
    >
      {label}
    </text>
  );
}

export default function MethodBreakdownChart({ methodBreakdown }: Props) {
  const { t, i18n } = useTranslation();

  const data = useMemo(
    () =>
      Object.entries(methodBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [methodBreakdown],
  );

  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );
  const count = useCountUp(total, { duration: 1.8, enabled: true });

  // Responsive label gutter: wide enough on desktop to show the full method
  // names (and tell the two long "Procedimientos Regulados…" apart), but
  // capped so it never starves the bars on a narrow viewport. A callback ref
  // (not useEffect) wires the observer exactly when the node attaches, so it
  // is robust to the chart being conditionally rendered / remounted.
  const roRef = useRef<ResizeObserver | null>(null);
  const [chartW, setChartW] = useState(0);
  const setChartNode = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!node) return;
    setChartW(node.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setChartW(entry.contentRect.width);
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  const gutter = Math.round(Math.min(300, Math.max(120, chartW * 0.42)));
  const labelMax = Math.max(10, Math.floor((gutter - TICK_INSET) / PX_PER_CHAR));

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="kicker text-text-dim">{t('placeholder.noData')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Punchline — total records across all methods, red glow (once, never
          looped). This is a record count, not a share — never suffix `%`. */}
      <p className="numeric-tabular font-display text-display-lg text-accent-red red-glow">
        {formatInt(count, i18n.language)}
      </p>
      <div
        ref={setChartNode}
        className="mt-4"
        role="img"
        aria-label={t('dashboard.chart.methods.ariaLabel')}
      >
        {/* Mount the chart only once the gutter width is known, so it renders
            a single time at final geometry — re-rendering Recharts with a
            changed YAxis width mid-mount leaves the bar paths stuck empty. */}
        {chartW === 0 ? (
          <div style={{ height: 280 }} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
          <BarChart layout="vertical" data={data}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatInt(v, i18n.language)}
              tick={{ fill: '#5A5A5E', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={gutter}
              tick={(props) => <MethodTick {...props} max={labelMax} />}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => formatInt(v, i18n.language)}
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
              radius={[0, 2, 2, 0]}
              minPointSize={3}
              isAnimationActive={false}
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
        )}
      </div>
    </div>
  );
}
