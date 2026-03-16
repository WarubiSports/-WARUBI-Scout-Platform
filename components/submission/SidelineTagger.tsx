import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';

interface SidelineTaggerProps {
    fieldInput: string;
    setFieldInput: (input: string) => void;
    loading: boolean;
    onCancel: () => void;
    onSubmit: (data: string) => void;
}

export const SidelineTagger: React.FC<SidelineTaggerProps> = ({
    fieldInput,
    setFieldInput,
    loading,
    onCancel,
    onSubmit,
}) => (
    <div className="p-16 max-w-2xl mx-auto animate-fade-in h-full flex flex-col justify-center">
        <div className="text-center mb-10"><h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sideline Tagger</h3></div>
        <div className="bg-scout-800 rounded-[2.5rem] border-2 border-scout-700 p-8 shadow-2xl focus-within:border-scout-accent">
            <textarea autoFocus value={fieldInput} onChange={e => setFieldInput(e.target.value)} className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder-gray-700 h-40" placeholder="e.g. #9, ST, Leo Silva, Fast, 2026..." />
        </div>
        <div className="flex gap-4 mt-8">
            <button onClick={onCancel} className="flex-1 py-5 bg-scout-800 text-gray-400 font-black rounded-2xl">Cancel</button>
            <button onClick={() => onSubmit(fieldInput)} disabled={loading || !fieldInput.trim()} className="flex-[2] py-5 bg-scout-accent text-scout-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 size={24} /> Run AI Magic</>}
            </button>
        </div>
    </div>
);
