import React from 'react';
import { Button } from '../components/Button';
import { ArrowRight, ShieldCheck, Target, TrendingUp, History } from 'lucide-react';

interface LandingViewProps {
  onStart: () => void;
  onExample: () => void;
  onHistory: () => void;
  hasHistory: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, onExample, onHistory, hasHistory }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center max-w-4xl mx-auto px-4">
      <div className="mb-8 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm inline-flex items-center gap-2">
         <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
         <span className="text-sm font-medium text-slate-600">Now using Gemini 3.0 reasoning</span>
      </div>

      <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
        Validate your startup idea <br className="hidden md:block" /> in minutes.
      </h1>
      
      <p className="text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
        Get honest market feedback, competitor analysis, and monetization strategies. 
        No fluff. Just the hard truth about your potential.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
        <Button size="lg" onClick={onStart} className="gap-2">
          Validate an Idea <ArrowRight size={20} />
        </Button>
        <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={onExample}>
            Example
            </Button>
            {hasHistory && (
                <Button variant="outline" size="lg" onClick={onHistory} className="gap-2">
                    <History size={18} /> Past Ideas
                </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full max-w-4xl">
        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Target size={20} />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Market Reality</h3>
          <p className="text-slate-500 text-sm">Understand if people actually need this and if the timing is right.</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Competitor check</h3>
          <p className="text-slate-500 text-sm">See who's already doing it and find your unique differentiation gap.</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp size={20} />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Monetization</h3>
          <p className="text-slate-500 text-sm">Discover realistic ways to make money from day one.</p>
        </div>
      </div>
    </div>
  );
};