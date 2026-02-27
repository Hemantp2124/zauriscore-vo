import React from 'react';
import { Button } from '../components/Button';
import { CheckCircle2, Zap, Shield, ArrowRight } from 'lucide-react';

interface PurchaseSuccessViewProps {
  plan: 'single' | 'lifetime';
  onContinue: () => void;
}

export const PurchaseSuccessView: React.FC<PurchaseSuccessViewProps> = ({ plan, onContinue }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in max-w-2xl mx-auto">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 ring-8 ring-emerald-50/50 shadow-sm">
        <CheckCircle2 size={48} />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">You're validating smarter.</h1>
      <p className="text-lg text-slate-500 mb-10 max-w-lg">
        Thank you for your purchase. Your account has been updated instantly.
      </p>
      
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-10">
        <div className="flex flex-col items-center justify-center gap-4">
            <div className={`p-4 rounded-full ${plan === 'lifetime' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600'}`}>
                {plan === 'lifetime' ? (
                    <Shield size={32} />
                ) : (
                    <Zap size={32} />
                )}
            </div>
            
            <div>
                <h3 className="font-bold text-xl text-slate-900 mb-1">
                    {plan === 'lifetime' ? 'Founder Lifetime Access' : 'Single Validation Credit'}
                </h3>
                <p className="text-slate-500">
                    {plan === 'lifetime' 
                        ? "You now have unlimited access to all AI validation tools." 
                        : "1 validation credit has been added to your balance."}
                </p>
            </div>
        </div>
      </div>

      <Button size="lg" onClick={onContinue} className="min-w-[240px] gap-2 text-lg h-14">
        Start Validating <ArrowRight size={20} />
      </Button>
      
      <p className="text-slate-400 text-sm mt-8">
        A receipt has been sent to your email address.
      </p>
    </div>
  );
};