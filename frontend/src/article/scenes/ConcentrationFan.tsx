import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import ReactFlow, {
  Background,
  Handle,
  Panel,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import type { Edge, Node, NodeProps, NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatInt, formatShare } from './format';

/** Hand-mirror of the synced `ConcentrationFan` schema. */
interface FanSupplier {
  supplierId: string;
  supplierDisplay: string;
  value: number;
  valueRef: string;
  share: number;
  shareRef: string;
  flagged: boolean;
}
interface ConcentrationFanParams {
  buyer: string;
  topShare: number;
  topShareRef: string;
  suppliers: FanSupplier[];
  caption: string;
  narration: string;
}

interface ConcentrationFanProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

type BuyerData = { label: string };
type SupplierData = {
  label: string;
  size: number;
  flagged: boolean;
  reduce: boolean;
};

function BuyerNode({ data }: NodeProps<BuyerData>) {
  return (
    <div className="rounded border border-line bg-bg-panel-2 px-4 py-3">
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <p className="kicker">{data.label}</p>
    </div>
  );
}

function SupplierNode({ data }: NodeProps<SupplierData>) {
  return (
    <m.div
      initial={data.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={data.reduce ? { duration: 0.2 } : { type: 'spring', bounce: 0.15, duration: 0.5 }}
      className={cn(
        'flex items-center justify-center rounded-full border bg-bg-panel text-center',
        data.flagged ? 'red-glow-pulse border-2 border-accent-red' : 'border border-line',
      )}
      style={{ width: data.size, height: data.size }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <span className="px-1 font-body text-[10px] leading-tight text-text-mid">{data.label}</span>
    </m.div>
  );
}

const nodeTypes: NodeTypes = {
  buyer: BuyerNode,
  supplier: SupplierNode,
};

/**
 * Supplementary zoom/pan controls overlaid inside the chart box. Lives inside
 * the ReactFlow context (rendered via `<Panel>` as a child of `<ReactFlow>`),
 * so `useReactFlow` resolves. The `sr-only` data table remains the
 * screen-reader equivalent — these are visual aids only.
 */
function ZoomControls({ reduce }: { reduce: boolean }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { t } = useTranslation();
  const btn =
    'flex h-8 w-8 items-center justify-center text-text-mid transition-colors hover:text-text-hi';
  return (
    <Panel position="bottom-right">
      <div className="flex flex-col divide-y divide-line rounded border border-line bg-bg-panel-2">
        <m.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className={btn}
          aria-label={t('article.scene.zoomIn')}
          title={t('article.scene.zoomIn')}
          onClick={() => zoomIn({ duration: reduce ? 0 : 200 })}
        >
          <Plus size={14} aria-hidden />
        </m.button>
        <m.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className={btn}
          aria-label={t('article.scene.zoomOut')}
          title={t('article.scene.zoomOut')}
          onClick={() => zoomOut({ duration: reduce ? 0 : 200 })}
        >
          <Minus size={14} aria-hidden />
        </m.button>
        <m.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className={btn}
          aria-label={t('article.scene.zoomReset')}
          title={t('article.scene.zoomReset')}
          onClick={() => fitView({ padding: 0.2, duration: reduce ? 0 : 300 })}
        >
          <Maximize2 size={13} aria-hidden />
        </m.button>
      </div>
    </Panel>
  );
}

const CX = 120;
const CY = 260;
const RADIUS = 360;

export default function ConcentrationFan({ params }: ConcentrationFanProps) {
  const { t, i18n } = useTranslation();
  const p = params as ConcentrationFanParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [statDone, setStatDone] = useState(false);

  const topShare = useCountUp(p.topShare * 100, {
    enabled: inView,
    duration: 1.4,
    onComplete: () => setStatDone(true),
  });

  const maxValue = useMemo(() => Math.max(...p.suppliers.map((s) => s.value), 1), [p.suppliers]);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [
      {
        id: '__buyer',
        type: 'buyer',
        position: { x: CX - 60, y: CY - 20 },
        data: { label: p.buyer } satisfies BuyerData,
        draggable: false,
      },
    ];
    const es: Edge[] = [];
    const n = p.suppliers.length;
    p.suppliers.forEach((s, i) => {
      // Fan a semicircle from -60° to +60°.
      const tFrac = n === 1 ? 0.5 : i / (n - 1);
      const angle = ((-60 + tFrac * 120) * Math.PI) / 180;
      const x = CX + Math.cos(angle) * RADIUS;
      const y = CY + Math.sin(angle) * RADIUS;
      const size = Math.max(48, Math.min(96, 48 + (s.value / maxValue) * 48));
      ns.push({
        id: s.supplierId,
        type: 'supplier',
        position: { x, y: y - size / 2 },
        data: {
          label: s.supplierDisplay,
          size,
          flagged: s.flagged,
          reduce: Boolean(reduce),
        } satisfies SupplierData,
        draggable: false,
      });
      es.push({
        id: `e-${s.supplierId}`,
        source: '__buyer',
        target: s.supplierId,
        type: 'smoothstep',
        style: s.flagged
          ? { stroke: 'rgba(225,6,0,0.4)', strokeWidth: 2 }
          : { stroke: '#262629', strokeWidth: 1 },
      });
    });
    return { nodes: ns, edges: es };
  }, [p.buyer, p.suppliers, maxValue, reduce]);

  return (
    <div ref={ref}>
      <p
        className={cn(
          'numeric-tabular font-display text-display-xl text-text-hi',
          statDone && 'red-glow',
        )}
      >
        {formatInt(topShare, i18n.language)}%
      </p>
      <p className="mt-2 mb-6 kicker">{p.caption}</p>

      {p.narration && (
        <p className="font-body text-body-sm text-text-mid text-pretty max-w-[60ch] mb-4">
          {p.narration}
        </p>
      )}

      {/*
        Mount ReactFlow only once the scene is actually in view. Chapter
        sections use `content-visibility: auto`, so this component otherwise
        mounts while offscreen at zero size — ReactFlow's one-shot `fitView`
        then runs against a 0×0 box, computing a broken viewport transform
        that never re-fits, leaving the canvas visually empty. Deferring the
        mount until `inView` guarantees a measured container.
      */}
      <div className="h-[520px] w-full overflow-hidden rounded border border-line bg-bg-panel">
        {inView && (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll={false}
              zoomOnPinch
              zoomOnDoubleClick={false}
              minZoom={0.3}
              maxZoom={2.5}
              preventScrolling={false}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#262629" gap={28} size={1} />
              <ZoomControls reduce={Boolean(reduce)} />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>

      {/* Screen-reader equivalent of the canvas */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.heroSupplier')}</th>
            <th>{t('chapter.sigueElDinero')}</th>
            <th>%</th>
            <th>{t('article.priorityHigh')}</th>
          </tr>
        </thead>
        <tbody>
          {p.suppliers.map((s) => (
            <tr key={s.supplierId}>
              <td>{s.supplierDisplay}</td>
              <td>{formatInt(s.value, i18n.language)}</td>
              <td>{formatShare(s.share)}</td>
              <td>{s.flagged ? 'flagged' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
