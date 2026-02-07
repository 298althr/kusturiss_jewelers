'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { forgotPassword, clearError } from '@/store/slices/authSlice';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(forgotPassword(email));
        if (forgotPassword.fulfilled.match(result)) {
            setSubmitted(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-20 bg-base">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden"
            >
                {submitted ? (
                    <div className="text-center space-y-8 py-10">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={40} className="text-green-600" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-heading">Link Dispatched</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                Please check your inbox for instructions to <br /> secure your access.
                            </p>
                        </div>
                        <div className="pt-6">
                            <Link
                                href="/login"
                                className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline"
                            >
                                <ArrowLeft size={12} />
                                <span>Return to Login</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-heading mb-2">Heritage Recovery</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Lost Access Assistance</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-8 p-4 bg-red-50 border-l-2 border-red-500 flex items-center space-x-3 text-red-700"
                            >
                                <AlertCircle size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{error}</span>
                            </motion.div>
                        )}

                        <form className="space-y-8" onSubmit={handleSubmit}>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vault Identity (Email)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border-b border-gray-100 py-3 text-sm focus:border-secondary transition-all outline-none bg-transparent"
                                    placeholder="name@example.com"
                                    required
                                />
                                <p className="text-[9px] text-gray-400 italic">We'll send a secure recovery link if an account is found.</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all flex items-center justify-center space-x-3 shadow-lg transform active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Dispatch Link</span>}
                                </button>
                            </div>
                        </form>

                        <div className="mt-12 text-center">
                            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest text-[#B5915F] hover:underline">Support Contact</Link>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
