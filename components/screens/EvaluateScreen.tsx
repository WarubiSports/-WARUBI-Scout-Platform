import React, { useState, useMemo } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useDashboardContext } from '../DashboardLayout';
import { Player } from '../../types';
import { EVAL_SECTIONS, calculateEvalBonus } from '../../lib/eval-constants';
import { supabaseRest } from '../../lib/supabase';

interface ChipGroupProps {
  options: string[]
  selected: string | null
  onSelect: (val: string | null) => void
}

const ChipGroup = ({ options, selected, onSelect }: ChipGroupProps) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onSelect(selected === opt ? null : opt)}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
          selected === opt
            ? 'bg-scout-accent/20 text-scout-accent border border-scout-accent/40'
            : 'bg-scout-900 text-gray-400 border border-scout-700 hover:border-scout-600'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const EvaluateScreen: React.FC = () => {
  const { players, onUpdatePlayer } = useDashboardContext();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [chips, setChips] = useState<Record<string, string | null>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['athleticism', 'technique']));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState('');

  // Players needing evaluation (no scout_eval yet)
  const needsEval = useMemo(() =>
    players.filter(p => p.status !== 'Archived' && !(p as any).scout_eval),
    [players]
  );

  const evaluated = useMemo(() =>
    players.filter(p => (p as any).scout_eval),
    [players]
  );

  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || null;

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayerId(player.id);
    const existing = (player as any).scout_eval as Record<string, string | null> | null;
    setChips(existing || {});
    setNotes((player as any).scout_notes || '');
    setSaved(false);
  };

  const handleChipChange = (key: string, value: string | null) => {
    setChips(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filledCount = Object.values(chips).filter(Boolean).length;
  const evalBonus = calculateEvalBonus(chips);

  const handleSave = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    try {
      // Update in Supabase
      await supabaseRest.update('scout_prospects', selectedPlayer.id, {
        scout_eval: chips,
        caliber_score: evalBonus,
        notes: notes || selectedPlayer.notes,
      });
      // Update local state
      onUpdatePlayer({
        ...selectedPlayer,
        scout_eval: chips,
        caliber_score: evalBonus,
        notes: notes || selectedPlayer.notes,
      } as any);
      setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Evaluate</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">{evaluated.length} evaluated</span>
          <span className="text-xs font-bold text-amber-400">{needsEval.length} pending</span>
        </div>
      </div>

      {!selectedPlayer ? (
        <>
          {/* Player selection */}
          {needsEval.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">Needs Evaluation</h3>
              <div className="space-y-1.5">
                {needsEval.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-scout-800 border border-scout-700 rounded-xl text-left hover:border-scout-accent/50 transition-colors active:scale-[0.99]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white truncate block">{p.name}</span>
                      <span className="text-[10px] text-gray-500">{p.position}{p.club ? ` · ${p.club}` : ''}</span>
                    </div>
                    <ClipboardCheck size={16} className="text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {evaluated.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-scout-accent uppercase tracking-wider mb-3">Evaluated</h3>
              <div className="space-y-1.5">
                {evaluated.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-scout-800/50 border border-scout-700/50 rounded-xl text-left hover:border-scout-accent/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-scout-accent/10 border border-scout-accent/30 flex items-center justify-center text-xs font-black text-scout-accent">
                      {(p as any).caliber_score || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white truncate block">{p.name}</span>
                      <span className="text-[10px] text-gray-500">{p.position}{p.club ? ` · ${p.club}` : ''}</span>
                    </div>
                    <Check size={16} className="text-scout-accent" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsEval.length === 0 && evaluated.length === 0 && (
            <div className="text-center py-20">
              <ClipboardCheck size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Upload players first, then evaluate them here</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Evaluation form */}
          <div className="mb-4">
            <button
              onClick={() => { setSelectedPlayerId(null); setChips({}); setNotes(''); }}
              className="text-xs text-gray-500 hover:text-white mb-3"
            >
              ← Back to list
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-scout-accent/10 border border-scout-accent/30 flex items-center justify-center text-lg font-black text-scout-accent">
                {evalBonus > 0 ? `+${evalBonus}` : evalBonus}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{selectedPlayer.name}</h2>
                <p className="text-xs text-gray-500">{selectedPlayer.position} · {selectedPlayer.club || 'No club'} · {filledCount}/25 chips</p>
              </div>
            </div>
          </div>

          {/* Chip sections */}
          <div className="space-y-3 mb-6">
            {EVAL_SECTIONS.map(section => {
              const isExpanded = expandedSections.has(section.id);
              const sectionFilled = section.categories.filter(c => chips[c.key]).length;
              return (
                <div key={section.id} className="bg-scout-800 border border-scout-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span>{section.icon}</span>
                      <span className="text-sm font-black text-white">{section.title}</span>
                      <span className="text-[10px] text-gray-500">{sectionFilled}/{section.categories.length}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {section.categories.map(cat => (
                        <div key={cat.key}>
                          <label className="text-xs font-bold text-gray-400 mb-1.5 block">{cat.label}</label>
                          <ChipGroup
                            options={cat.options}
                            selected={chips[cat.key] || null}
                            onSelect={(val) => handleChipChange(cat.key, val)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Scout Notes</label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder="Observations, potential, concerns..."
              rows={3}
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-scout-accent resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            className={`w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] ${
              saved
                ? 'bg-scout-accent/20 text-scout-accent border border-scout-accent/30'
                : 'bg-scout-accent text-scout-900 shadow-glow hover:bg-emerald-400 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : `Save Evaluation (${filledCount}/25)`}
          </button>
        </>
      )}
    </div>
  );
};

export default EvaluateScreen;
