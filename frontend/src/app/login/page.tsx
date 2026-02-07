'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Fingerprint } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { loading, error } = useAppSelector((state: any) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(login({ email, password }));
        if (login.fulfilled.match(result)) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-20 bg-[#FBFBFD]">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden"
            >
                {/* Security Badge */}
                <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                        <ShieldCheck size={12} className="text-green-600" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-700">Encrypted</span>
                    </div>
                </div>

                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Fingerprint size={32} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-heading mb-2">Heritage Access</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Secure Authentication Gateway</p>
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
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vault Identity</label>
                        <div className="relative group">
                            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-secondary transition-colors" size={16} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border-b border-gray-100 pl-8 py-3 text-sm focus:border-secondary transition-all outline-none bg-transparent"
                                placeholder="Email Address"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Security Pass</label>
                            <Link href="/forgot-password" title="Recovery" className="text-[10px] text-gray-400 hover:text-secondary uppercase font-bold tracking-widest transition-colors shadow-none">Recovery</Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-secondary transition-colors" size={16} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border-b border-gray-100 pl-8 py-3 text-sm focus:border-secondary transition-all outline-none bg-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all flex items-center justify-center space-x-3 shadow-lg transform active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Initialize Session</span>}
                        </button>
                    </div>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        Authorized users only. All access attempts are <br /> Monitored and logged by Kusturiss Security.
                    </p>
                    <div className="mt-8">
                        <Link href="/register" className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline">Request New Account</Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
