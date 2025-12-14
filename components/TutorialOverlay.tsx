import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Target, Users, PlusCircle, MessageSquare, Calendar, CheckCircle2, EyeOff } from 'lucide-react';

interface TutorialOverlayProps {
  onClose: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to WARUBISCOUT",
      icon: <Target size={48} className="text-scout-accent" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white font-medium">Your mission is simple:</p>
          <ul className="space-y-3 text-gray-300 text-sm text-left bg-scout-900/50 p-4 rounded-lg border border-scout-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-scout-accent mt-0.5 shrink-0" />
              <span><strong>Find players you know:</strong> Start with the talent you've already seen or worked with.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-scout-accent mt-0.5 shrink-0" />
              <span><strong>Leverage your databases:</strong> Use access you already have to rosters, leagues, and schools.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-scout-accent mt-0.5 shrink-0" />
              <span><strong>Attend & Host Events:</strong> Get boots on the ground to identify new leads.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "The Recruiting Pipeline",
      icon: <Users size={48} className="text-blue-400" />,
      content: (
        <p className="text-gray-300 text-center">
          This dashboard is your command center. Track players from <strong>Lead</strong> to <strong>Placed</strong>. 
          <br /><br />
          Use the <strong>Board View</strong> to visualize stages or the <strong>List View</strong> for sorting and filtering large numbers of recruits.
        </p>
      )
    },
    {
      title: "Submitting Your First Player",
      icon: <PlusCircle size={48} className="text-green-400" />,
      content: (
        <div className="space-y-3 text-center">
          <p className="text-gray-300">
            Ready to add talent? Click the green <strong>+ Add Player</strong> button in the top right.
          </p>
          <div className="bg-scout-900/50 p-3 rounded border border-scout-700 text-sm text-gray-400">
             You can manually enter a player's profile one by one to ensure accuracy and quality.
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: Fill out as much detail as possible to get an accurate AI Score and Scholarship Tier.
          </p>
        </div>
      )
    },
    {
      title: "AI Outreach & The Shadow Pipeline",
      icon: <MessageSquare size={48} className="text-purple-400" />,
      content: (
        <div className="text-center space-y-4">
          <p className="text-gray-300">
            Use AI to generate professional messages for invites, follow-ups, and rejections.
          </p>
          <div className="bg-gradient-to-r from-scout-900 to-scout-800 p-3 rounded border border-scout-700 text-sm text-gray-300 flex items-start gap-3 text-left">
             <EyeOff size={24} className="text-scout-highlight shrink-0 mt-1" />
             <div>
                 <strong className="block text-white mb-1">The Shadow Pipeline</strong>
                 Imported leads stay hidden as "Prospects" until they engage. Send them a message with a "Smart Link"—when they reply, they automatically move to your main board.
             </div>
          </div>
        </div>
      )
    },
    {
      title: "Events & Scouting",
      icon: <Calendar size={48} className="text-orange-400" />,
      content: (
        <p className="text-gray-300 text-center">
          Manage your schedule in the <strong>Events</strong> tab. 
          <br /><br />
          Use the <strong>AI Event Generator</strong> to create professional agendas and marketing plans for your own Talent ID days.
        </p>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-scout-800 w-full max-w-lg rounded-2xl border border-scout-600 shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Progress Bar */}
        <div className="flex">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 transition-colors ${i <= step ? 'bg-scout-accent' : 'bg-scout-700'}`}
            />
          ))}
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 flex flex-col items-center flex-1 min-h-[350px]">
          <div className="mb-6 p-4 bg-scout-900 rounded-full border border-scout-700 shadow-inner">
            {steps[step].icon}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4 text-center">{steps[step].title}</h2>
          
          <div className="flex-1 flex items-center justify-center w-full">
            {steps[step].content}
          </div>
        </div>

        <div className="p-6 bg-scout-900 border-t border-scout-700 flex justify-between items-center">
          <button 
            onClick={handlePrev}
            disabled={step === 0}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${step === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-white' : 'bg-scout-700'}`} 
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="flex items-center gap-2 bg-scout-accent hover:bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg"
          >
            {step === steps.length - 1 ? 'Get Started' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default TutorialOverlay;