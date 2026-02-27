import React, { useState } from 'react';
import { ValidationReport } from '../types';
import { Button } from '../components/Button';
import { ArrowRight, Calendar, Trash2, ArrowLeft } from 'lucide-react';

interface HistoryViewProps {
  history: ValidationReport[];
  onSelect: (report: ValidationReport) => void;
  onClear: () => void;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onClear, onBack }) => {
  const [confirming, setConfirming] = useState(false);
  
  if (!history || history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="text-slate-400" size={24} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No history yet</h2>
        <p className="text-slate-500 mb-8">Validate your first idea to see it here.</p>
        <Button onClick={onBack}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <div className="flex justify-between items-end mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Your Validations</h1>
           <p className="text-slate-500 text-sm mt-1">Review past ideas and feedback.</p>
        </div>
        
        {confirming ? (
             <div className="flex items-center gap-2 bg-rose-50 p-1 pr-3 rounded-lg border border-rose-100 animate-fade-in">
                 <span className="text-xs text-rose-700 font-medium pl-2">Delete all?</span>
                 <button 
                    type="button"
                    onClick={() => { onClear(); setConfirming(false); }}
                    className="px-2 py-1 bg-white text-rose-600 text-xs font-bold rounded shadow-sm border border-rose-200 hover:bg-rose-50"
                 >
                    Yes
                 </button>
                 <button 
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="px-2 py-1 text-slate-500 text-xs hover:text-slate-800"
                 >
                    Cancel
                 </button>
             </div>
        ) : (
            <button 
                onClick={() => setConfirming(true)} 
                type="button"
                className="text-slate-400 hover:text-rose-500 text-sm flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
            >
            <Trash2 size={14} /> Clear History
            </button>
        )}
      </div>

      <div className="space-y-4">
        {history.map((report) => (
          <button 
            key={report.id} 
            type="button"
            onClick={() => onSelect(report)}
            className="w-full text-left group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    report.summaryVerdict === 'Promising' ? 'bg-emerald-500' :
                    report.summaryVerdict === 'Risky' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-medium text-slate-900 text-lg mb-1 group-hover:text-blue-700 transition-colors">
                  {report.oneLineTakeaway}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {report.marketReality}
                </p>
              </div>
              <div className="text-slate-300 group-hover:text-blue-500 transition-colors mt-2">
                <ArrowRight size={20} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};