'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
    });

    const dispatch = useAppDispatch();
    const router = useRouter();
    const { loading, error } = useAppSelector((state) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(register(formData));
        if (register.fulfilled.match(result)) {
            router.push('/');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-24 pb-12 bg-base">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white p-12 shadow-sm border border-gray-100"
            >
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-heading mb-2">Create Account</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Join the Kusturiss circle of excellence</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center space-x-3 text-red-700">
                        <AlertCircle size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">First Name</label>
                            <div className="relative">
                                <User className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full border-b border-gray-200 pl-6 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                    placeholder="John"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 pl-8 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                placeholder="nelson@kusturiss.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone (Optional)</label>
                        <div className="relative">
                            <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 pl-8 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 pl-8 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="text-[10px] text-gray-400 leading-relaxed italic">
                        By creating an account, you agree to our <Link href="/terms" className="text-secondary underline underline-offset-2">Terms of Service</Link> and <Link href="/privacy" className="text-secondary underline underline-offset-2">Privacy Policy</Link>.
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Create Account</span>}
                    </button>
                </form>

                <div className="mt-10 pt-10 border-t border-gray-100">
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Already have an account? <Link href="/login" className="text-secondary hover:underline">Log In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
