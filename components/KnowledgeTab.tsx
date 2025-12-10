import React, { useState } from 'react';
import { KnowledgeItem } from '../types';
import { INITIAL_KNOWLEDGE_BASE } from '../constants';
import { askScoutAI } from '../services/geminiService';
import { MessageSquare, Send, BookOpen, Loader2 } from 'lucide-react';

const KnowledgeTab: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        setLoading(true);
        setAnswer(null);
        try {
            const response = await askScoutAI(question);
            setAnswer(response);
        } catch (e) {
            setAnswer("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Library Section */}
            <div className="md:col-span-2 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-2xl font-bold text-white mb-6">Scouting Knowledge Base</h2>
                
                <div className="grid gap-4">
                    {INITIAL_KNOWLEDGE_BASE.map(item => (
                        <div key={item.id} className="bg-scout-800 p-5 rounded-lg border border-scout-700">
                            <span className="text-xs font-bold text-scout-accent uppercase tracking-wide">{item.category}</span>
                            <h3 className="text-lg font-semibold text-white mt-1 mb-2">{item.title}</h3>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                        </div>
                    ))}
                    <div className="bg-scout-800 p-5 rounded-lg border border-scout-700 opacity-60">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Template</span>
                        <h3 className="text-lg font-semibold text-white mt-1 mb-2">College Coach Introduction</h3>
                        <p className="text-gray-300 text-sm">"Coach [Name], attaching profile for [Player]. Key metrics include..."</p>
                    </div>
                </div>
            </div>

            {/* AI Chat Section */}
            <div className="bg-scout-800 border border-scout-700 rounded-xl flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-scout-700 bg-scout-800/50">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare size={18} className="text-scout-highlight" /> 
                        Ask ScoutAI
                    </h3>
                    <p className="text-xs text-gray-400">Expert answers on rules, tactics, and recruiting.</p>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-scout-900/30">
                    {answer ? (
                        <div className="bg-scout-700/50 p-3 rounded-lg border border-scout-600 text-sm text-gray-200">
                            <span className="text-xs text-scout-highlight font-bold block mb-1">AI Answer:</span>
                            {answer}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center text-gray-600 space-y-2">
                             <BookOpen size={32} />
                             <p className="text-sm">Ask anything about scouting</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-scout-800 border-t border-scout-700">
                    <form onSubmit={handleAsk} className="relative">
                        <input
                            type="text"
                            placeholder="e.g. What is the GPA requirement for D1?"
                            className="w-full bg-scout-900 text-white text-sm rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-scout-accent border border-scout-700"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !question}
                            className="absolute right-2 top-2 p-1.5 text-scout-accent hover:text-white disabled:opacity-50 transition-colors"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeTab;
