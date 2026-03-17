import React from 'react';
import { Activity, Target, Users, Flame, Zap, Brain } from 'lucide-react';
import { handleMobileFocus } from '../../hooks/useMobileFeatures';

export const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
export const TEAM_LEVELS = ["MLS Next", "ECNL", "GA", "High School Varsity", "NPL", "Regional", "International Academy"];
export const FEET = ["Right", "Left", "Both"];

export const FormField = ({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
            {Icon && <Icon size={10} className="text-scout-accent" />} {label}
        </label>
        {children}
    </div>
);

export const ScoutInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input
        {...props}
        ref={ref}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
            handleMobileFocus(e);
            (props as any).onFocus?.(e);
        }}
        className="w-full bg-scout-800 border-2 border-scout-700 rounded-xl px-4 py-3 text-white focus:border-scout-accent outline-none font-bold placeholder-gray-600 transition-all"
    />
));

export const ScoutSelect = ({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
        {...props}
        className="w-full bg-scout-800 border-2 border-scout-700 rounded-xl px-4 py-3 text-white focus:border-scout-accent outline-none font-bold appearance-none transition-all"
    >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const getTrackColor = (val: number) => {
    if (val >= 85) return 'bg-scout-accent';
    if (val >= 70) return 'bg-scout-highlight';
    return 'bg-blue-500';
};

export const AuditSlider = ({ label, value, onChange, icon: Icon }: { label: string; value: number; onChange: (val: number) => void; icon?: any }) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className="text-gray-500" />}
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            </div>
            <span className={`text-sm font-mono font-black ${value >= 85 ? 'text-scout-accent' : value >= 70 ? 'text-scout-highlight' : 'text-white'}`}>
                {value}
            </span>
        </div>
        <div className="relative h-8 flex items-center">
            <div className="absolute inset-x-0 h-2 bg-scout-700 rounded-full" />
            <div
                className={`absolute left-0 h-2 rounded-full transition-all ${getTrackColor(value)}`}
                style={{ width: `${value}%` }}
            />
            <div className="absolute left-[70%] top-1 bottom-1 w-px bg-gray-500/50 pointer-events-none" title="College Ready" />
            <div className="absolute left-[85%] top-1 bottom-1 w-px bg-scout-accent/50 pointer-events-none" title="Pro Prospect" />
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
                className={`absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all ${getTrackColor(value)}`}
                style={{ left: `calc(${value}% - 10px)` }}
            />
        </div>
    </div>
);
