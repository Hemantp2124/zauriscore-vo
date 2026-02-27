import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ArrowLeft, Mail, Lock, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

interface AuthViewProps {
  onLogin: (email: string, name: string, user?: any) => void;
  onBack: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

// Simple Google Logo Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const userData = event.data.user;
        if (userData) {
          onLogin(userData.email, userData.name, userData);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate API network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (mode === 'forgot') {
      if (!email.includes('@')) {
        setError("Please enter a valid email address.");
        setIsLoading(false);
        return;
      }
      setResetSent(true);
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setIsLoading(false);
        return;
      }
      // Mock login success
      const displayName = name || email.split('@')[0] || "Founder";
      onLogin(email, displayName);
    }
    
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = await api.getGoogleAuthUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        setError("Popup blocked. Please allow popups for this site.");
        setIsLoading(false);
      }
      // The message listener in useEffect will handle the success
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize Google login.");
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setResetSent(false);
    setEmail('');
    setPassword('');
    setName('');
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    
    if (pass.length < 6) return { score: 1, label: 'Too short', color: 'bg-rose-400', textColor: 'text-rose-500' };

    let s = 0;
    if (pass.length >= 6) s += 1; 
    if (pass.length >= 10) s += 1; 
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass)) s += 1; 
    if (/[^A-Za-z0-9]/.test(pass)) s += 1; 

    if (s === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
    if (s === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (s === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    if (s >= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
    
    return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 animate-fade-in relative">
      <button 
        onClick={onBack} 
        className="absolute top-0 left-0 md:top-8 md:left-8 text-slate-400 hover:text-slate-700 flex items-center gap-2 transition-colors py-4 px-4 font-medium text-sm"
      >
        <ArrowLeft size={16} /> Back to home
      </button>

      <div className="w-full max-w-md mt-8 md:mt-0">
        
        {/* Marketing / Beta Notification Banner */}
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center shadow-sm">
            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase tracking-wide mb-2 flex items-center justify-center gap-1 mx-auto w-fit">
                <Clock size={14} /> Closed Beta
            </span>
            <p className="text-emerald-800 text-sm font-medium">
                Beta accounts are activated within <strong className="font-bold">24 hours</strong> of request. Log in below once you receive your confirmation email.
            </p>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-xl font-bold text-2xl mb-6 shadow-lg shadow-slate-900/20">
            V
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            {mode === 'login' && 'Access the Beta'}
            {mode === 'signup' && 'Claim your invite'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            {mode === 'login' && 'Welcome back, Founder. Enter your credentials to review your validations.'}
            {mode === 'signup' && 'Received your beta approval email? Set up your private account below.'}
            {mode === 'forgot' && 'Enter your email to get back on track.'}
          </p>
        </div>

        <Card className="p-8 shadow-2xl shadow-slate-200/50 border-slate-200">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3 text-rose-700 text-sm animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {resetSent && mode === 'forgot' ? (
            <div className="text-center py-8 animate-fade-in-up">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h3>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                We've sent a secure password reset link to <br/><span className="font-medium text-slate-900">{email}</span>
              </p>
              <Button fullWidth onClick={() => handleModeSwitch('login')}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              {/* Provider Login */}
              {mode !== 'forgot' && (
                <div className="mb-6">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    fullWidth 
                    onClick={handleGoogleLogin} 
                    className="flex items-center justify-center gap-3 py-2.5 text-slate-700 font-medium bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
                    disabled={isLoading}
                  >
                    <GoogleIcon /> Continue with Google
                  </Button>
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-400 font-medium">Or continue with email</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <div className="animate-fade-in-up">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                      <input 
                        type="text" 
                        required 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                        placeholder="Elon M."
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                      placeholder="founder@startup.com"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="animate-fade-in-up">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                      <input 
                        type="password" 
                        required 
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                        placeholder="••••••••"
                      />
                    </div>
                    {/* Password Strength Meter (Signup Only) */}
                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-2 animate-fade-in">
                        <div className="flex gap-1 h-1.5 mb-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div 
                              key={level}
                              className={`h-full rounded-full flex-1 transition-all duration-300 ${
                                strength.score >= level ? strength.color : 'bg-slate-100'
                              }`} 
                            />
                          ))}
                        </div>
                        <p className={`text-xs text-right font-medium transition-colors duration-300 ${strength.textColor}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button fullWidth type="submit" disabled={isLoading} className="mt-2 py-3 shadow-lg shadow-slate-900/10">
                  {isLoading ? (
                    <span className="flex items-center gap-2">Processing...</span>
                  ) : (
                    mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>

        <div className="text-center mt-8 text-sm text-slate-600 space-y-3">
          {mode === 'login' && (
            <>
              <div>
                <button type="button" onClick={() => handleModeSwitch('forgot')} className="text-slate-500 hover:text-slate-900 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div>
                Approved for beta?{' '}
                <button type="button" onClick={() => handleModeSwitch('signup')} className="font-semibold text-slate-900 hover:underline">
                  Sign up here
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button type="button" onClick={() => handleModeSwitch('login')} className="font-semibold text-slate-900 hover:underline">
                Sign in
              </button>
            </div>
          )}

          {mode === 'forgot' && !resetSent && (
            <div>
              <button type="button" onClick={() => handleModeSwitch('login')} className="font-semibold text-slate-900 hover:underline flex items-center justify-center gap-2 mx-auto">
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};