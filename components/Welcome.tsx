import React from 'react';
import { ArrowRight, Globe } from 'lucide-react';

interface WelcomeProps {
  onStart: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-blue-100 p-4 rounded-full mb-6">
        <Globe className="w-12 h-12 text-blue-600" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
        Who are you, <span className="text-blue-600">really?</span>
      </h1>
      <p className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
        Inspired by the breakdown of Jackie Chan's multi-regional identity. 
        We calculate your belonging based on time spent, ancestral bloodlines, 
        and emotional attachments.
      </p>
      
      <button 
        onClick={onStart}
        className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
      >
        <span>Calculate My Identity</span>
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="mt-8 text-xs text-slate-400 uppercase tracking-widest">
        Strictly for entertainment purposes
      </p>
    </div>
  );
};
