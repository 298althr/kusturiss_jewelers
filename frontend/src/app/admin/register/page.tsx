'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Loader2, AlertCircle, Fingerprint } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminRegister } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

export default function AdminRegisterPage() {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'admin',
    });

    const dispatch = useAppDispatch();
    const router = useRouter();
    const { loading, error } = useAppSelector((state) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(adminRegister(formData));
        if (adminRegister.fulfilled.match(result)) {
            router.push('/admin/login');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-24 pb-12 bg-[#F8F9FA]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden"
            >
                {/* Security Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <Shield size={200} />
                </div>

                <div className="text-center mb-10 relative z-10">
                    <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Fingerprint size={32} />
                    </div>
                    <h2 className="text-3xl font-heading mb-2">Vault Creation</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Administrative Access Activation</p>
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

                <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 py-2 text-sm focus:border-primary transition-colors outline-none bg-transparent"
                                placeholder="Admin"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full border-b border-gray-200 py-2 text-sm focus:border-primary transition-colors outline-none bg-transparent"
                                placeholder="User"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Secure Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full border-b border-gray-200 py-2 text-sm focus:border-primary transition-colors outline-none bg-transparent"
                            placeholder="admin@kusturiss.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Permission Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full border-b border-gray-200 py-2 text-sm focus:border-primary transition-colors outline-none bg-transparent appearance-none"
                        >
                            <option value="admin">Super Admin</option>
                            <option value="manager">Manager</option>
                            <option value="support">Support</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Access Key</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full border-b border-gray-200 py-2 text-sm focus:border-primary transition-colors outline-none bg-transparent"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Initialize Admin</span>}
                    </button>
                </form>

                <div className="mt-12 text-center relative z-10">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Already Registered? <Link href="/admin/login" className="text-secondary hover:underline ml-2">Secure Login</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
