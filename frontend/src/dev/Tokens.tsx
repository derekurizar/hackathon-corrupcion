import { wcagLevel } from './contrast';

const PALETTE: { name: string; hex: string }[] = [
  { name: 'bg/base', hex: '#0A0A0B' },
  { name: 'bg/panel', hex: '#121214' },
  { name: 'bg/panel-2', hex: '#17171A' },
  { name: 'accent/red', hex: '#E10600' },
  { name: 'accent/red-deep', hex: '#B0050B' },
  { name: 'text/hi', hex: '#F5F5F5' },
  { name: 'text/mid', hex: '#9A9AA0' },
  { name: 'text/dim', hex: '#5A5A5E' },
  { name: 'line', hex: '#262629' },
  { name: 'priority/high', hex: '#E10600' },
  { name: 'priority/med', hex: '#E6A100' },
  { name: 'priority/low', hex: '#6B7280' },
];

const BG_BASE = '#0A0A0B';

/** Dev-only token preview. Flags any swatch that fails AA on bg/base. */
export default function Tokens() {
  return (
    <div className="mx-auto max-w-[1200px] px-12 py-12">
      <p className="kicker">DEV — DESIGN TOKENS</p>
      <h1 className="headline-display mt-2 text-display-lg text-text-hi">PALETA</h1>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PALETTE.map(({ name, hex }) => {
          const { ratio, normalAA, largeAA } = wcagLevel(hex, BG_BASE);
          return (
            <div key={name} className="border border-line bg-bg-panel">
              <div className="h-20" style={{ backgroundColor: hex }} />
              <div className="p-3">
                <p className="font-body text-body-sm text-text-hi">{name}</p>
                <p className="font-body text-label uppercase text-text-dim">{hex}</p>
                <p className="numeric-tabular mt-1 font-body text-label text-text-mid">
                  {ratio.toFixed(2)}:1 on bg/base
                </p>
                {!normalAA && (
                  <p
                    className="mt-1 inline-block rounded-sm px-1.5 py-0.5 font-body text-label uppercase"
                    style={{
                      backgroundColor: largeAA ? '#E6A100' : '#E10600',
                      color: '#0A0A0B',
                    }}
                  >
                    {largeAA ? 'AA large-text only' : 'fails AA'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <p className="kicker">TYPE SCALE</p>
        <p className="headline-display mt-3 text-display-2xl text-text-hi">DISPLAY 2XL</p>
        <p className="headline-display text-display-xl text-text-hi">DISPLAY XL</p>
        <p className="headline-display text-display-lg text-text-hi">DISPLAY LG</p>
        <p className="numeric-tabular mt-4 font-display text-chapter-num text-accent-red">
          1234567890
        </p>
        <p className="mt-4 font-body text-body-lg text-text-mid">Body lg — Inter</p>
        <p className="font-body text-body-md text-text-mid">Body md — Inter</p>
      </div>
    </div>
  );
}
