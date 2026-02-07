'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetPassword, clearError } from '@/store/slices/authSlice';
import Link from 'next/link';

import { Suspense } from 'react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [success, setSuccess] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (!token) {
            setLocalError('Invalid or missing reset token.');
        }
        dispatch(clearError());
    }, [token, dispatch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters.');
            return;
        }

        const result = await dispatch(resetPassword({ token, password }));
        if (resetPassword.fulfilled.match(result)) {
            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-20 bg-base">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden"
            >
                {success ? (
                    <div className="text-center space-y-8 py-10">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={40} className="text-green-600" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-heading">Vault Secured</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                Your passkey has been updated. <br /> Redirecting to authentication...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-3xl font-heading mb-2">Initialize New Key</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center">Secure your Kusturiss account</p>
                        </div>

                        {(error || localError) && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-8 p-4 bg-red-50 border-l-2 border-red-500 flex items-center space-x-3 text-red-700"
                            >
                                <AlertCircle size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{error || localError}</span>
                            </motion.div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                className="w-full bg-primary text-white py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Update Passkey</span>}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center pt-20 bg-base">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
