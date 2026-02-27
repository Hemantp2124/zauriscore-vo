import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { UserProfile, CustomModelConfig } from '../types';
import { ArrowLeft, Sparkles, Upload, FileText, X, AlertCircle, CheckCircle2, Key } from 'lucide-react';

interface InputViewProps {
  user: UserProfile | null;
  onBack: () => void;
  onSubmit: (idea: string, attachment?: { mimeType: string, data: string }, customModel?: CustomModelConfig) => void;
}

export const InputView: React.FC<InputViewProps> = ({ user, onBack, onSubmit }) => {
  const [idea, setIdea] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("default");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customModels = user?.preferences?.customModels || [];

  // Validation Constants
  const MIN_TEXT_LENGTH = 10;
  const textLength = idea.trim().length;
  const hasSufficientText = textLength >= MIN_TEXT_LENGTH;
  const hasAttachment = attachment !== null;
  const canSubmit = hasSufficientText || hasAttachment;

  const handleSubmitIdea = () => {
    if (canSubmit) {
      const customModel = customModels.find(m => m.id === selectedModelId);
      if (attachment) {
          onSubmit(idea, { mimeType: attachment.mimeType, data: attachment.data }, customModel);
      } else {
          onSubmit(idea, undefined, customModel);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);

    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        if (file.size > 20 * 1024 * 1024) {
            setError("File is too large. Max size is 20MB due to API limits.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            
            setAttachment({
                name: file.name,
                mimeType: file.type,
                data: base64Data
            });
        };
        reader.onerror = () => {
            setError("Failed to read file.");
        };
        reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
      setAttachment(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  return (
    <div className="max-w-2xl mx-auto w-full pt-8 px-4">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Pitch your idea</h2>
        <p className="text-slate-500 mb-6">Describe your product or upload a pitch deck or document.</p>

        {/* Text Area */}
        <textarea 
          className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none text-slate-800 placeholder:text-slate-400 text-lg leading-relaxed mb-6"
          placeholder="e.g. A marketplace for freelance chefs to cook weekly meals in people's homes..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />

        {/* Attachments Section */}
        <div className="space-y-4">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt,.md,.csv,.doc,.docx,.rtf"
                onChange={handleFileChange}
             />
             
             {/* Document Upload State */}
             {attachment && (
                 <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                     <div className="flex items-center gap-3 overflow-hidden">
                         <div className="p-2 bg-white rounded-md text-blue-600 shrink-0">
                             <FileText size={20} />
                         </div>
                         <div className="min-w-0">
                             <p className="text-sm font-medium text-slate-900 truncate">{attachment.name}</p>
                             <p className="text-xs text-slate-500">Document attached</p>
                         </div>
                     </div>
                     <button onClick={removeFile} className="p-2 hover:bg-blue-100 rounded-full text-slate-500 hover:text-rose-500 transition-colors">
                         <X size={18} />
                     </button>
                 </div>
             )}

             {/* Default Buttons (Show if no attachments) */}
             {!attachment && (
                 <div className="w-full">
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all font-medium text-sm"
                     >
                        <Upload size={24} /> 
                        <span>Upload Pitch Deck / Document</span>
                     </button>
                 </div>
             )}
        </div>

        {error && (
            <div className="flex items-center gap-2 text-rose-600 text-sm mb-4 bg-rose-50 p-3 rounded-lg mt-4">
                <AlertCircle size={16} /> {error}
            </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-slate-100 gap-4">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              {!canSubmit ? (
                 <div className="text-slate-400 text-sm flex items-center gap-2 animate-fade-in transition-all">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    {textLength > 0 ? (
                        <span>{MIN_TEXT_LENGTH - textLength} more characters needed</span>
                    ) : (
                        <span>Enter description or upload file</span>
                    )}
                 </div>
              ) : (
                 <div className="text-emerald-600 text-sm font-medium flex items-center gap-2 animate-fade-in transition-all">
                    <CheckCircle2 size={16} />
                    <span>Ready to analyze</span>
                 </div>
              )}
            </div>
            
            {/* Custom Model Selector */}
            {customModels.length > 0 && (
               <div className="relative mt-1">
                   <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                       <Key size={14} className="text-slate-400" />
                   </div>
                   <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-slate-900 focus:border-slate-900 block w-full pl-7 p-2 appearance-none"
                   >
                      <option value="default">ZauriScore (Default)</option>
                      {customModels.map(m => (
                          <option key={m.id} value={m.id}>{m.provider} - {m.model}</option>
                      ))}
                   </select>
               </div>
            )}
          </div>

          <Button 
            onClick={handleSubmitIdea} 
            disabled={!canSubmit}
            className="gap-2 w-full sm:w-auto h-[42px]"
          >
            <Sparkles size={18} /> Analyze Idea
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          AI analyzes text and documents. <br/>Results are for guidance only.
        </p>
      </div>
    </div>
  );
};