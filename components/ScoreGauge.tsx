import React from 'react';

interface ScoreGaugeProps {
  score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  let colorClass = "bg-amber-500";
  let textClass = "text-amber-600";
  
  if (score >= 75) {
    colorClass = "bg-emerald-500";
    textClass = "text-emerald-600";
  } else if (score < 40) {
    colorClass = "bg-rose-500";
    textClass = "text-rose-600";
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-slate-100 border-4 border-slate-200">
        {/* Simple visual representation */}
        <div 
          className={`absolute inset-0 rounded-full opacity-20 ${colorClass}`} 
          style={{ transform: `scale(${score / 100})` }}
        />
        <span className={`text-3xl font-bold ${textClass}`}>{score}</span>
      </div>
      <span className="text-xs uppercase tracking-wide text-slate-500 mt-2 font-semibold">Viability Potential</span>
    </div>
  );
};