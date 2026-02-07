'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { Truck, RotateCcw, ShieldCheck, Globe } from 'lucide-react';

export default function ShippingPage() {
    return (
        <div className="pt-32 pb-24 min-h-screen bg-background">
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="text-center mb-16">
                        <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Concierge Services</span>
                        <h1 className="text-5xl md:text-6xl font-heading text-foreground mb-6">Shipping & <span className="italic">Returns</span></h1>
                        <p className="text-foreground/60 text-lg max-w-2xl mx-auto italic">
                            Ensuring your precious acquisitions arrive with the discretion and security they deserve.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Truck size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Complimentary Shipping</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Kusturiss Jewelers offers complimentary, fully insured overnight shipping on all domestic orders over $1,000. Each piece is hand-packed in our signature boutique packaging and shipped via armored courier.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Secure Handling</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                For your security, all shipments require an adult signature upon delivery. We do not ship to P.O. boxes or freight forwarding addresses to ensure the chain of custody remains intact.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Globe size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">International Delivery</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                We facilitate global acquisitions through specialized white-glove logistics partners. International duties and taxes are calculated at checkout to ensure seamless transit.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <RotateCcw size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Returns Policy</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Bespoke creations and altered pieces are considered final sale. Ready-to-wear items may be returned within 14 days of receipt in original condition for store credit or exchange.
                            </p>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-12 border border-secondary/20 text-center">
                        <h4 className="text-xl font-heading text-primary mb-4 italic">Need further assistance?</h4>
                        <p className="text-sm text-foreground/60 mb-8 max-w-lg mx-auto">
                            Our logistical specialists are available to coordinate specific delivery windows or private vault pickups.
                        </p>
                        <a href="/contact" className="inline-block text-xs font-bold uppercase tracking-widest border-b border-primary pb-1 hover:text-secondary hover:border-secondary transition-colors text-foreground">
                            Contact Logistical Support
                        </a>
                    </div>
                </motion.div>
            </Container>
        </div>
    );
}
