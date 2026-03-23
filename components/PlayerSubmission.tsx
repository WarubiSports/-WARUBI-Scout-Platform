
import React, { useState, useEffect, useRef, memo } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { evaluatePlayer, parsePlayerDetails, extractPlayersFromBulkData } from '../services/geminiService';
import { Player, PlayerStatus, PlayerEvaluation } from '../types';
import { HubPanel } from './submission/HubPanel';
import { SidelineTagger } from './submission/SidelineTagger';
import { BulkImportPanel } from './submission/BulkImportPanel';
import { PlayerBuildForm } from './submission/PlayerBuildForm';

interface PlayerSubmissionProps {
    onClose: () => void;
    onAddPlayer: (player: Player) => void;
    onUpdatePlayer?: (player: Player) => void;
    existingPlayers: Player[];
    editingPlayer?: Player | null;
    initialMode?: SubmissionMode;
}

type SubmissionMode = 'HUB' | 'SCANNING' | 'BUILD' | 'FIELD' | 'BULK';

const PlayerSubmission: React.FC<PlayerSubmissionProps> = ({ onClose, onAddPlayer, onUpdatePlayer, existingPlayers, editingPlayer, initialMode }) => {
    const [mode, setMode] = useState<SubmissionMode>(editingPlayer ? 'BUILD' : (initialMode || 'HUB'));
    const [buildStep, setBuildStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fieldInput, setFieldInput] = useState('');
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddLoading, setQuickAddLoading] = useState(false);

    // Bulk import state
    const [rosterUrl, setRosterUrl] = useState('');
    const [bulkPlayers, setBulkPlayers] = useState<Partial<Player>[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        position: 'CM',
        secondaryPosition: '',
        dominantFoot: 'Right' as 'Right' | 'Left' | 'Both',
        nationality: '',
        hasEuPassport: false,
        dob: '',
        club: '',
        teamLevel: 'ECNL',
        height: '',
        weight: '',
        pace: 50,
        physical: 50,
        technical: 50,
        tactical: 50,
        coachable: 50,
        gradYear: '',
        gpa: '',
        satAct: '',
        videoLink: '',
        email: '',
        phone: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
    });

    const [evalResult, setEvalResult] = useState<PlayerEvaluation | null>(editingPlayer?.evaluation || null);

    useEffect(() => {
        if (editingPlayer) {
            const names = editingPlayer.name.split(' ');
            setFormData({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                position: editingPlayer.position || 'CM',
                secondaryPosition: editingPlayer.secondaryPosition || '',
                dominantFoot: editingPlayer.dominantFoot || 'Right',
                nationality: editingPlayer.nationality || '',
                hasEuPassport: editingPlayer.hasEuPassport || false,
                dob: editingPlayer.dateOfBirth || '',
                club: editingPlayer.club || '',
                teamLevel: editingPlayer.teamLevel || 'ECNL',
                height: editingPlayer.height || '',
                weight: editingPlayer.weight || '',
                pace: editingPlayer.pace || 50,
                physical: editingPlayer.physical || 50,
                technical: editingPlayer.technical || 50,
                tactical: editingPlayer.tactical || 50,
                coachable: editingPlayer.coachable || 50,
                gradYear: editingPlayer.gradYear || '',
                gpa: editingPlayer.gpa || '',
                satAct: editingPlayer.satAct || '',
                videoLink: editingPlayer.videoLink || '',
                email: editingPlayer.email || '',
                phone: editingPlayer.phone || '',
                parentName: editingPlayer.parentName || '',
                parentEmail: editingPlayer.parentEmail || '',
                parentPhone: editingPlayer.parentPhone || '',
            });
        }
    }, [editingPlayer]);

    const draftPlayer: Player = {
        id: editingPlayer?.id || 'draft',
        name: `${formData.firstName} ${formData.lastName}`.trim() || 'Unnamed Prospect',
        age: formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : (editingPlayer?.age || 17),
        dateOfBirth: formData.dob || editingPlayer?.dateOfBirth,
        position: formData.position,
        secondaryPosition: formData.secondaryPosition,
        dominantFoot: formData.dominantFoot,
        nationality: formData.nationality,
        hasEuPassport: formData.hasEuPassport,
        height: formData.height,
        weight: formData.weight,
        pace: formData.pace,
        physical: formData.physical,
        technical: formData.technical,
        tactical: formData.tactical,
        coachable: formData.coachable,
        status: editingPlayer?.status || PlayerStatus.LEAD,
        email: formData.email,
        phone: formData.phone,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        gpa: formData.gpa,
        gradYear: formData.gradYear,
        satAct: formData.satAct,
        videoLink: formData.videoLink,
        club: formData.club,
        teamLevel: formData.teamLevel,
        submittedAt: editingPlayer?.submittedAt || new Date().toISOString(),
        outreachLogs: editingPlayer?.outreachLogs || [],
        notes: editingPlayer?.notes || '',
        evaluation: evalResult,
        activityStatus: editingPlayer?.activityStatus,
        lastActive: editingPlayer?.lastActive,
        lastContactedAt: editingPlayer?.lastContactedAt,
        previousScore: editingPlayer?.evaluation?.score
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const startAiMagic = async (data: string) => {
        setLoading(true);
        setMode('SCANNING');
        try {
            const result = await evaluatePlayer(data, false);
            const parsed = await parsePlayerDetails(data);
            if (parsed) {
                setFormData(prev => ({ ...prev, ...parsed }));
            }
            setEvalResult(result);
            setMode('BUILD');
            setBuildStep(1);
        } catch (e) {
            setMode('BUILD');
            setBuildStep(1);
        } finally {
            setLoading(false);
        }
    };

    // Bulk import handlers
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const reader = new FileReader();
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf';

            reader.onload = async (event) => {
                let prospects;
                if (isImage || isPdf) {
                    const base64 = (event.target?.result as string).split(',')[1];
                    prospects = await extractPlayersFromBulkData(base64, true, isPdf ? 'application/pdf' : file.type);
                } else {
                    const text = event.target?.result as string;
                    prospects = await extractPlayersFromBulkData(text, false);
                }
                setBulkPlayers(prospects);
                setLoading(false);
            };

            if (isImage || isPdf) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            setLoading(false);
        }
    };

    const handleRosterUrlExtract = async () => {
        if (!rosterUrl.trim()) return;
        setLoading(true);
        try {
            const prospects = await extractPlayersFromBulkData(`Extract from this roster URL: ${rosterUrl}`, false);
            setBulkPlayers(prospects);
        } catch (error) {
            console.error('Error extracting from URL:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAllBulk = async () => {
        setLoading(true);
        try {
            for (let idx = 0; idx < bulkPlayers.length; idx++) {
                const p = bulkPlayers[idx];
                const player: Player = {
                    id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: p.name || 'Unknown',
                    age: p.age || 17,
                    position: p.position || 'CM',
                    status: PlayerStatus.LEAD,
                    submittedAt: new Date().toISOString(),
                    outreachLogs: [],
                    ...p
                };
                await onAddPlayer(player);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            onClose();
        } catch (error) {
            console.error('Error adding bulk players:', error);
            alert('Error adding some players. Please try again.');
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!formData.firstName && !formData.lastName) return;
        setLoading(true);
        try {
            if (editingPlayer && onUpdatePlayer) {
                onUpdatePlayer({ ...draftPlayer });
            } else {
                await onAddPlayer({ ...draftPlayer, id: Date.now().toString() });
            }
            onClose();
        } catch (err) {
            console.error('[handleFinalSubmit] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-[#05080f]/95 backdrop-blur-xl p-0 md:p-4 animate-fade-in">
            <div className="bg-scout-900 w-full max-w-6xl rounded-t-2xl md:rounded-[2.5rem] border-t md:border border-scout-700 shadow-2xl flex flex-col overflow-hidden max-h-[95vh] md:max-h-[90vh] relative">
                <div className="px-4 py-3 md:p-8 flex justify-between items-center border-b border-white/5 bg-scout-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-scout-accent rounded-full flex items-center justify-center text-scout-900 shadow-lg"><Plus size={20} /></div>
                        <div><h2 className="text-base md:text-xl font-black text-white uppercase tracking-tighter">{editingPlayer ? 'Edit Profile' : 'Add Prospect'}</h2></div>
                    </div>
                    <button onClick={onClose} className="p-2 md:p-3 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                    {mode === 'HUB' && (
                        <HubPanel
                            quickAddName={quickAddName}
                            setQuickAddName={setQuickAddName}
                            quickAddLoading={quickAddLoading}
                            setQuickAddLoading={setQuickAddLoading}
                            position={formData.position}
                            onPositionChange={(val) => handleInputChange('position', val)}
                            onAddPlayer={onAddPlayer}
                            onClose={onClose}
                            onSwitchToBuild={() => setMode('BUILD')}
                        />
                    )}

                    {mode === 'FIELD' && (
                        <SidelineTagger
                            fieldInput={fieldInput}
                            setFieldInput={setFieldInput}
                            loading={loading}
                            onCancel={() => setMode('HUB')}
                            onSubmit={startAiMagic}
                        />
                    )}

                    {mode === 'BULK' && (
                        <BulkImportPanel
                            bulkPlayers={bulkPlayers}
                            setBulkPlayers={setBulkPlayers}
                            loading={loading}
                            setLoading={setLoading}
                            rosterUrl={rosterUrl}
                            setRosterUrl={setRosterUrl}
                            onAddPlayer={onAddPlayer}
                            onClose={onClose}
                            onBack={() => setMode('HUB')}
                            handleFileUpload={handleFileUpload}
                            handleRosterUrlExtract={handleRosterUrlExtract}
                            handleAddAllBulk={handleAddAllBulk}
                        />
                    )}

                    {mode === 'SCANNING' && (
                        <div className="p-24 text-center space-y-8 animate-fade-in h-full flex flex-col justify-center items-center">
                            <Loader2 size={64} className="text-scout-accent animate-spin" />
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">AI Structuring...</h3>
                        </div>
                    )}

                    {mode === 'BUILD' && (
                        <PlayerBuildForm
                            buildStep={buildStep}
                            setBuildStep={setBuildStep}
                            formData={formData}
                            handleInputChange={handleInputChange}
                            draftPlayer={draftPlayer}
                            loading={loading}
                            editingPlayer={editingPlayer}
                            onSubmit={handleFinalSubmit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Memoize to prevent unnecessary re-renders
export default memo(PlayerSubmission);
