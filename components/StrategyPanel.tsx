import React from 'react';
import { StrategyTask } from '../types';
import { Sparkles, Flame, Zap, CheckCircle2, ArrowRight, MessageSquare, Calendar, ShieldCheck, Plus } from 'lucide-react';

interface StrategyPanelProps {
    persona: string;
    tasks: StrategyTask[];
    onAction: (link: string) => void;
}

const StrategyPanel: React.FC<StrategyPanelProps> = ({ persona, tasks, onAction }) => {
    
    const getIcon = (type: StrategyTask['type']) => {
        switch(type) {
            case 'LEAD': return <Flame size={16} className="text-orange-500" />;
            case 'OUTREACH': return <MessageSquare size={16} className="text-blue-400" />;
            case 'EVENT': return <Calendar size={16} className="text-purple-400" />;
            case 'ADMIN': return <ShieldCheck size={16} className="text-gray-400" />;
            default: return <Zap size={16} className="text-scout-accent" />;
        }
    };

    const getBorderColor = (level: StrategyTask['impactLevel']) => {
        switch(level) {
            case 'HIGH': return 'border-scout-accent shadow-[0_0_10px_rgba(16,185,129,0.1)]';
            case 'MEDIUM': return 'border-blue-500/50';
            default: return 'border-scout-700';
        }
    };

    return (
        <div className="mx-4 mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-scout-highlight" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Strategy: {persona}
                    </h3>
                </div>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => (
                    <div 
                        key={task.id}
                        className={`bg-scout-900/80 rounded-lg border p-3 transition-all hover:bg-scout-800 group relative overflow-hidden ${getBorderColor(task.impactLevel)}`}
                    >
                        {/* High Impact Glow */}
                        {task.impactLevel === 'HIGH' && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-scout-accent/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        )}

                        <div className="flex justify-between items-start mb-1 relative z-10">
                            <div className="flex items-center gap-2">
                                {getIcon(task.type)}
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${task.impactLevel === 'HIGH' ? 'text-scout-accent' : 'text-gray-400'}`}>
                                    {task.title}
                                </span>
                            </div>
                            {task.completed && <CheckCircle2 size={14} className="text-green-500" />}
                        </div>
                        
                        <p className="text-xs text-gray-200 font-medium mb-3 leading-snug relative z-10">
                            {task.subtitle}
                        </p>

                        <button 
                            onClick={() => onAction(task.actionLink)}
                            className="w-full py-1.5 rounded bg-scout-800 border border-scout-700 text-[10px] font-bold text-gray-300 uppercase tracking-wider hover:bg-scout-700 hover:text-white hover:border-scout-600 transition-colors flex items-center justify-center gap-1 group-hover:border-scout-500/50"
                        >
                            {task.actionLabel} <ArrowRight size={10} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StrategyPanel;
