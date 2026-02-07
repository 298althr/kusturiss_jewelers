'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
    const pathname = usePathname();

    if (pathname?.startsWith('/admin')) {
        return null;
    }
    return (
        <footer className="bg-primary text-white pt-20 pb-10">
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Info */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-heading tracking-wider">Kusturiss Jewelers</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Excellence since 19xx. Philadelphia's premier destination for custom engagement rings and fine jewelry.
                        </p>
                        <div className="flex space-x-4">
                            <Link href="https://www.instagram.com/kusturissjewelers/" target="_blank" className="hover:text-secondary transition-colors"><Instagram size={20} /></Link>
                            <Link href="https://www.facebook.com/kusturissjewelers/" target="_blank" className="hover:text-secondary transition-colors"><Facebook size={20} /></Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-secondary">Collections</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link href="/products?cat=rings" className="hover:text-white transition-colors">Engagement Rings</Link></li>
                            <li><Link href="/products?cat=necklaces" className="hover:text-white transition-colors">High Jewelry</Link></li>
                            <li><Link href="/products?cat=watches" className="hover:text-white transition-colors">Timepieces</Link></li>
                            <li><Link href="/products?cat=custom" className="hover:text-white transition-colors">Bespoke Jewelry</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-secondary">Concierge</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                            <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping & Returns</Link></li>
                            <li><Link href="/repairs" className="hover:text-white transition-colors">Repairs & Services</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-secondary">Join The Legacy</h4>
                        <p className="text-gray-400 text-sm">Sign up for private previews and jewelry care insights.</p>
                        <form className="flex">
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="bg-transparent border-b border-gray-700 py-2 text-sm focus:border-secondary transition-colors outline-none flex-1"
                            />
                            <button type="submit" className="ml-4 text-xs font-bold uppercase tracking-widest hover:text-secondary transition-colors">Join</button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    <p>© {new Date().getFullYear()} Kusturiss Jewelers. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0 text-[10px]">
                        <span>727 Sansom St, Philadelphia, PA</span>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
}
