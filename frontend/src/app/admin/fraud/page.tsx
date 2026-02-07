'use client';

import { ShieldAlert, AlertCircle, CheckCircle2, MapPin, Globe, Fingerprint } from 'lucide-react';

const alerts = [
    { id: '1', order: '#KJ-82751', risk: 88, reason: 'High-value transaction from new overseas proxy', customer: 'Septimius S.', status: 'Pending Review' },
    { id: '2', order: '#KJ-82745', risk: 42, reason: 'Mismatched CVV on initial attempt', customer: 'Vespasian T.', status: 'Escalated' },
];

export default function AdminFraudCenter() {
    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading italic">Fraud & Risk Command</h2>
                <div className="flex space-x-4">
                    <div className="bg-red-50 text-red-600 px-6 py-3 rounded-lg flex items-center space-x-3">
                        <ShieldAlert size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">2 High Risk Alerts</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Alerts List */}
                <div className="lg:col-span-2 space-y-6">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="bg-white p-8 shadow-sm border border-red-100 hover:border-red-300 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
                                        {alert.risk}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-heading text-primary">{alert.order}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{alert.customer}</p>
                                    </div>
                                </div>
                                <button className="bg-primary text-white px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-secondary transition-colors">
                                    Investigate
                                </button>
                            </div>

                            <div className="p-4 bg-gray-50 text-xs text-gray-600 border-l-4 border-red-500 mb-6 italic leading-relaxed">
                                "{alert.reason}"
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="flex items-center space-x-3 text-gray-400">
                                    <Globe size={16} />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">IP: 184.22.x.x (ROU)</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-400">
                                    <Fingerprint size={16} />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Device ID: 827-XJ</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-400">
                                    <MapPin size={16} />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Dist: 4,800 mi</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Risk Insights */}
                <div className="bg-white p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-heading italic mb-8">Risk Intelligence</h3>
                    <div className="space-y-10">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Risk Distribution</p>
                            <div className="flex items-end space-x-2 h-32">
                                {[40, 70, 20, 90, 50, 30].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gray-100 rounded-t group relative">
                                        <div className="absolute bottom-0 w-full bg-red-400 rounded-t transition-all duration-500 hover:bg-red-500" style={{ height: `${h}%` }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">System Signal</p>
                            <div className="flex items-center space-x-4 bg-green-50 p-4 rounded-lg">
                                <CheckCircle2 className="text-green-600" size={20} />
                                <span className="text-[10px] font-bold uppercase text-green-700">All Nodes Operational</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
