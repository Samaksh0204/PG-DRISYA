import { useState } from 'react';
import { User, Mail, Phone, MapPin, BookOpen, ShieldCheck, Save, Loader2, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { updateProfile, changePassword } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function EditProfilePage() {
  useDocumentTitle('Edit Profile');
  const { auth, navigate, refreshAuth } = useApp();

  const [fullName, setFullName] = useState(auth?.name || '');
  const [phone, setPhone] = useState(auth?.phone || '');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  if (!auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-ink-300" />
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">Sign in to edit your profile</h2>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Sign in</button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        college: college.trim(),
      });
      await refreshAuth();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-xl">
        <button onClick={() => navigate('/dashboard')} className="mb-4 flex items-center gap-2 text-sm text-ink-500 hover:text-coral-500">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Edit Profile</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Update your personal information</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-500">
              <User className="h-3.5 w-3.5" /> Full Name
            </label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-500">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input className="input cursor-not-allowed opacity-60" value={auth.email} disabled />
            <p className="mt-1 text-[11px] text-ink-400">Email cannot be changed</p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-500">
              <Phone className="h-3.5 w-3.5" /> Phone
            </label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-500">
              <MapPin className="h-3.5 w-3.5" /> City
            </label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Indore" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-500">
              <BookOpen className="h-3.5 w-3.5" /> College / Workplace
            </label>
            <input className="input" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. IIT Indore" />
          </div>

          <div>
            <label className="mb-1.5 text-xs font-medium text-ink-500">Bio</label>
            <textarea className="input min-h-[80px] resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." />
          </div>

          {/* Aadhaar verification link */}
          <div className="card flex items-center gap-3 p-4">
            <ShieldCheck className={`h-5 w-5 ${auth.aadhaarVerified ? 'text-teal-600' : 'text-ink-400'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-100">
                Aadhaar Verification
              </p>
              <p className="text-xs text-ink-400">
                {auth.aadhaarVerified ? 'Verified' : 'Not verified yet'}
              </p>
            </div>
            {!auth.aadhaarVerified && (
              <button onClick={() => navigate('/aadhaar')} className="btn-outline text-xs">
                Verify now
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">Profile updated successfully!</p>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>

        {/* ── Password Change Section ── */}
        <div className="mt-10 border-t border-ink-100 pt-8 dark:border-ink-800">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
            <Lock className="h-5 w-5" /> Change Password
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Update your account password</p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 text-xs font-medium text-ink-500">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrentPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 text-xs font-medium text-ink-500">New Password</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowNewPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 text-xs font-medium text-ink-500">Confirm New Password</label>
              <input
                type="password"
                className="input w-full"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            {pwdError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{pwdError}</p>
            )}
            {pwdSuccess && (
              <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">{pwdSuccess}</p>
            )}

            <button
              onClick={async () => {
                setPwdError('');
                setPwdSuccess('');
                if (!currentPwd || !newPwd) { setPwdError('Both fields are required'); return; }
                if (newPwd.length < 6) { setPwdError('New password must be at least 6 characters'); return; }
                if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return; }
                setPwdSaving(true);
                try {
                  const res = await changePassword(currentPwd, newPwd);
                  setPwdSuccess(res.message);
                  setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
                  setTimeout(() => setPwdSuccess(''), 4000);
                } catch (err: any) {
                  setPwdError(err.message || 'Failed to change password');
                } finally {
                  setPwdSaving(false);
                }
              }}
              disabled={pwdSaving}
              className="btn-primary w-full"
            >
              {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
