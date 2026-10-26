import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, Loader2, LogIn, Star, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { optimizeImage, imageSrcSet } from '../lib/image';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-brand-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let openModals = 0;

// Dialogs render into <body> through a portal, in their own top-level stacking layer
// (z-modal in index.css). Rendering them inside the page let positioned content with
// its own z-index — e.g. Leaflet map panes (z-index 200–1000) — paint over them.
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Parents usually pass an inline arrow; keep the latest one without re-running the effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    openModals += 1;
    if (root) root.inert = true; // background can't be clicked, tabbed to or read by screen readers
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('[data-autofocus]') || dialog;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openModals -= 1;
      if (openModals === 0) {
        if (root) root.inert = false;
        document.body.style.overflow = prevOverflow;
      }
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="z-modal fixed inset-0 flex animate-backdrop-in items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`max-h-[92dvh] w-full animate-slide-up overflow-y-auto overscroll-contain rounded-t-2xl border border-ink-200 bg-white p-6 shadow-card-hover outline-none dark:border-ink-800 dark:bg-ink-900 sm:animate-scale-in sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger dark:bg-danger/10 dark:text-red-300">
      <AlertCircle className="h-4 w-4 shrink-0" /> {children}
    </p>
  );
}

export function SuccessText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success dark:bg-success/10 dark:text-green-300">
      <CheckCircle2 className="h-4 w-4 shrink-0" /> {children}
    </p>
  );
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 px-4 py-14 text-center dark:border-ink-700">
      <Icon className="h-10 w-10 text-ink-300" />
      <h3 className="mt-3 text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{desc}</p>}
      {action && <button onClick={action.onClick} className="btn-primary mt-4">{action.label}</button>}
    </div>
  );
}

export function SignInRequired({ message = 'Log in to continue.', role }: { message?: string; role?: 'tenant' | 'owner' }) {
  const { navigate } = useApp();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <LogIn className="h-12 w-12 text-ink-300" />
      <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-100">Sign in required</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{message}</p>
      <button onClick={() => navigate(`/login${role ? `?role=${role}` : ''}`)} className="btn-primary mt-4">
        <LogIn className="h-4 w-4" /> Log in
      </button>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/15 text-amber-800 dark:bg-warning/20 dark:text-amber-300',
  pending_review: 'bg-warning/15 text-amber-800 dark:bg-warning/20 dark:text-amber-300',
  open: 'bg-warning/15 text-amber-800 dark:bg-warning/20 dark:text-amber-300',
  confirmed: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300',
  accepted: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300',
  active: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300',
  completed: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300',
  resolved: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300',
  rejected: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-300',
  declined: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-300',
  cancelled: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  inactive: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  dismissed: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  closed: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  new: 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300',
  contacted: 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300',
};
const STATUS_LABELS: Record<string, string> = { pending_review: 'Awaiting review', inactive: 'Paused', active: 'Live' };

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.cancelled}`}>
      {STATUS_LABELS[status] || status.replace('_', ' ')}
    </span>
  );
}

export function Stars({ value, size = 'h-3.5 w-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-warning text-warning' : 'text-ink-200 dark:text-ink-700'}`} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star className={`h-7 w-7 transition duration-150 hover:scale-110 ${i <= (hover || value) ? 'fill-warning text-warning' : 'text-ink-300 dark:text-ink-600'}`} />
        </button>
      ))}
    </div>
  );
}

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  const icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  // Portalled above dialogs so a toast raised from inside a dialog stays visible and clickable.
  return createPortal(
    <div className="z-toast pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icon[t.kind];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md animate-slide-up items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-card-hover ${
              t.kind === 'error' ? 'bg-danger text-white' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

// Image that swaps to a neutral placeholder if the URL is broken.
// `width` is the largest size (CSS px) it is shown at, so a right-sized copy is fetched.
// `priority` loads it straight away (use for the main image above the fold).
export function SafeImage({ src, alt, className = '', width = 800, priority = false, fallback }: { src?: string; alt: string; className?: string; width?: number; priority?: boolean; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  if (failed && fallback) return <>{fallback}</>;
  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-brand-50 text-xs font-medium text-brand-700 dark:bg-ink-800 dark:text-brand-300 ${className}`} aria-label={alt}>
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={optimizeImage(src, width)}
      srcSet={imageSrcSet(src, width)}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-brand-500" />
          <h1 className="mt-3 text-xl font-bold text-ink-900 dark:text-white">Something went wrong</h1>
          <p className="mt-1 text-sm text-ink-500">Please reload the page. If this keeps happening, contact support.</p>
          <button className="btn-primary mt-4" onClick={() => { this.setState({ error: null }); window.location.hash = '/'; }}>
            Back to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Profile photo with an initials fallback if the image can't load.
export function Avatar({ src, name, className = 'h-10 w-10 rounded-full object-cover' }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  if (failed) {
    return <span className={`inline-flex shrink-0 items-center justify-center bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ${className}`} aria-label={name}>{initials}</span>;
  }
  return <img src={optimizeImage(src, 160)} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`shrink-0 ${className}`} />;
}
