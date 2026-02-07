'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
    return (
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-primary">
            {/* Background Image / Placeholder */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-60 scale-105"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&q=80&w=2070")',
                    filter: 'brightness(0.7)'
                }}
            />

            {/* Content */}
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-3xl">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-4 block"
                    >
                        Since 19xx | Philadelphia, PA
                    </motion.span>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-7xl lg:text-8xl text-white font-heading leading-tight mb-8"
                    >
                        Timeless <br />
                        <span className="italic text-secondary">Elegance</span>, <br />
                        Crafted for <br />
                        Legacy.
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="flex flex-wrap gap-6"
                    >
                        <Link
                            href="/products"
                            className="bg-[#3d333d] text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-secondary hover:text-primary transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Shop Collection
                        </Link>
                        <Link
                            href="/about"
                            className="border border-white/30 text-white backdrop-blur-sm px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-primary transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Our Heritage
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50 space-y-2"
            >
                <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
            </motion.div>
        </section>
    );
}
