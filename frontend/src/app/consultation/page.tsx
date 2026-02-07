'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';

export default function ConsultationPage() {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        appointment_date: '',
        type: 'in-person',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/consultations/book', formData);
            setSuccess(true);
        } catch (err) {
            console.error('Booking failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (success) {
        return (
            <div className="pt-40 pb-24 min-h-screen flex items-center justify-center bg-base">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xl mx-auto text-center bg-white p-16 shadow-lg border border-gray-100"
                    >
                        <CheckCircle2 className="mx-auto text-secondary mb-8" size={64} />
                        <h1 className="text-4xl font-heading mb-6">Reservation Confirmed</h1>
                        <p className="text-gray-600 mb-10 leading-relaxed">
                            Your appointment has been scheduled. A Kusturiss curator will reach out shortly to finalize the details of your private viewing.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-primary text-white px-12 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all"
                        >
                            Return Home
                        </button>
                    </motion.div>
                </Container>
            </div>
        );
    }

    return (
        <div className="pt-40 pb-24 bg-base min-h-screen">
            <Container>
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        {/* Info Section */}
                        <div className="space-y-12">
                            <div>
                                <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Private Client Services</span>
                                <h1 className="text-5xl md:text-6xl font-heading text-primary leading-tight">Private Consultations</h1>
                                <p className="text-gray-500 mt-6 text-lg leading-relaxed italic">
                                    Experience the pinnacle of luxury with a personalized viewing of our most exclusive collections.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-start space-x-6">
                                    <div className="bg-white p-4 shadow-sm border border-gray-50 text-secondary">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">In-Person Viewing</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Join us at our Historic District flagship for an immersive, tactile experience.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-6">
                                    <div className="bg-white p-4 shadow-sm border border-gray-50 text-secondary">
                                        <Video size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Virtual Concierge</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Expert guidance from the comfort of your home, via high-definition video link.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary p-10 text-white space-y-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Curator Note</p>
                                <p className="text-xl font-heading italic leading-relaxed">
                                    "Each piece in our collection tells a story. Our goal is to help you find the one that resonates with your personal legacy."
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest">— Nelson Kusturiss, Master Jeweler</p>
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className="bg-white p-12 shadow-sm border border-gray-100">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">First Name</label>
                                        <input
                                            name="first_name"
                                            required
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                            placeholder="Alexander"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Last Name</label>
                                        <input
                                            name="last_name"
                                            required
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                            placeholder="Hamilton"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                        placeholder="alex@hamilton.com"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-2 mb-4 bg-gray-50 py-2">Consultation Details</label>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Appointment Type</label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleChange}
                                                className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none bg-transparent"
                                            >
                                                <option value="in-person">Showroom Viewing</option>
                                                <option value="virtual">Virtual Concierge</option>
                                                <option value="corporate">Corporate Gifting & Partnership</option>
                                                <option value="ceremonial">Ceremonial Engagement Prep</option>
                                                <option value="surprise">Surprise & Proposal Planning</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Preferred Date</label>
                                            <input
                                                name="appointment_date"
                                                type="datetime-local"
                                                required
                                                value={formData.appointment_date}
                                                onChange={handleChange}
                                                className="w-full border-b border-gray-200 py-2 text-sm focus:border-secondary transition-colors outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Personal Requests or Interests</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full border border-gray-200 p-4 text-sm focus:border-secondary transition-colors outline-none resize-none"
                                        placeholder="Tell us about the occasion or specific pieces you wish to view..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-6 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-secondary transition-all flex items-center justify-center space-x-4"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Request Invitation</span>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
