'use client';

import { useEffect, useState } from 'react';
import { Calendar, Mail, Phone, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminConsultations() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/consultations/admin/all');
                setData(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading italic">Consultation Schedule</h2>
                <div className="flex space-x-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/5 px-4 py-2 border border-secondary/10">
                        {data.filter(c => c.status === 'pending').length} Pending Requests
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {data.map((item) => (
                    <div key={item.id} className="bg-white p-8 shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between lg:items-center gap-8">
                        <div className="flex items-center space-x-8">
                            <div className="w-16 h-16 bg-gray-50 flex flex-col items-center justify-center text-primary border border-gray-100">
                                <span className="text-[10px] font-bold uppercase">{new Date(item.appointment_date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-xl font-medium">{new Date(item.appointment_date).getDate()}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-2">{item.first_name} {item.last_name}</h3>
                                <div className="flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    <span className="flex items-center space-x-1"><Mail size={12} /> <span>{item.email}</span></span>
                                    <span className="flex items-center space-x-1"><Phone size={12} /> <span>{item.phone || 'No Phone'}</span></span>
                                    <span className="flex items-center space-x-1"><Clock size={12} /> <span>{new Date(item.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Type</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest bg-gray-50 px-3 py-1">{item.type}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Status</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded ${item.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                                        item.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button className="p-3 text-green-600 hover:bg-green-50 transition-colors border border-green-100">
                                    <CheckCircle size={20} />
                                </button>
                                <button className="p-3 text-red-500 hover:bg-red-50 transition-colors border border-red-100">
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
