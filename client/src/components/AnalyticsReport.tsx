import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, CalendarCheck, KeyRound, MessageCircle, UserPlus, SearchX, RefreshCw, type LucideIcon } from 'lucide-react';
import { admin } from '../lib/api';
import { ErrorText, PageLoader } from './ui';
import { useApp } from '../context/AppContext';
import type { AnalyticsEventName, AnalyticsReport as Report } from '../types';

const EVENTS: { key: AnalyticsEventName; label: string; icon: LucideIcon }[] = [
  { key: 'search', label: 'Searches', icon: Search },
  { key: 'listing_view', label: 'Listing views', icon: Eye },
  { key: 'visit_requested', label: 'Visit requests', icon: CalendarCheck },
  { key: 'booking_requested', label: 'Booking requests', icon: KeyRound },
  { key: 'message_sent', label: 'Messages sent', icon: MessageCircle },
  { key: 'signup', label: 'Sign-ups', icon: UserPlus },
];
const PLATFORM_LABEL: Record<string, string> = { web: 'Website', android: 'Android app', ios: 'iPhone app', unknown: 'Other' };

function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Usage overview for admins (data from GET /api/admin/analytics).
export function AnalyticsReport() {
  const { navigate } = useApp();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<AnalyticsEventName>('listing_view');

  const load = () => {
    setLoading(true);
    setError('');
    admin.analytics(days).then(setReport).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  };
  useEffect(load, [days]);

  if (loading && !report) return <PageLoader />;
  if (!report) return <div className="space-y-3"><ErrorText>{error || 'Could not load analytics.'}</ErrorText><button onClick={load} className="btn-outline"><RefreshCw className="h-4 w-4" /> Try again</button></div>;

  const platformTotal = Object.values(report.platforms).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filters in one row above everything */}
      <div className="flex flex-wrap items-center gap-2">
        {([7, 30, 90] as const).map((d) => (
          <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`chip ${days === d ? 'chip-active' : ''}`}>Last {d} days</button>
        ))}
        {loading && <span className="text-xs text-ink-500">Updating…</span>}
        <span className="ml-auto text-xs text-ink-500">Counts exclude owners viewing their own listings. No personal details are stored with events.</span>
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {EVENTS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500"><Icon className="h-3.5 w-3.5" /> {label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-white">{report.totals[key].count.toLocaleString('en-IN')}</p>
            {key !== 'signup' && <p className="text-xs text-ink-500">{report.totals[key].users} signed-in {report.totals[key].users === 1 ? 'person' : 'people'}</p>}
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-base font-semibold">{EVENTS.find((e) => e.key === series)!.label} per day</h3>
          {EVENTS.map((e) => (
            <button key={e.key} onClick={() => setSeries(e.key)} aria-pressed={series === e.key} className={`chip !min-h-0 !py-1 !text-xs ${series === e.key ? 'chip-active' : ''}`}>{e.label}</button>
          ))}
        </div>
        <DailyBars report={report} series={series} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-base font-semibold">From viewing to requesting</h3>
          <p className="mb-4 text-xs text-ink-500">Share of listing views that led to a request in the same period.</p>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs text-ink-500">Listing views</dt><dd className="text-xl font-bold">{report.funnel.listingViews}</dd></div>
            <div><dt className="text-xs text-ink-500">Visit requests</dt><dd className="text-xl font-bold">{report.funnel.visitRequests}</dd><dd className="text-xs text-ink-500">{report.funnel.viewToVisitPct}% of views</dd></div>
            <div><dt className="text-xs text-ink-500">Booking requests</dt><dd className="text-xl font-bold">{report.funnel.bookingRequests}</dd><dd className="text-xs text-ink-500">{report.funnel.viewToBookingPct}% of views</dd></div>
          </dl>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold">Where people use Drisya</h3>
          {platformTotal === 0 ? <p className="text-sm text-ink-500">No activity yet.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(report.platforms).sort((a, b) => (b[1] || 0) - (a[1] || 0)).map(([p, n]) => (
                  <tr key={p} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                    <td className="py-2">{PLATFORM_LABEL[p] || p}</td>
                    <td className="py-2 text-right font-semibold">{n}</td>
                    <td className="w-16 py-2 text-right text-ink-500">{Math.round(((n || 0) / platformTotal) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankTable title="Top searches" empty="No searches yet." rows={report.topSearches.map((s) => [s.term, s.count])} />
        <RankTable
          title="Searches that found nothing"
          icon={SearchX}
          note={`${report.zeroResultSearches.total} in total — demand you can't serve yet.`}
          empty="Every search found something."
          rows={report.zeroResultSearches.terms.map((s) => [s.term, s.count])}
        />
        <RankTable
          title="Most viewed listings"
          empty="No listing views yet."
          rows={report.topListings.map((l) => [l.title, l.views, () => navigate(`/listing/${l.propertyId}`)])}
        />
      </div>
    </div>
  );
}

function RankTable({ title, rows, empty, note, icon: Icon }: { title: string; rows: [string, number, (() => void)?][]; empty: string; note?: string; icon?: LucideIcon }) {
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-1.5 text-base font-semibold">{Icon && <Icon className="h-4 w-4 text-ink-500" />} {title}</h3>
      {note && <p className="text-xs text-ink-500">{note}</p>}
      {rows.length === 0 ? <p className="mt-3 text-sm text-ink-500">{empty}</p> : (
        <ol className="mt-3 space-y-1.5 text-sm">
          {rows.map(([label, n, onClick], i) => (
            <li key={`${label}-${i}`} className="flex items-baseline gap-2">
              <span className="w-5 shrink-0 text-xs text-ink-400">{i + 1}.</span>
              {onClick ? <button onClick={onClick} className="min-w-0 flex-1 truncate text-left hover:underline">{label}</button> : <span className="min-w-0 flex-1 truncate">{label}</span>}
              <span className="font-semibold">{n}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Single-series daily bars with a hover/focus tooltip and a table fallback.
function DailyBars({ report, series }: { report: Report; series: AnalyticsEventName }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const points = useMemo(() => {
    const byDay = new Map(report.daily.filter((d) => d.name === series).map((d) => [d.day, d.count]));
    const out: { day: string; count: number }[] = [];
    for (let i = report.days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDay(d);
      out.push({ day: key, count: byDay.get(key) || 0 });
    }
    return out;
  }, [report, series]);
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((n, p) => n + p.count, 0);
  const W = 720, H = 180, PAD = 28, gap = 2;
  const bw = (W - PAD) / points.length - gap;
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (total === 0) return <p className="py-10 text-center text-sm text-ink-500">Nothing recorded in this period yet.</p>;
  return (
    <div>
      {asTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-ink-500"><th className="py-1">Day</th><th className="py-1 text-right">Count</th></tr></thead>
            <tbody>{points.filter((p) => p.count).map((p) => <tr key={p.day} className="border-t border-ink-100 dark:border-ink-800"><td className="py-1">{label(p.day)}</td><td className="py-1 text-right font-semibold">{p.count}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" role="img" aria-label={`${total} in total over ${report.days} days; busiest day ${max}.`}>
            {/* Recessive guide lines: baseline and max */}
            <line x1={PAD} x2={W} y1={H} y2={H} className="stroke-ink-200 dark:stroke-ink-700" strokeWidth={1} />
            <line x1={PAD} x2={W} y1={8} y2={8} className="stroke-ink-100 dark:stroke-ink-800" strokeDasharray="3 4" strokeWidth={1} />
            <text x={PAD - 6} y={12} textAnchor="end" className="fill-ink-500 text-[10px]">{max}</text>
            <text x={PAD - 6} y={H} textAnchor="end" className="fill-ink-500 text-[10px]">0</text>
            {points.map((p, i) => {
              const h = p.count ? Math.max(2, ((H - 8) * p.count) / max) : 0;
              const x = PAD + i * (bw + gap);
              return (
                <g key={p.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={p.count ? 0 : -1} aria-label={`${label(p.day)}: ${p.count}`}>
                  {/* Hit target taller than the bar */}
                  <rect x={x} y={0} width={bw + gap} height={H} fill="transparent" />
                  {h > 0 && <path d={`M${x},${H} v${-(h - Math.min(4, bw / 2, h))} q0,${-Math.min(4, bw / 2, h)} ${Math.min(4, bw / 2)},${-Math.min(4, bw / 2, h)} h${bw - 2 * Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, bw / 2, h)} v${h - Math.min(4, bw / 2, h)} z`} className={hover === i ? 'fill-brand-700' : 'fill-brand-600'} />}
                </g>
              );
            })}
            <text x={PAD} y={H + 16} className="fill-ink-500 text-[10px]">{label(points[0].day)}</text>
            <text x={W} y={H + 16} textAnchor="end" className="fill-ink-500 text-[10px]">{label(points[points.length - 1].day)}</text>
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-0 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs text-white shadow-card-hover" style={{ left: `${((PAD + hover * (bw + gap)) / W) * 100}%`, transform: 'translateX(-40%)' }}>
              <span className="font-semibold">{points[hover].count}</span> · {label(points[hover].day)}
            </div>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
        <span>{total} in total · busiest day {max}</span>
        <button onClick={() => setAsTable((v) => !v)} className="underline">{asTable ? 'Show chart' : 'Show as table'}</button>
      </div>
    </div>
  );
}
