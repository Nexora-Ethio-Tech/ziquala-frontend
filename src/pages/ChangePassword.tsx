import { uiError, uiText } from "../localization";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/authService';

const validatePassword = (pw: string) => ({
  minLength: pw.length >= 5,
  hasUpper: /[A-Z]/.test(pw),
  hasLower: /[a-z]/.test(pw),
  hasNumber: /[0-9]/.test(pw),
});

export const ChangePassword = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const rules = validatePassword(newPassword);
    const allRulesMet = Object.values(rules).every(Boolean);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(uiText(""));
        setSuccess(false);

        if (!rules.minLength) {
            setError(uiText("New password must be at least 5 characters long."));
            return;
        }
        if (!rules.hasUpper) {
            setError(uiText("New password must contain at least one uppercase letter."));
            return;
        }
        if (!rules.hasLower) {
            setError(uiText("New password must contain at least one lowercase letter."));
            return;
        }
        if (!rules.hasNumber) {
            setError(uiText("New password must contain at least one number."));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(uiText("New passwords do not match."));
            return;
        }
        if (currentPassword === newPassword) {
            setError(uiText("New password must be different from your current password."));
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err.response?.data?.error?.message
                || err.response?.data?.error?.details?.[0]
                || 'Failed to change password. Please check your current password and try again.';
            setError(uiText(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
            <div className="max-w-xl mx-auto px-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeft size={16} />{uiText("Back")}</button>

                <div className="rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/30 dark:shadow-slate-950/50">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 text-white">
                                <Lock size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">{uiText("Change Password")}</h1>
                                <p className="text-sm text-blue-100 mt-0.5">{uiText("Update your account password securely.")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        {success && (
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
                                <CheckCircle size={20} className="shrink-0" />
                                <span className="text-sm font-medium">{uiText("Password changed successfully. Please use your new password next time you log in.")}</span>
                            </div>
                        )}
                        {uiText(error && (
                            <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 flex items-center gap-3 text-rose-800 dark:text-rose-200">
                                <AlertCircle size={20} className="shrink-0" />
                                <span className="text-sm font-medium">{uiError(error)}</span>
                            </div>
                        ))}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Current Password */}
                            <div>
                                <label htmlFor="currentPassword" className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{uiText("Current Password")}</label>
                                <div className="relative">
                                    <input
                                        id="currentPassword"
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label htmlFor="newPassword" className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{uiText("New Password")}</label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* Real-time requirements */}
                                {newPassword.length > 0 && (
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                        {[
                                            { met: rules.minLength, label: 'At least 5 characters' },
                                            { met: rules.hasUpper,  label: 'At least one uppercase letter' },
                                            { met: rules.hasLower,  label: 'At least one lowercase letter' },
                                            { met: rules.hasNumber, label: 'At least one number' },
                                        ].map(({ met, label }) => (
                                            <div key={label} className="flex items-center gap-2 text-xs">
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${met ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                    {met ? <CheckCircle size={11} /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                                                </div>
                                                <span className={met ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                                                    {uiText(label)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{uiText("Confirm New Password")}</label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full rounded-2xl border bg-slate-50 dark:bg-slate-950 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                            confirmPassword.length > 0
                                                ? confirmPassword === newPassword
                                                    ? 'border-emerald-400 dark:border-emerald-600'
                                                    : 'border-rose-400 dark:border-rose-600'
                                                : 'border-slate-200 dark:border-slate-800'
                                        }`}
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                                    <p className="mt-1.5 text-xs text-rose-500 font-medium">{uiText("Passwords do not match.")}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !allRulesMet || confirmPassword !== newPassword || !currentPassword}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{uiText("Updating...")}</>
                                ) : (
                                    <>
                                        <Lock size={16} />{uiText("Update Password")}</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
