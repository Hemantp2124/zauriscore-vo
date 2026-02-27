import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Check, Shield, Loader2, AlertCircle, CreditCard, Lock, ExternalLink } from 'lucide-react';

interface PricingViewProps {
  onPurchase: (plan: 'single' | 'lifetime') => Promise<void>;
  onBack: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onPurchase, onBack }) => {
  const [processing, setProcessing] = useState<'single' | 'lifetime' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSimulatedCheckout, setShowSimulatedCheckout] = useState(false);
  
  const [stripeLinks, setStripeLinks] = useState<{ single?: string; lifetime?: string }>({});

  useEffect(() => {
    // Safely attempt to load env vars without crashing in browser
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            setStripeLinks({
                // @ts-ignore
                single: process.env.STRIPE_PAYMENT_LINK_SINGLE,
                // @ts-ignore
                lifetime: process.env.STRIPE_PAYMENT_LINK_LIFETIME
            });
        }
    } catch (e) {
        // Ignore env errors, default to simulation
        console.log("Stripe env vars not detected, using simulation mode.");
    }
  }, []);

  const handleBuyClick = (plan: 'single' | 'lifetime') => {
    // If Stripe Links are configured, redirect the user
    if (plan === 'single' && stripeLinks.single) {
        window.location.href = stripeLinks.single;
        return;
    }
    if (plan === 'lifetime' && stripeLinks.lifetime) {
        window.location.href = stripeLinks.lifetime;
        return;
    }

    // Fallback to Simulation if no keys are present
    setShowSimulatedCheckout(true);
    // Auto-progress simulated checkout
    setTimeout(() => handleConfirmPurchase(plan), 1500);
  };

  const handleConfirmPurchase = async (plan: 'single' | 'lifetime') => {
    setProcessing(plan);
    setError(null);
    try {
        await onPurchase(plan);
    } catch (e) {
        setError("Payment declined. Please try a different card.");
        setShowSimulatedCheckout(false);
    } finally {
        setProcessing(null);
    }
  };

  if (showSimulatedCheckout) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in">
           <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Loader2 className="animate-spin" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Secure Checkout</h2>
              <p className="text-slate-500 mb-6">Contacting payment provider...</p>
              
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded">
                 <Lock size={12} /> Encrypted via Stripe (Simulated)
              </div>
           </div>
        </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Validate smarter, not harder.</h1>
        <p className="text-xl text-slate-500">Stop building things nobody wants. Get the truth before you code.</p>
      </div>
      
      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Single Pass */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
           <h3 className="text-lg font-medium text-slate-500 mb-2">One-Time</h3>
           <div className="flex items-baseline gap-1 mb-6">
             <span className="text-4xl font-bold text-slate-900">$9</span>
             <span className="text-slate-400">/ idea</span>
           </div>
           
           <ul className="space-y-4 mb-8 flex-grow">
             <li className="flex gap-3 text-slate-700">
               <Check className="text-emerald-500 shrink-0" size={20} /> Full Market Analysis
             </li>
             <li className="flex gap-3 text-slate-700">
               <Check className="text-emerald-500 shrink-0" size={20} /> Competitor Deep Dive
             </li>
             <li className="flex gap-3 text-slate-700">
               <Check className="text-emerald-500 shrink-0" size={20} /> Shareable Report Link
             </li>
           </ul>

           <Button 
             fullWidth 
             onClick={() => handleBuyClick('single')} 
             variant="secondary"
             className="relative"
           >
             Buy 1 Credit
           </Button>
        </div>

        {/* Lifetime */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden text-white transform md:-translate-y-4 flex flex-col">
           <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
             BEST VALUE
           </div>
           <h3 className="text-lg font-medium text-slate-400 mb-2">Founder Lifetime</h3>
           <div className="flex items-baseline gap-1 mb-6">
             <span className="text-4xl font-bold text-white">$25</span>
             <span className="text-slate-400">/ once</span>
           </div>
           
           <ul className="space-y-4 mb-8 flex-grow">
             <li className="flex gap-3 text-slate-200">
               <Check className="text-emerald-400 shrink-0" size={20} /> Unlimited Validations
             </li>
             <li className="flex gap-3 text-slate-200">
               <Check className="text-emerald-400 shrink-0" size={20} /> Priority Processing
             </li>
             <li className="flex gap-3 text-slate-200">
               <Check className="text-emerald-400 shrink-0" size={20} /> Future Model Upgrades
             </li>
             <li className="flex gap-3 text-slate-200">
               <Shield className="text-emerald-400 shrink-0" size={20} /> 30-Day Guarantee
             </li>
           </ul>

           <Button 
             fullWidth 
             onClick={() => handleBuyClick('lifetime')} 
             className="bg-emerald-500 hover:bg-emerald-600 border-none text-white relative"
           >
             Get Lifetime Access
           </Button>
           <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
             <CreditCard size={12} /> Secured by Stripe
           </p>
        </div>
      </div>
      
      <div className="text-center mt-12">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 font-medium">
          Maybe later, go back
        </button>
      </div>
    </div>
  );
};