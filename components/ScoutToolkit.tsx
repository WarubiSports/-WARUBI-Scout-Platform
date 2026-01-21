import React, { useState } from 'react';
import {
  FileText,
  Download,
  MessageSquare,
  Calendar,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  BookOpen,
  Target,
  Users
} from 'lucide-react';

interface ToolkitResource {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  downloadUrl?: string;
  externalUrl?: string;
  tags: string[];
}

const resources: ToolkitResource[] = [
  {
    id: 'evaluation-guide',
    title: 'Prospect Evaluation Guide',
    description: 'Complete framework for assessing player potential, technical skills, and college fit. Includes scoring rubrics and red flags to watch for.',
    icon: <Target size={24} />,
    color: 'text-scout-accent',
    bgColor: 'bg-scout-accent/10',
    downloadUrl: '/resources/prospect-evaluation-guide.pdf',
    tags: ['Assessment', 'Scoring']
  },
  {
    id: 'outreach-templates',
    title: 'Outreach Message Templates',
    description: '15+ proven templates for cold outreach, follow-ups, parent communication, and coach introductions. Copy, customize, send.',
    icon: <MessageSquare size={24} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    downloadUrl: '/resources/outreach-templates.pdf',
    tags: ['Communication', 'Templates']
  },
  {
    id: 'event-playbook',
    title: 'Event Hosting Playbook',
    description: 'Step-by-step guide to running ID Days, showcases, and camps. Includes checklists, timelines, and promotional materials.',
    icon: <Calendar size={24} />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    downloadUrl: '/resources/event-playbook.pdf',
    tags: ['Events', 'Planning']
  },
  {
    id: 'itp-overview',
    title: 'ITP Program Overview',
    description: 'Everything about FC Köln International Talent Program. Share with players and parents to explain the pathway opportunity.',
    icon: <GraduationCap size={24} />,
    color: 'text-scout-highlight',
    bgColor: 'bg-scout-highlight/10',
    downloadUrl: '/resources/itp-program-overview.pdf',
    tags: ['ITP', 'Program']
  }
];

interface ScoutToolkitProps {
  compact?: boolean;
}

const ScoutToolkit: React.FC<ScoutToolkitProps> = ({ compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (resource: ToolkitResource) => {
    setDownloadingId(resource.id);

    // Simulate download delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    if (resource.downloadUrl) {
      // In production, this would trigger actual file download
      // For now, show coming soon alert
      alert(`"${resource.title}" will be available for download soon! We're finalizing the materials.`);
    } else if (resource.externalUrl) {
      window.open(resource.externalUrl, '_blank');
    }

    setDownloadingId(null);
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full bg-gradient-to-r from-scout-accent/10 to-blue-500/10 border border-scout-accent/30 rounded-2xl p-4 flex items-center justify-between hover:border-scout-accent/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-scout-accent/20 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-scout-accent" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Scout Toolkit</h4>
            <p className="text-[10px] text-gray-500">Guides, templates & resources</p>
          </div>
        </div>
        <ChevronDown size={20} className="text-gray-500 group-hover:text-scout-accent transition-colors" />
      </button>
    );
  }

  return (
    <div className="bg-scout-800/30 border border-scout-700/50 rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-scout-700/50 bg-gradient-to-r from-scout-900/50 to-scout-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-scout-accent to-emerald-400 rounded-xl flex items-center justify-center shadow-glow">
              <BookOpen size={24} className="text-scout-900" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic flex items-center gap-2">
                Scout Toolkit
                <span className="text-[9px] font-bold bg-scout-accent/20 text-scout-accent px-2 py-0.5 rounded-full normal-case tracking-normal">
                  4 Resources
                </span>
              </h3>
              <p className="text-xs text-gray-500">Essential guides and templates for effective scouting</p>
            </div>
          </div>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <ChevronUp size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-scout-900/50 border border-scout-700/50 rounded-2xl p-5 hover:border-scout-accent/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${resource.bgColor} rounded-xl flex items-center justify-center shrink-0 ${resource.color} group-hover:scale-110 transition-transform`}>
                  {resource.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">
                    {resource.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                    {resource.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {resource.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-bold bg-scout-800 text-gray-400 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(resource)}
                disabled={downloadingId === resource.id}
                className={`w-full mt-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  downloadingId === resource.id
                    ? 'bg-scout-700 text-gray-400 cursor-wait'
                    : 'bg-scout-800 text-gray-300 hover:bg-scout-accent hover:text-scout-900 border border-scout-700 hover:border-scout-accent'
                }`}
              >
                {downloadingId === resource.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    Preparing...
                  </>
                ) : resource.externalUrl ? (
                  <>
                    <ExternalLink size={14} />
                    Open Resource
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Pro Tip */}
        <div className="mt-6 bg-scout-accent/5 border border-scout-accent/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-scout-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-300">
              <span className="font-bold text-scout-accent">Pro Tip:</span> Share the ITP Program Overview with interested players and their parents. It helps them understand the full pathway opportunity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoutToolkit;
