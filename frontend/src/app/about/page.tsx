'use client';

import { Container } from '@/components/ui/Container';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function AboutPage() {
    return (
        <div className="pt-32 pb-24 bg-background">
            {/* Hero Header */}
            <section className="mb-24">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Our Story</span>
                        <h1 className="text-5xl md:text-7xl font-heading text-foreground mb-8">Philadelphia's <br /><span className="italic">Jewelry Legacy</span></h1>
                        <p className="text-foreground/80 text-lg leading-relaxed">
                            Founded on the belief that jewelry should be as unique as the individuals who wear it, Kusturiss Jewelers has been a beacon of craftsmanship on Jewelers' Row for over a decade.
                        </p>
                    </motion.div>
                </Container>
            </section>

            {/* Philosophy Section */}
            <section className="bg-primary/5 py-24 mb-24 backdrop-blur-sm">
                <Container>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-heading text-secondary">The Artisan Touch</h3>
                            <p className="text-sm text-foreground/60 leading-relaxed italic">Every piece is hand-finished in our Philadelphia workshop, ensuring the highest level of detail and quality.</p>
                        </div>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-heading text-secondary">Ethical Sourcing</h3>
                            <p className="text-sm text-foreground/60 leading-relaxed italic">We exclusively source conflict-free diamonds and recycled precious metals to ensure our legacy is a clean one.</p>
                        </div>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-heading text-secondary">Generational Craft</h3>
                            <p className="text-sm text-foreground/60 leading-relaxed italic">Our techniques blend old-world tradition with modern precision, creating pieces that stand the test of time.</p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Brand Imagery */}
            <section>
                <Container>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="relative h-[600px]">
                            <Image
                                src="https://images.unsplash.com/photo-1573408302185-30f197f90396?auto=format&fit=crop&q=80&w=800"
                                alt="Crafting"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="relative h-[600px] mt-12 md:mt-24">
                            <Image
                                src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800"
                                alt="Jewelry Detail"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    );
}
