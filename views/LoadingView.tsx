import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const LOADING_MESSAGES = [
  "Analyzing your pitch inputs...",
  "Identifying core user pain points...",
  "Scanning the competitive horizon...",
  "Evaluating market timing & urgency...",
  "Stress-testing monetization strategies...",
  "Looking for differentiation gaps...",
  "Checking for 'hair-on-fire' problems...",
  "Drafting honest feedback...",
  "Synthesizing final report..."
];

export const LoadingView: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-full shadow-sm border border-slate-100">
          <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
        </div>
      </div>
      
      <h3 className="mt-8 text-xl font-medium text-slate-900 animate-fade-in text-center min-h-[28px]">
        {LOADING_MESSAGES[messageIndex]}
      </h3>
      <p className="mt-2 text-slate-400 text-sm">This typically takes 10-15 seconds.</p>
    </div>
  );
};