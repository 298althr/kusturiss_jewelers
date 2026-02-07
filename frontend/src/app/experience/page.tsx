'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { Heart, Gift, Briefcase, Sparkles, MapPin, ChevronRight, PhoneCall } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ExperiencePage() {
    const services = [
        {
            title: 'Proposal Planning',
            description: 'Beyond the ring. We coordinate with local florists and private venues to create the perfect "Yes" moment.',
            icon: Heart,
            image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800',
            color: 'bg-red-50'
        },
        {
            title: 'The "Surprise" Delivery',
            description: 'Hand-delivered by a curator with fresh florals and a personalized note. Pure magic, delivered to her door.',
            icon: Sparkles,
            image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800',
            color: 'bg-secondary/5'
        },
        {
            title: 'Corporate Excellence',
            description: 'Bulk gifting for executives and milestones. Custom branding and white-glove delivery for your top talent.',
            icon: Briefcase,
            image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800',
            color: 'bg-primary/5'
        }
    ];

    return (
        <div className="pt-40 pb-24 bg-base min-h-screen">
            <Container>
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto mb-24">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block"
                    >
                        Signature Services
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-6xl font-heading mb-8"
                    >
                        The Kusturiss Experience
                    </motion.h1>
                    <p className="text-gray-500 text-lg italic leading-relaxed">
                        Jewelry is an heirloom; the moment is a legacy. Our concierge team elevates your purchase into an unforgettable event.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
                    {services.map((service, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group flex flex-col bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500"
                        >
                            <div className="relative h-64 overflow-hidden">
                                <Image src={service.image} alt={service.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors" />
                            </div>
                            <div className="p-10 flex flex-col flex-1">
                                <div className={`w-12 h-12 ${service.color} flex items-center justify-center mb-6`}>
                                    <service.icon size={24} className="text-primary" />
                                </div>
                                <h3 className="text-2xl font-heading mb-4 italic">{service.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed mb-8 flex-1">{service.description}</p>
                                <Link
                                    href={`/experience/book?type=${service.title.toLowerCase().replace(' ', '_')}`}
                                    className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-primary group-hover:text-secondary transition-colors"
                                >
                                    <span>Curate This Moment</span>
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Corporate Trust Section */}
                <div className="bg-primary p-16 md:p-24 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                        <Gift className="w-full h-full -rotate-12 translate-x-1/2 translate-y-1/2" />
                    </div>

                    <div className="max-w-2xl relative z-10">
                        <h2 className="text-4xl font-heading mb-6 italic">Corporate Heritage Services</h2>
                        <p className="text-gray-300 mb-10 leading-relaxed">
                            We partner with leading firms across the Historic District to provide employee recognition programs and executive milestone gifts that reflect corporate prestige.
                        </p>
                        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                            <button className="bg-white text-primary px-10 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary hover:text-white transition-all">
                                Open Corporate Account
                            </button>
                            <button className="border border-white/20 px-10 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-3">
                                <PhoneCall size={16} />
                                <span>Speak with a Concierge</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
