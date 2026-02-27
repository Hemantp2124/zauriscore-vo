import React from 'react';
import { UserProfile, ValidationReport } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus, Zap, History, ChevronRight, BarChart3, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  history: ValidationReport[];
  onValidateNew: () => void;
  onViewHistory: () => void;
  onViewReport: (report: ValidationReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, 
  history, 
  onValidateNew, 
  onViewHistory,
  onViewReport 
}) => {
  const recentReports = history.slice(0, 3);
  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.viabilityScore, 0) / history.length) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back, <span className="font-semibold text-slate-800">{user.name}</span>.</p>
        </div>
        <Button onClick={onValidateNew} className="gap-2 shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 transition-all">
          <Plus size={20} /> Validate New Idea
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Zap size={24} />
            </div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Credits</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {user.isPro ? '∞' : user.credits}
            </span>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {user.isPro ? 'Lifetime Access Active' : 'Available validations'}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <History size={24} />
            </div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Runs</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{history.length}</span>
            <p className="text-sm text-slate-500 mt-1 font-medium">Ideas analyzed</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <BarChart3 size={24} />
            </div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Avg. Score</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{avgScore}</span>
            <p className="text-sm text-slate-500 mt-1 font-medium">Mean viability score</p>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Validations</h2>
          {history.length > 0 && (
            <button onClick={onViewHistory} className="text-sm text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 border-dashed rounded-xl p-12 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-400">
               <Sparkles size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to validate?</h3>
            <p className="text-slate-500 mb-6 max-w-sm">
              You haven't analyzed any ideas yet. Start your first validation to get AI-powered market feedback.
            </p>
            <Button onClick={onValidateNew}>Start your first validation</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recentReports.map(report => (
              <div 
                key={report.id}
                onClick={() => onViewReport(report)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-5 overflow-hidden">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                    report.summaryVerdict === 'Promising' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    report.summaryVerdict === 'Risky' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    <span className="font-bold text-xl">{report.viabilityScore}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors text-lg">
                      {report.oneLineTakeaway}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className={`font-medium ${
                         report.summaryVerdict === 'Promising' ? 'text-emerald-600' :
                         report.summaryVerdict === 'Risky' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {report.summaryVerdict}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-slate-300 group-hover:translate-x-1 transition-transform">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};