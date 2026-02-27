import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenWaitlist?: () => void; // Optional prop to avoid breaking existing implementations immediately
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms, onOpenWaitlist }) => {
  return (
    <footer className="border-t border-slate-200 py-8 mt-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-slate-400 text-sm mb-4">
          &copy; {new Date().getFullYear()} ZauriScore. Built for founders.
        </p>
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <button onClick={onOpenPrivacy} className="hover:text-slate-600 transition-colors">Privacy Policy</button>
          <button onClick={onOpenTerms} className="hover:text-slate-600 transition-colors">Terms of Service</button>
          {onOpenWaitlist && (
             <button onClick={onOpenWaitlist} className="hover:text-slate-600 transition-colors">Waitlist</button>
          )}
          <span className="text-slate-300">|</span>
          <span className="italic">Not investment advice. AI results vary.</span>
        </div>
      </div>
    </footer>
  );
};