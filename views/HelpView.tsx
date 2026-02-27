import React from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ArrowLeft, MessageCircle, FileText } from 'lucide-react';

interface HelpViewProps {
  onBack: () => void;
}

export const HelpView: React.FC<HelpViewProps> = ({ onBack }) => {
  const faqs = [
    {
      q: "How accurate is the AI validation?",
      a: "The AI uses broad market patterns and logic to simulate potential feedback. It is a tool for reasoning and identifying gaps, not a crystal ball. Always verify with real user interviews."
    },
    {
      q: "Is my idea data safe?",
      a: "Yes. We do not use your specific idea submissions to train our public models in a way that would leak your IP. Data is stored locally on your device unless you choose to share it."
    },
    {
      q: "Can I get a refund?",
      a: "If you experienced a technical failure or are unsatisfied with the lifetime purchase, please contact support within 30 days."
    },
    {
      q: "What does the 'Viability Score' mean?",
      a: "It's a rough heuristic based on problem clarity, market size, and competition. A low score doesn't mean you should give up, but suggests you need to refine the problem statement."
    }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">Help Center</h1>
      <p className="text-slate-500 mb-8">Frequently asked questions and support.</p>

      <div className="space-y-6">
        <Card title="Frequently Asked Questions">
          <div className="divide-y divide-slate-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <h4 className="font-semibold text-slate-900 mb-2">{faq.q}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Contact Support">
          <p className="text-slate-600 text-sm mb-6">
            Still need help? Our support team is available Mon-Fri.
          </p>
          <div className="flex gap-4">
             <Button variant="outline" className="gap-2" onClick={() => window.open('mailto:support@validator.ai')}>
                <MessageCircle size={18} /> Email Support
             </Button>
             <Button variant="outline" className="gap-2" onClick={() => alert("Documentation placeholder")}>
                <FileText size={18} /> Documentation
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};