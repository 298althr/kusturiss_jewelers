'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Package, Settings, LogOut, ChevronRight, ShieldCheck, Heart } from 'lucide-react';
import { logout } from '@/store/slices/authSlice';

export default function AccountPage() {
    const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);
    const router = useRouter();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, router]);

    if (loading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base">
                <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const handleLogout = () => {
        dispatch(logout());
        router.push('/');
    };

    const dashboardItems = [
        { icon: <Package size={20} />, label: 'Orders & Commissions', desc: 'Track your specialized orders', href: '/account/orders' },
        { icon: <Heart size={20} />, label: 'Private Wishlist', desc: 'Pieces secured for review', href: '/products' },
        { icon: <ShieldCheck size={20} />, label: 'Security & Vault', desc: 'Authentication and access', href: '/account/security' },
        { icon: <Settings size={20} />, label: 'Preferences', desc: 'Personalize your experience', href: '/account/settings' },
    ];

    return (
        <div className="min-h-screen bg-[#FBFBFD] pt-32 pb-24">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Sidebar - Profile Summary */}
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-10 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <div className="bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    Member since 2024
                                </div>
                            </div>

                            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/10">
                                <User size={40} className="text-primary" />
                            </div>
                            <h2 className="text-2xl font-heading text-primary">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{user?.email}</p>

                            <div className="mt-10 pt-8 border-t border-gray-50 flex justify-center space-x-8">
                                <div className="text-center">
                                    <p className="text-xl font-heading text-secondary">0</p>
                                    <p className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">Orders</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-heading text-secondary">0</p>
                                    <p className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">Wishlist</p>
                                </div>
                            </div>
                        </motion.div>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-3 py-4 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors border border-red-100 hover:bg-red-50"
                        >
                            <LogOut size={14} />
                            <span>Terminate Session</span>
                        </button>
                    </div>

                    {/* Right Content - Dashboard Grid */}
                    <div className="lg:col-span-8">
                        <div className="mb-12">
                            <h3 className="text-3xl font-heading text-primary mb-2">Heritage Dashboard</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Manage your engagement with Kusturiss</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {dashboardItems.map((item, idx) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group bg-white p-8 border border-gray-100 hover:border-secondary transition-all cursor-pointer relative"
                                >
                                    <div className="mb-6 text-primary group-hover:text-secondary transition-colors">
                                        {item.icon}
                                    </div>
                                    <h4 className="text-lg font-heading text-primary mb-1">{item.label}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.desc}</p>

                                    <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-0 group-hover:opacity-100 group-hover:right-8 transition-all">
                                        <ChevronRight size={16} className="text-secondary" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Recent Activity Mockup */}
                        <div className="mt-16 bg-white border border-gray-100 rounded-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                                <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Recent Communications</h5>
                                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">No New Alerts</span>
                            </div>
                            <div className="p-12 text-center text-gray-300 italic font-heading text-lg">
                                Your account is in perfect standing.
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
