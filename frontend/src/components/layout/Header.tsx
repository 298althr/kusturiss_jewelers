'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, Search, Menu, X } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleCart } from '@/store/slices/cartSlice';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dispatch = useAppDispatch();
    const { totalQuantity } = useAppSelector((state) => state.cart);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (pathname?.startsWith('/admin')) {
        return null;
    }

    const navLinks = [
        { name: 'bespoke', href: '/products?category=bespoke' },
        { name: 'Collections', href: '/products' },
        { name: 'Engagement', href: '/products?category=engagement' },
        { name: 'Our Heritage', href: '/about' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-[90] transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-8'
                }`}
        >
            <Container>
                <div className="flex items-center justify-between">
                    {/* Mobile Menu Toggle */}
                    <button
                        className="lg:hidden text-primary p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Navigation Links - Desktop */}
                    <nav className="hidden lg:flex items-center space-x-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6b6b] hover:text-secondary transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Logo */}
                    <Link href="/" className="absolute left-1/2 -translate-x-1/2 text-center group">
                        <h1 className="text-2xl md:text-3xl font-heading tracking-[0.2em] text-[#6b6b6b] transition-all group-hover:tracking-[0.25em]">
                            KUSTURISS
                        </h1>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-[0.5em] text-secondary font-bold mt-1">JEWELERS</p>
                    </Link>

                    {/* Action Icons */}
                    <div className="flex items-center space-x-4 md:space-x-8">
                        <button className="hidden sm:block text-[#6b6b6b] hover:text-secondary transition-colors">
                            <Search size={20} />
                        </button>
                        <Link
                            href={isAuthenticated ? "/account" : "/login"}
                            className="text-[#6b6b6b] hover:text-secondary transition-colors flex items-center space-x-2"
                        >
                            <User size={20} />
                            {isAuthenticated && user && (
                                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">{user.firstName}</span>
                            )}
                        </Link>
                        <button
                            onClick={() => dispatch(toggleCart())}
                            className="text-[#6b6b6b] hover:text-secondary transition-colors relative"
                        >
                            <ShoppingBag size={20} />
                            {totalQuantity > 0 && (
                                <span className="absolute -top-2 -right-2 bg-secondary text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                                    {totalQuantity}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </Container>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
                    >
                        <div className="px-8 py-12 flex flex-col space-y-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
