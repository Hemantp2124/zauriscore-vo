import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ArrowRight, CheckCircle2, Zap, Shield, TrendingUp, Mail, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface MarketingLandingViewProps {
  onGoToApp: () => void;
}

export const MarketingLandingView: React.FC<MarketingLandingViewProps> = ({ onGoToApp }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Stronger Email Validation Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        setErrorMsg("Please enter a valid email address.");
        return;
    }
    
    setStatus('loading');
    setErrorMsg('');

    try {
        await api.joinWaitlist(email, 'marketing_page_v1');
        setStatus('success');
        setEmail('');
    } catch (err) {
        setStatus('error');
        setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Marketing Header */}
      <nav className="max-w-6xl mx-auto w-full px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">Z</span>
            </div>
            <span className="font-bold text-xl tracking-tight">ZauriScore</span>
        </div>
        <button onClick={onGoToApp} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
        </button>
      </nav>

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        
        {/* Abstract Background Blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-semibold mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Accepting Early Access
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
            Stop building startups <br className="hidden md:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">in the dark.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            Get instant, AI-powered validation for your startup ideas. Analyze markets, spy on competitors, and find monetization gaps before you write a single line of code.
        </p>

        {/* Waitlist Form */}
        <div className="w-full max-w-md relative z-10">
            {status === 'success' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center animate-fade-in">
                    <div className="w-12 h-12 bg-emerald-500 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">You're on the list!</h3>
                    <p className="text-emerald-200 text-sm">We'll notify you when your spot opens up.</p>
                    <button onClick={() => setStatus('idle')} className="text-xs text-slate-400 hover:text-white mt-4 underline">Register another email</button>
                </div>
            ) : (
                <form onSubmit={handleJoinWaitlist} className="flex flex-col gap-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-500" size={20} />
                        <input 
                            type="email" 
                            placeholder="founder@startup.com" 
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Button 
                        size="lg" 
                        fullWidth 
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold h-12"
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? <Loader2 className="animate-spin" /> : "Request Beta Access"}
                    </Button>
                    {status === 'error' && (
                        <p className="text-rose-400 text-sm">{errorMsg}</p>
                    )}
                </form>
            )}
            <p className="text-slate-500 text-xs mt-4">Get early access before our public launch.</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-slate-950 py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mb-6">
                    <TrendingUp size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Brutal Market Reality</h3>
                <p className="text-slate-400 leading-relaxed">We don't sugarcoat. Our AI acts as a skeptical investor to tell you why your idea might fail—so you can fix it.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center mb-6">
                    <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Competitor X-Ray</h3>
                <p className="text-slate-400 leading-relaxed">Discover who is already solving this problem and find the specific feature gap they are ignoring.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center mb-6">
                    <Zap size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Validation</h3>
                <p className="text-slate-400 leading-relaxed">Don't spend 3 months building an MVP. Spend 3 minutes getting a 360-degree analysis report.</p>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} ZauriScore. All rights reserved.</p>
        <button onClick={onGoToApp} className="mt-2 hover:text-white transition-colors">Already have access? Login here.</button>
      </footer>
    </div>
  );
};