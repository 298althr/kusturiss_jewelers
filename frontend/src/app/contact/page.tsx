'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="pt-40 pb-24 bg-background">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {/* Contact Info */}
                    <div>
                        <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Concierge</span>
                        <h1 className="text-6xl font-heading text-foreground mb-12 italic">Get In Touch</h1>

                        <div className="space-y-10">
                            <div className="flex items-start space-x-6">
                                <div className="bg-secondary/10 p-4 rounded-full text-secondary">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs mb-2 text-foreground/80">Flagship Showroom</h4>
                                    <p className="text-foreground/60 text-sm">727 Sansom St,<br />Philadelphia, PA 19106</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-6">
                                <div className="bg-secondary/10 p-4 rounded-full text-secondary">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs mb-2 text-foreground/80">Direct Line</h4>
                                    <p className="text-foreground/60 text-sm">(215) 555-0123</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-6">
                                <div className="bg-secondary/10 p-4 rounded-full text-secondary">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs mb-2 text-foreground/80">Email Inquiries</h4>
                                    <p className="text-foreground/60 text-sm">bespoke@kusturiss.com</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-6">
                                <div className="bg-secondary/10 p-4 rounded-full text-secondary">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs mb-2 text-foreground/80">Showroom Hours</h4>
                                    <p className="text-foreground/60 text-sm">Mon - Sat: 10am - 6pm<br />Sunday: By Appointment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-primary/5 p-12 shadow-sm border border-secondary/20 backdrop-blur-sm">
                        <h3 className="text-2xl font-heading mb-8 text-foreground italic">Book a Consultation</h3>
                        <form className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">First Name</label>
                                    <input type="text" className="w-full bg-background/50 border border-secondary/20 px-4 py-3 text-sm focus:border-secondary transition-colors outline-none text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Last Name</label>
                                    <input type="text" className="w-full bg-background/50 border border-secondary/20 px-4 py-3 text-sm focus:border-secondary transition-colors outline-none text-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Email Address</label>
                                <input type="email" className="w-full bg-background/50 border border-secondary/20 px-4 py-3 text-sm focus:border-secondary transition-colors outline-none text-foreground" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Message</label>
                                <textarea rows={4} className="w-full bg-background/50 border border-secondary/20 px-4 py-3 text-sm focus:border-secondary transition-colors outline-none resize-none text-foreground" />
                            </div>
                            <button className="w-full bg-secondary text-primary py-4 text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform hover:-translate-y-1">
                                Send Inquiry
                            </button>
                        </form>
                    </div>
                </div>
            </Container>
        </div>
    );
}
