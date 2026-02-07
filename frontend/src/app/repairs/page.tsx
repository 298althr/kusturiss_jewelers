'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { Hammer, Ruler, Sparkles, Shield } from 'lucide-react';

export default function RepairsPage() {
    return (
        <div className="pt-32 pb-24 min-h-screen bg-background">
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="text-center mb-16">
                        <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Master Craftsmanship</span>
                        <h1 className="text-5xl md:text-6xl font-heading text-foreground mb-6">Repairs & <span className="italic">Restoration</span></h1>
                        <p className="text-foreground/60 text-lg max-w-2xl mx-auto italic">
                            Honoring the heritage of your most treasured pieces through expert preservation.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Hammer size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Expert Repair</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Our in-house master jewelers handle everything from simple sizing to complex structural repairs. Every repair is performed on-site at our Sansom Street workshop under strict security.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Cleaning & Polishing</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Restore the original brilliance of your jewelry with our professional ultrasonic cleaning and hand-polishing services. We recommend a complimentary inspection every six months.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Ruler size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Appraisal Services</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Our GIA-certified gemologists provide comprehensive appraisals for insurance, estate planning, or private resale. Documentation includes high-resolution photography and market valuation.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-secondary/10 text-secondary">
                                    <Shield size={24} />
                                </div>
                                <h3 className="text-xl font-heading text-foreground">Stone Setting</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                Whether securing a loose diamond or mounting a family heirloom, our precision setting techniques ensure the longevity and safety of your stones.
                            </p>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-12 border border-secondary/20 text-center">
                        <h4 className="text-xl font-heading text-primary mb-4 italic">Ready to Restore?</h4>
                        <p className="text-sm text-foreground/60 mb-8 max-w-lg mx-auto">
                            Schedule a drop-off appointment or request a secure shipping kit for remote restoration services.
                        </p>
                        <a href="/consultation" className="inline-block bg-secondary text-primary px-10 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                            Book Service Appointment
                        </a>
                    </div>
                </motion.div>
            </Container>
        </div>
    );
}
