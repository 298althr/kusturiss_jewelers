'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Package,
    ShoppingBag,
    Users,
    ShieldAlert,
    Settings,
    LogOut,
    Bell,
    Star,
    TrendingUp
} from 'lucide-react';

const navItems = [
    { name: 'Overview', href: '/admin', icon: BarChart3 },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Concierge', href: '/admin/concierge', icon: Star },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Metrics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Fraud Center', href: '/admin/fraud', icon: ShieldAlert },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-primary text-white flex flex-col fixed inset-y-0 z-50">
                <div className="p-8 border-b border-gray-800">
                    <h2 className="text-xl font-heading tracking-widest text-secondary">Admin Console</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Kusturiss Jewelers</p>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${isActive ? 'bg-secondary text-primary' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Icon size={18} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button className="flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-400 transition-all w-full">
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-12">
                {/* Header Bar */}
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-2xl font-heading text-primary">System Command</h1>
                    <div className="flex items-center space-x-6">
                        <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                        <div className="flex items-center space-x-3 text-right">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-primary">Master Admin</p>
                                <p className="text-[10px] text-gray-400">Security Clearance: L5</p>
                            </div>
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-primary font-bold">
                                AD
                            </div>
                        </div>
                    </div>
                </div>

                {children}
            </main>
        </div>
    );
}
