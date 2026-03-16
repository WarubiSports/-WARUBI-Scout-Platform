import React, { useRef } from 'react';
import { FileUp, Link, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Player, PlayerStatus } from '../../types';

interface BulkImportPanelProps {
    bulkPlayers: Partial<Player>[];
    setBulkPlayers: React.Dispatch<React.SetStateAction<Partial<Player>[]>>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    rosterUrl: string;
    setRosterUrl: (url: string) => void;
    onAddPlayer: (player: Player) => any;
    onClose: () => void;
    onBack: () => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRosterUrlExtract: () => void;
    handleAddAllBulk: () => void;
}

export const BulkImportPanel: React.FC<BulkImportPanelProps> = ({
    bulkPlayers,
    setBulkPlayers,
    loading,
    rosterUrl,
    setRosterUrl,
    onBack,
    handleFileUpload,
    handleRosterUrlExtract,
    handleAddAllBulk,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } } as any;
            handleFileUpload(fakeEvent);
        }
    };

    return (
        <div className="p-4 md:p-16 animate-fade-in max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bulk Import</h3>
                <p className="text-gray-500 text-sm mt-2">Add multiple players from a roster file or URL</p>
            </div>

            {bulkPlayers.length === 0 ? (
                <div className="space-y-6">
                    {/* Loading State */}
                    {loading ? (
                        <div className="border-2 border-orange-400/30 bg-orange-500/5 rounded-3xl p-12 text-center">
                            <Loader2 size={48} className="mx-auto text-orange-400 animate-spin mb-4" />
                            <p className="text-white font-black uppercase text-sm">
                                AI is extracting players...
                            </p>
                            <p className="text-orange-400 text-xs mt-2 animate-pulse">
                                Working hard - please be patient!
                            </p>
                        </div>
                    ) : (
                        /* File Upload */
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`cursor-pointer border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                                isDragging
                                    ? 'border-orange-400 bg-orange-500/10'
                                    : 'border-scout-700 hover:border-orange-400/50'
                            }`}
                        >
                            <FileUp size={48} className="mx-auto text-orange-400 mb-4" />
                            <p className="text-white font-black uppercase text-sm">
                                {isDragging ? 'Drop File Here' : 'Upload Roster File'}
                            </p>
                            <p className="text-gray-500 text-xs mt-2">
                                Drag & drop or click • Image, PDF, or CSV
                            </p>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,.pdf,.csv,.txt"
                        onChange={handleFileUpload}
                    />

                    {!loading && (
                        <>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Or paste a URL</p>
                            </div>

                            {/* URL Input */}
                            <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Link size={20} className="text-gray-500" />
                                    <span className="text-white font-black uppercase text-xs">Paste Roster Link</span>
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        type="url"
                                        placeholder="https://club-soccer.com/u17-roster"
                                        value={rosterUrl}
                                        onChange={(e) => setRosterUrl(e.target.value)}
                                        className="flex-1 bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-orange-400 transition-colors"
                                    />
                                    <button
                                        onClick={handleRosterUrlExtract}
                                        disabled={!rosterUrl.trim()}
                                        className="px-6 py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-sm hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <ArrowRight size={18} />
                                        Extract
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">AI will scan the page for player names and details</p>
                            </div>

                            <button
                                onClick={onBack}
                                className="w-full py-4 bg-scout-800 text-gray-400 font-black rounded-2xl hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Results Preview */}
                    <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Check size={20} className="text-scout-accent" />
                                <span className="text-white font-black uppercase text-xs">{bulkPlayers.length} Players Found</span>
                            </div>
                            <button
                                onClick={() => setBulkPlayers([])}
                                className="text-gray-500 hover:text-white text-xs font-bold"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                            {bulkPlayers.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-scout-900 rounded-xl px-4 py-3 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-scout-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                            {p.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{p.name || 'Unknown'}</p>
                                            <p className="text-gray-500 text-[10px]">{p.position || 'CM'} • {p.age || 17}yo</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setBulkPlayers(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove player"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setBulkPlayers([])}
                            className="flex-1 py-4 bg-scout-800 text-gray-400 font-black rounded-2xl hover:text-white transition-colors"
                        >
                            Start Over
                        </button>
                        <button
                            onClick={handleAddAllBulk}
                            disabled={loading || bulkPlayers.length === 0}
                            className="flex-[2] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl shadow-glow hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {loading ? (
                                <><Loader2 size={20} className="animate-spin" /> Adding players...</>
                            ) : (
                                <><Plus size={20} /> Add All {bulkPlayers.length} Players</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
