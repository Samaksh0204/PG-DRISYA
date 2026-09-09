import { ShieldCheck, Star, BadgeCheck, Crown, Zap, Clock } from 'lucide-react';

export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ${cls}`}>
      <ShieldCheck className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      Verified
    </span>
  );
}

export function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <Crown className="h-3.5 w-3.5" />
      Featured
    </span>
  );
}

export function InstantBookBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coral-700 dark:bg-coral-900/30 dark:text-coral-300">
      <Zap className="h-3.5 w-3.5" />
      Instant Book
    </span>
  );
}

export function RatingBadge({ rating, count, size = 'sm' }: { rating: number; count?: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-ink-900 dark:text-ink-100 ${cls}`}>
      <Star className="h-3.5 w-3.5 fill-ink-900 text-ink-900 dark:fill-ink-100 dark:text-ink-100" />
      {rating.toFixed(1)}
      {count !== undefined && <span className="font-normal text-ink-500 dark:text-ink-400">({count})</span>}
    </span>
  );
}

export function ResponseRateBadge({ rate, time }: { rate: number; time: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
      <BadgeCheck className="h-3.5 w-3.5 text-teal-600" />
      {rate}% response · <Clock className="inline h-3 w-3" /> {time}
    </span>
  );
}
