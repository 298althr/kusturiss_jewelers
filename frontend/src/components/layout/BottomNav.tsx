'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Heart, User } from 'lucide-react';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Maison', href: '/', icon: Home },
        { name: 'Browse', href: '/products', icon: Compass },
        { name: 'Curated', href: '/curated', icon: Heart },
        { name: 'Account', href: '/account', icon: User },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-[100] px-6 py-3">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center space-y-1 transition-all ${isActive ? 'text-secondary scale-110' : 'text-gray-400 opacity-60'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'fill-secondary/20' : ''} />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
