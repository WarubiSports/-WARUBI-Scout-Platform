import React, { useState, useEffect } from 'react';
import { DollarSign, Save, XCircle, Loader2 } from 'lucide-react';
import { useAdminAgreements } from '../hooks/useAdminAgreements';

interface AdminAgreementPanelProps {
    scoutId: string;
    scoutName: string;
}

const AdminAgreementPanel: React.FC<AdminAgreementPanelProps> = ({ scoutId, scoutName }) => {
    const { getAgreementForScout, upsertAgreement, deactivateAgreement, saving } = useAdminAgreements();
    const agreement = getAgreementForScout(scoutId);

    const [form, setForm] = useState({
        currency: 'EUR' as 'EUR' | 'USD',
        rate_full_season: 5000,
        rate_6_months: 3000,
        rate_3_months: 2000,
        rate_1_month: '' as string | number,
        min_placements_per_year: 4,
        agreement_start: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        if (agreement) {
            setForm({
                currency: agreement.currency,
                rate_full_season: agreement.rate_full_season,
                rate_6_months: agreement.rate_6_months,
                rate_3_months: agreement.rate_3_months,
                rate_1_month: agreement.rate_1_month ?? '',
                min_placements_per_year: agreement.min_placements_per_year,
                agreement_start: agreement.agreement_start,
                notes: agreement.notes || '',
            });
        }
    }, [agreement]);

    const handleSave = async () => {
        try {
            await upsertAgreement({
                scoutId,
                data: {
                    currency: form.currency,
                    rate_full_season: form.rate_full_season,
                    rate_6_months: form.rate_6_months,
                    rate_3_months: form.rate_3_months,
                    rate_1_month: form.rate_1_month === '' ? null : Number(form.rate_1_month),
                    min_placements_per_year: form.min_placements_per_year,
                    agreement_start: form.agreement_start,
                    notes: form.notes || null,
                    is_active: true,
                },
            });
        } catch (err) {
            alert('Failed to save agreement: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleDeactivate = async () => {
        if (!agreement) return;
        if (!confirm(`Deactivate agreement for ${scoutName}?`)) return;
        try {
            await deactivateAgreement(agreement.id);
        } catch (err) {
            alert('Failed to deactivate: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    return (
        <div className="border border-gray-200 rounded-xl p-4 mt-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                    <DollarSign size={14} className="text-green-600" /> TDRF Agreement
                </h4>
                {agreement && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">Active</span>
                )}
                {!agreement && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-500 uppercase">None</span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Currency</label>
                    <div className="flex gap-1">
                        {(['EUR', 'USD'] as const).map(c => (
                            <button
                                key={c}
                                onClick={() => setForm({ ...form, currency: c })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                    form.currency === c
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                    <input
                        type="date"
                        value={form.agreement_start}
                        onChange={e => setForm({ ...form, agreement_start: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                    { key: 'rate_full_season', label: 'Full Season' },
                    { key: 'rate_6_months', label: '6 Months' },
                    { key: 'rate_3_months', label: '3 Months' },
                    { key: 'rate_1_month', label: '1 Month' },
                ].map(({ key, label }) => (
                    <div key={key}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
                        <input
                            type="number"
                            value={(form as any)[key]}
                            onChange={e => setForm({ ...form, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder={key === 'rate_1_month' ? 'N/A' : '0'}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Min Placements/Year</label>
                    <input
                        type="number"
                        value={form.min_placements_per_year}
                        onChange={e => setForm({ ...form, min_placements_per_year: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes</label>
                    <input
                        type="text"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Optional notes"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {agreement ? 'Update' : 'Create'} Agreement
                </button>
                {agreement && (
                    <button
                        onClick={handleDeactivate}
                        disabled={saving}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                        <XCircle size={14} /> Deactivate
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdminAgreementPanel;
