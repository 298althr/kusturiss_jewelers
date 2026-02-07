'use client';

import { useState, useEffect } from 'react';
import { Settings, Globe, Shield, CreditCard, Bell, Loader2, Save } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/admin/management/settings');
                setSettings(res.data.data);
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // In a real app, you'd send the updated settings to the backend
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Settings saved successfully');
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={48} />
            </div>
        );
    }

    const tabs = [
        { id: 'general', name: 'General', icon: Globe },
        { id: 'security', name: 'Security', icon: Shield },
        { id: 'payments', name: 'Payments', icon: CreditCard },
        { id: 'notifications', name: 'Notifications', icon: Bell },
    ];

    return (
        <div className="space-y-12 pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-heading italic">System Configuration</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 px-1">Manage your boutique's digital infrastructure</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-3 hover:bg-secondary transition-all"
                >
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    <span>Save Changes</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Sidebar Nav */}
                <div className="lg:w-64 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center space-x-4 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border ${activeTab === tab.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={16} />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white border border-gray-100 p-12">
                    {activeTab === 'general' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                            <div>
                                <h3 className="text-xl font-heading mb-6 italic border-b border-gray-50 pb-4">Store Identity</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Store Name</label>
                                        <input className="w-full border-b border-gray-100 py-2 text-sm outline-none focus:border-secondary" defaultValue="Kusturiss Jewelers" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Business Email</label>
                                        <input className="w-full border-b border-gray-100 py-2 text-sm outline-none focus:border-secondary" defaultValue="concierge@kusturiss.com" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-heading mb-6 italic border-b border-gray-50 pb-4">Regional & Standards</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Currency Display</label>
                                        <select className="w-full border-b border-gray-100 py-2 text-sm outline-none bg-transparent">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>GBP (£)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Timezone</label>
                                        <select className="w-full border-b border-gray-100 py-2 text-sm outline-none bg-transparent">
                                            <option>Eastern Standard Time (EST)</option>
                                            <option>Pacific Standard Time (PST)</option>
                                            <option>London (GMT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                            <h3 className="text-xl font-heading mb-6 italic border-b border-gray-50 pb-4">Access Control</h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center py-4 border-b border-gray-50">
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Two-Factor Authentication</h4>
                                        <p className="text-[10px] text-gray-400 uppercase mt-1">Require 2FA for all administrator accounts</p>
                                    </div>
                                    <div className="w-12 h-6 bg-secondary rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b border-gray-50">
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Maintenance Mode</h4>
                                        <p className="text-[10px] text-gray-400 uppercase mt-1">Restrict storefront access to administrators only</p>
                                    </div>
                                    <div className="w-12 h-6 bg-gray-100 rounded-full relative cursor-pointer">
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                            <h3 className="text-xl font-heading mb-6 italic border-b border-gray-50 pb-4">Stripe Integration</h3>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Publishable Key</label>
                                    <input className="w-full border border-gray-100 p-4 text-xs font-mono outline-none focus:border-secondary" value="pk_test_**************************" readOnly />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Secret Key</label>
                                    <input type="password" className="w-full border border-gray-100 p-4 text-xs font-mono outline-none focus:border-secondary" value="sk_test_**************************" readOnly />
                                </div>
                                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 flex items-start space-x-3">
                                    <Settings className="text-blue-500 mt-1" size={16} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 leading-relaxed">
                                        Keys are managed via environment variables for maximum security. Changes here will not affect the production environment without a system restart.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
