'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Search, MapPin, Flower2, Music, Truck, Phone, Star, ExternalLink, Loader2 } from 'lucide-react';

export default function AdminConciergeManager() {
    const [zipSearch, setZipSearch] = useState('20001'); // DC Area Default
    const [loading, setLoading] = useState(false);

    // Simulated local partners
    const partners = [
        { name: 'District Blooms', category: 'Florist', distance: '0.4 miles', rating: 4.8, contact: '(202) 555-0123', status: 'Preferred Partner' },
        { name: 'Capital Petals', category: 'Florist', distance: '1.2 miles', rating: 4.5, contact: '(202) 555-0987', status: 'Vetted' },
        { name: 'Classic Cellist Duo', category: 'Music', distance: '2.5 miles', rating: 5.0, contact: '(202) 555-1122', status: 'Waitlist' },
        { name: 'Vintage Limo DC', category: 'Transport', distance: '3.1 miles', rating: 4.7, contact: '(202) 555-4433', status: 'Preferred Partner' },
    ];

    const handleSearch = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    return (
        <div className="space-y-12 pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-heading italic">Concierge & Surprise Coordinator</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 px-1">Coordinate high-touch luxury moments with local partners</p>
                </div>
                <button className="bg-primary text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all">
                    New Event File
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left: Active Requests */}
                <div className="lg:col-span-2 space-y-8">
                    <h3 className="text-[12px] font-bold uppercase tracking-widest text-primary border-b border-gray-100 pb-4">Active Experience Requests</h3>
                    <div className="space-y-6">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white p-8 border border-gray-100 shadow-sm space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-4 ${i === 1 ? 'bg-red-50 text-red-500' : 'bg-secondary/5 text-secondary'} rounded`}>
                                            {i === 1 ? <Star size={24} /> : <Truck size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-primary">{i === 1 ? 'Proposal Prep' : 'Surprise Anniversary'}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Order #KJ-992{i} • Jan 12, 2026</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-yellow-50 text-yellow-600 rounded">Coordination Needed</span>
                                </div>

                                <div className="p-6 bg-gray-50 rounded space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Client Vision</p>
                                    <p className="text-sm text-gray-600 italic">"I want to propose at the Lincoln Memorial. Looking for someone to have a dozen red roses ready at 6 PM sharp."</p>
                                </div>

                                <div className="flex space-x-4">
                                    <button className="flex-1 border border-primary text-primary py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Assign Florist</button>
                                    <button className="flex-1 bg-primary text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary">Assign Transport</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Partner Discovery Tool */}
                <div className="space-y-8">
                    <div className="bg-white p-8 border border-gray-100 shadow-sm sticky top-32">
                        <h3 className="text-[12px] font-bold uppercase tracking-widest text-primary mb-8">Local Partner Discovery</h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search Radius (ZIP)</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={zipSearch}
                                        onChange={(e) => setZipSearch(e.target.value)}
                                        className="flex-1 border border-gray-100 px-4 py-3 text-sm outline-none focus:border-secondary"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        className="p-3 bg-secondary text-white hover:bg-primary transition-colors"
                                    >
                                        <Search size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4">
                                {['Florists', 'Music', 'Venues', 'Catering'].map((cat) => (
                                    <button key={cat} className="px-4 py-2 bg-gray-50 border border-gray-100 text-[9px] font-bold uppercase tracking-widest text-primary hover:border-secondary transitoin-colors">
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-8 space-y-6">
                                {loading ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-secondary" size={32} />
                                    </div>
                                ) : (
                                    partners.map((p, idx) => (
                                        <div key={idx} className="group pb-6 border-b border-gray-50 last:border-0 hover:border-secondary transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-primary group-hover:text-secondary">{p.name}</h4>
                                                <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{p.status}</span>
                                            </div>
                                            <div className="flex items-center space-x-4 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                <span className="flex items-center space-x-1"><MapPin size={10} /> <span>{p.distance}</span></span>
                                                <span className="flex items-center space-x-1 text-secondary"><Star size={10} fill="currentColor" /> <span>{p.rating}</span></span>
                                            </div>
                                            <div className="mt-4 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-primary hover:text-secondary"><Phone size={14} /></button>
                                                <button className="text-primary hover:text-secondary"><ExternalLink size={14} /></button>
                                                <button className="ml-auto text-primary hover:underline text-[9px] uppercase font-black">Book Integration</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
