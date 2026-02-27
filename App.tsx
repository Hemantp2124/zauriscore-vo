import React, { useState, useEffect, useRef } from 'react';
import type { ViewState, ValidationReport, UserProfile, CustomModelConfig } from './types';
import { MOCK_REPORT } from './types';
import { validateIdea } from './services/geminiService';
import { api } from './services/api'; 
import { MarketingLandingView } from './views/MarketingLandingView';
import { InputView } from './views/InputView';
import { LoadingView } from './views/LoadingView';
import { ReportView } from './views/ReportView';
import { HistoryView } from './views/HistoryView';
import { PricingView } from './views/PricingView';
import { SettingsView } from './views/SettingsView';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { HelpView } from './views/HelpView';
import { ChatView } from './views/ChatView';
import { PurchaseSuccessView } from './views/PurchaseSuccessView';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import { AlertCircle, History, Settings, HelpCircle, LogIn, LayoutDashboard, LogOut, User as UserIcon, ChevronDown, Menu, Loader2 } from 'lucide-react';
import { Button } from './components/Button';

export const App: React.FC = () => {
  // --- User State ---
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('zauriscore_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    // Check URL params for marketing mode logic
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'waitlist') return 'marketing';

    if (localStorage.getItem('zauriscore_user')) return 'dashboard';
    return 'landing';
  });

  // --- Data State ---
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [originalIdea, setOriginalIdea] = useState<string>(''); 
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ValidationReport[]>([]);
  const [activeCustomModelId, setActiveCustomModelId] = useState<string | undefined>();
  
  const [credits, setCredits] = useState<number>(user?.credits || 1);
  const [isLifetime, setIsLifetime] = useState<boolean>(user?.isPro || false);

  // --- UI State ---
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [purchasedPlan, setPurchasedPlan] = useState<'single' | 'lifetime' | null>(null);
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);
  const [isTermsOpen, setTermsOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // 1. Load Data on Mount / User Change
  useEffect(() => {
    const loadData = async () => {
      // Local Storage Load (Guest)
      if (!user) {
        try {
          const savedHistory = localStorage.getItem('zauriscore_history');
          if (savedHistory) setHistory(JSON.parse(savedHistory));
          
          const savedCredits = localStorage.getItem('zauriscore_credits');
          if (savedCredits) setCredits(parseInt(savedCredits));
          
          const savedLifetime = localStorage.getItem('zauriscore_lifetime');
          if (savedLifetime === 'true') setIsLifetime(true);
        } catch (e) { console.error(e); }
        return;
      }

      // API Load (Authenticated)
      try {
        const dbHistory = await api.getHistory(user.email);
        setHistory(dbHistory);
        
        // Refresh user details to get accurate credits from DB
        const dbUser = await api.login(user.email, user.name); 
        setUser(dbUser);
        setCredits(dbUser.credits);
        setIsLifetime(dbUser.isPro);
      } catch (e) {
        console.error("Failed to sync with backend", e);
      }
    };

    loadData();
  }, [user]); 

  // 2. Click Outside Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Payment Verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
        verifyBackendPayment(sessionId);
    }
  }, []);

  // --- Handlers ---

  const verifyBackendPayment = async (sessionId: string) => {
    setIsVerifyingPayment(true);
    try {
        const response = await fetch(`http://localhost:4242/api/verify-payment?session_id=${sessionId}`);
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        
        const data = await response.json();

        if (data.verified) {
            window.history.replaceState({}, '', window.location.pathname);
            
            if (user && data.customer_email === user.email) {
                 if (data.plan === 'lifetime') {
                     handleUpdateProfile({ isPro: true });
                 } else {
                     handleUpdateProfile({ credits: credits + 1 });
                 }
            }
            
            handlePaymentSuccess(data.plan);
        } else {
            alert(`Payment not confirmed. Status: ${data.status || 'unknown'}`);
        }
    } catch (e) {
        console.error("Payment verification error:", e);
        alert("Connection error. Please check console.");
    } finally {
        setIsVerifyingPayment(false);
    }
  };

  const handlePaymentSuccess = (planType: string) => {
    const plan = planType === 'lifetime' ? 'lifetime' : 'single';
    
    if (plan === 'lifetime') {
        setIsLifetime(true);
        if (!user) localStorage.setItem('zauriscore_lifetime', 'true');
    } else {
        const newCredits = credits + 1;
        setCredits(newCredits);
        if (!user) localStorage.setItem('zauriscore_credits', newCredits.toString());
    }
    
    setPurchasedPlan(plan);
    setCurrentView('purchase_success');
  };

  const handleLogin = async (email: string, name: string, oauthUser?: any) => {
    try {
      const dbUser = oauthUser || await api.login(email, name);
      setUser(dbUser);
      setCredits(dbUser.credits);
      setIsLifetime(dbUser.isPro);
      localStorage.setItem('zauriscore_user', JSON.stringify(dbUser));
      setCurrentView('dashboard');
    } catch (e) {
      console.error("Login failed", e);
      alert("Login failed. Is the backend server running?");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('validator_user');
    setCurrentView('landing');
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('zauriscore_user', JSON.stringify(updated));

    try {
        await api.updateProfile(user.email, data);
    } catch (e) {
        console.error("Failed to sync profile update", e);
    }
  };

  const handleDeleteData = async () => {
    if (user) {
        try {
            await api.deleteAccount(user.email);
        } catch (e) {
            alert("Failed to delete account on server.");
            return;
        }
    }
    
    const keysToRemove = ['zauriscore_user', 'zauriscore_history', 'zauriscore_credits', 'zauriscore_lifetime'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setHistory([]);
    setCredits(1);
    setIsLifetime(false);
    setUser(null);
    setCurrentView('landing');
  };

  const handleStart = () => {
    if (!user) {
        setCurrentView('auth');
        return;
    }

    if (!isLifetime && credits <= 0) {
        setCurrentView('pricing');
        return;
    }
    setError(null);
    setCurrentView('input');
  };

  const handleExample = () => {
    setReport(MOCK_REPORT);
    setOriginalIdea(MOCK_REPORT.originalIdea || "");
    setCurrentView('report');
  };

  const handleSubmitIdea = async (idea: string, attachment?: { mimeType: string, data: string }, customModel?: CustomModelConfig) => {
    setCurrentView('loading');
    setError(null);
    setOriginalIdea(idea);
    setActiveCustomModelId(customModel?.id);
    
    try {
      // Pass user email to secure backend to enforce server-side credit check
      // Also pass custom model to route via client API if applicable
      const result = await validateIdea(idea, attachment, user?.email, customModel);
      
      const finalReport: ValidationReport = {
          ...result,
          id: result.id || crypto.randomUUID(),
          createdAt: result.createdAt || Date.now(),
          originalIdea: idea 
      };

      setReport(finalReport);
      setHistory([finalReport, ...history]);
      
      // If we used a custom model, we don't deduct backend credits to save the user money.
      // But we will still deduct a software credit locally if it went through the backend.
      // Assuming custom local models don't cost server credits:
      if (!customModel) {
        if (user) {
           if (!isLifetime) {
               const newCredits = credits - 1;
               setCredits(newCredits);
               const updatedUser = { ...user, credits: newCredits };
               setUser(updatedUser);
               localStorage.setItem('zauriscore_user', JSON.stringify(updatedUser));
           }
        } else {
            const guestHistory = [finalReport, ...history];
            localStorage.setItem('zauriscore_history', JSON.stringify(guestHistory));
            
            if (!isLifetime) {
                const newCredits = credits - 1;
                setCredits(newCredits);
                localStorage.setItem('zauriscore_credits', newCredits.toString());
            }
        }
      }

      setCurrentView('report');
    } catch (e: any) {
      console.error(e);
      let errorMessage = e.message || "Something went wrong.";
      if (errorMessage.includes("API Key is missing")) {
        errorMessage = "Configuration Error: API Key missing.";
      }
      if (errorMessage.includes("Insufficient credits")) {
        errorMessage = "You have run out of credits. Please purchase more to continue.";
      }
      setError(errorMessage);
      setCurrentView('error');
    }
  };

  const handleSimulatedPurchase = async (plan: 'single' | 'lifetime') => {
      if (plan === 'single') {
          const newCredits = credits + 1;
          setCredits(newCredits);
          if (user) handleUpdateProfile({ credits: newCredits });
          else localStorage.setItem('zauriscore_credits', newCredits.toString());
      } else {
          setIsLifetime(true);
          if (user) handleUpdateProfile({ isPro: true });
          else localStorage.setItem('zauriscore_lifetime', 'true');
      }
      setPurchasedPlan(plan);
      setCurrentView('purchase_success');
  };

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setUserMenuOpen(false);
  };

  const loadReport = (r: ValidationReport) => {
      setReport(r);
      setOriginalIdea(r.originalIdea || "Context missing.");
      setCurrentView('report');
  };

  if (isVerifyingPayment) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                     <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Verifying Payment...</h2>
              </div>
          </div>
      );
  }

  // --- Marketing / Landing View Intercept ---
  // Hide the old Landing View and replace it directly with the marketing waitlist
  if (currentView === 'marketing' || currentView === 'landing') {
      return <MarketingLandingView onGoToApp={() => setCurrentView('auth')} />;
  }

  const activeCustomModel = user?.preferences?.customModels?.find(m => m.id === activeCustomModelId);

  return (
    <div className="min-h-screen font-sans text-slate-900 flex flex-col">
      {currentView !== 'auth' && currentView !== 'chat' && (
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCurrentView(user ? 'dashboard' : 'landing')}>
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">ZauriScore</span>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
                <div 
                    className={`flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                        isLifetime ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => setCurrentView('pricing')}
                >
                    {isLifetime ? (
                        <span className="font-bold tracking-wide">LIFETIME</span>
                    ) : (
                        <span>{credits} Credits</span>
                    )}
                </div>

                {user ? (
                    <>
                        <button 
                          onClick={() => setCurrentView('dashboard')}
                          className={`hidden md:block text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Dashboard
                        </button>
                        <button 
                          onClick={() => setCurrentView('history')}
                          className={`hidden md:block text-sm font-medium transition-colors ${currentView === 'history' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          History
                        </button>
                        <div className="relative" ref={dropdownRef}>
                          <button 
                              onClick={() => setUserMenuOpen(!userMenuOpen)}
                              className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-100"
                          >
                              <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                  {user.name.charAt(0).toUpperCase()}
                              </div>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {userMenuOpen && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right">
                                  <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                  </div>
                                  <button onClick={() => handleNavClick('dashboard')} className="md:hidden w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                      <LayoutDashboard size={16} /> Dashboard
                                  </button>
                                  <button onClick={() => handleNavClick('history')} className="md:hidden w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                      <History size={16} /> History
                                  </button>
                                  <button onClick={() => handleNavClick('settings')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                      <Settings size={16} /> Settings
                                  </button>
                                  <button onClick={() => handleNavClick('help')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                      <HelpCircle size={16} /> Help
                                  </button>
                                  <div className="border-t border-slate-50 my-1 pt-1">
                                      <button onClick={() => { handleLogout(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium">
                                          <LogOut size={16} /> Log Out
                                      </button>
                                  </div>
                              </div>
                          )}
                        </div>
                    </>
                ) : (
                    <>
                        <button onClick={() => setCurrentView('history')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
                            <History size={20} />
                        </button>
                        <button onClick={() => setCurrentView('help')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
                            <HelpCircle size={20} />
                        </button>
                        <Button size="sm" variant="outline" onClick={() => setCurrentView('auth')} className="flex gap-2 ml-2">
                          <LogIn size={16} /> <span className="hidden sm:inline">Log in</span>
                        </Button>
                    </>
                )}
            </div>
          </div>
        </nav>
      )}

      <main className={`flex-grow ${currentView === 'chat' ? 'h-screen' : 'py-8 md:py-12'}`}>
        {currentView === 'auth' && (
            <AuthView onLogin={handleLogin} onBack={() => setCurrentView('landing')} />
        )}
        {currentView === 'dashboard' && user && (
            <DashboardView 
                user={user}
                history={history}
                onValidateNew={handleStart}
                onViewHistory={() => setCurrentView('history')}
                onViewReport={loadReport}
            />
        )}
        {currentView === 'input' && (
          <InputView user={user} onBack={() => setCurrentView(user ? 'dashboard' : 'landing')} onSubmit={handleSubmitIdea} />
        )}
        {currentView === 'loading' && (
          <LoadingView />
        )}
        {currentView === 'report' && report && (
          <ReportView 
            report={report} 
            onReset={() => { setReport(null); handleStart(); }} 
            onUpgrade={() => setCurrentView('pricing')} 
            onChat={() => setCurrentView('chat')}
          />
        )}
        {currentView === 'chat' && report && (
          <ChatView 
             report={report} 
             originalIdea={originalIdea}
             customModel={activeCustomModel}
             onBack={() => setCurrentView('report')} 
          />
        )}
        {currentView === 'history' && (
            <HistoryView 
                history={history} 
                onSelect={loadReport}
                onClear={() => handleDeleteData()} 
                onBack={() => setCurrentView(user ? 'dashboard' : 'landing')}
            />
        )}
        {currentView === 'pricing' && (
            <PricingView onPurchase={handleSimulatedPurchase} onBack={() => setCurrentView(user ? 'dashboard' : 'landing')} />
        )}
        {currentView === 'purchase_success' && purchasedPlan && (
            <PurchaseSuccessView plan={purchasedPlan} onContinue={() => setCurrentView('input')} />
        )}
        {currentView === 'settings' && (
            <SettingsView 
                user={user}
                history={history}
                onBack={() => setCurrentView(user ? 'dashboard' : 'landing')}
                onDeleteData={handleDeleteData}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogout}
                credits={credits}
                isLifetime={isLifetime}
            />
        )}
        {currentView === 'help' && (
            <HelpView onBack={() => setCurrentView(user ? 'dashboard' : 'landing')} />
        )}
        {currentView === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
            <div className="bg-rose-50 p-4 rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Failed</h2>
            <p className="text-slate-500 max-w-md mb-8">
              {error || "We couldn't process your request at this time. Please try again."}
            </p>
            <div className="flex gap-4">
              <Button onClick={() => setCurrentView('input')}>Try Again</Button>
              <Button variant="outline" onClick={() => setCurrentView(user ? 'dashboard' : 'landing')}>Go Home</Button>
            </div>
          </div>
        )}
      </main>

      {currentView !== 'chat' && (
        <Footer 
            onOpenPrivacy={() => setPrivacyOpen(true)} 
            onOpenTerms={() => setTermsOpen(true)}
            onOpenWaitlist={() => setCurrentView('marketing')}
        />
      )}

      <Modal isOpen={isPrivacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
        <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
            <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
            <p>Your privacy is important to us.</p>
            <h4 className="font-bold text-slate-900">Data Storage</h4>
            <p>If logged in, your data is securely stored in our encrypted database. Guest data remains on your device.</p>
        </div>
      </Modal>

      <Modal isOpen={isTermsOpen} onClose={() => setTermsOpen(false)} title="Terms of Service">
        <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
            <p>By using ZauriScore, you agree to these terms.</p>
            <h4 className="font-bold text-slate-900">Usage</h4>
            <p>This tool provides AI-generated feedback. We are not responsible for business decisions made based on this output.</p>
        </div>
      </Modal>
    </div>
  );
};