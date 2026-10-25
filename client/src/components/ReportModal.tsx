import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal, ErrorText } from './ui';
import { submitReport } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { ReportReason, ReportTarget } from '../types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fake_listing', label: "It's fake or doesn't exist" },
  { value: 'inaccurate', label: 'Photos or details are wrong' },
  { value: 'scam', label: 'Asked for money outside a proper agreement / scam' },
  { value: 'harassment', label: 'Harassment or threatening behaviour' },
  { value: 'unsafe', label: 'Safety concern' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Something else' },
];

export function ReportButton({ targetType, targetId, label = 'Report' }: { targetType: ReportTarget; targetId: string; label?: string }) {
  const { auth, navigate } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => (auth ? setOpen(true) : navigate('/login'))}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 underline-offset-2 hover:text-brand-600 hover:underline dark:text-ink-400"
      >
        <Flag className="h-3.5 w-3.5" /> {label}
      </button>
      {open && <ReportModal targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReportModal({ targetType, targetId, onClose }: { targetType: ReportTarget; targetId: string; onClose: () => void }) {
  const { toast } = useApp();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reason) return setError('Please choose a reason');
    setSending(true);
    setError('');
    try {
      await submitReport({ targetType, targetId, reason, details: details.trim() });
      toast("Thanks — our team will review your report.");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Report this ${targetType}`} onClose={onClose}>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm text-ink-500 dark:text-ink-400">Why are you reporting it?</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-brand-500" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Details (optional)
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="input mt-1 w-full resize-none" placeholder="Anything that helps us investigate" />
      </label>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <div className="mt-4 flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button onClick={send} disabled={sending} className="btn-primary flex-1">{sending ? 'Sending…' : 'Submit report'}</button>
      </div>
    </Modal>
  );
}
