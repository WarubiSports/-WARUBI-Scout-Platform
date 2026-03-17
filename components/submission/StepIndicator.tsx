import React from 'react';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps?: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps = 4 }) => (
    <div className="flex gap-1.5 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(i => (
            <div key={i} className="flex-1 flex flex-col gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${currentStep >= i ? 'bg-scout-accent' : 'bg-scout-700'}`}></div>
                <span className={`text-[8px] font-black uppercase text-center ${currentStep === i ? 'text-scout-accent' : 'text-gray-600'}`}>Step {i}</span>
            </div>
        ))}
    </div>
);
