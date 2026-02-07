'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, Lock, Loader2, AlertCircle, Fingerprint } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogin } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const dispatch = useAppDispatch();
    const router = useRouter();
    const { loading, error } = useAppSelector((state) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(adminLogin(formData));
        if (adminLogin.fulfilled.match(result)) {
            router.push('/admin/dashboard');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-24 pb-12 bg-primary">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white p-12 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-hidden"
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />

                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/10">
                        <Fingerprint size={40} className="text-primary" />
                    </div>
                    <h2 className="text-4xl font-heading mb-3">Admin Console</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">Proprietary Access Only</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-10 p-5 bg-red-50 border border-red-100 flex items-center space-x-4 text-red-600 shadow-sm"
                    >
                        <ShieldAlert size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{error}</span>
                    </motion.div>
                )}

                <form className="space-y-8" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Security Identity</label>
                        <div className="relative group">
                            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full border-b border-gray-100 pl-8 py-3 text-sm focus:border-primary transition-all outline-none bg-transparent"
                                placeholder="name@kusturiss.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Access Key</label>
                            <Link href="/forgot-password" className="text-[9px] font-bold uppercase tracking-widest text-secondary hover:underline">Reset Key</Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full border-b border-gray-100 pl-8 py-3 text-sm focus:border-primary transition-all outline-none bg-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-6 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all flex items-center justify-center space-x-4 shadow-[0_15px_30px_rgba(0,0,0,0.1)] group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>INITIALIZE SESSION</span>
                                    <div className="w-2 h-px bg-white/30 group-hover:w-4 transition-all" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-16 text-center border-t border-gray-50 pt-10">
                    <Link href="/admin/register" className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline">Authorized New User Registration</Link>
                </div>

                {/* Footnote */}
                <p className="mt-10 text-[9px] text-gray-300 uppercase tracking-widest text-center">
                    Authorized users only. All access attempts are <br /> monitored and logged by Kusturiss security.
                </p>
            </motion.div>
        </div>
    );
}
