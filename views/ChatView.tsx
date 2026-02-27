import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { ValidationReport, ChatMessage, CustomModelConfig } from '../types';
import { initializeChat } from '../services/geminiService';
import { ArrowLeft, Send, Sparkles, User, Bot, StopCircle, RefreshCw, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GenerateContentResponse } from "@google/genai";

interface ChatViewProps {
  report: ValidationReport;
  originalIdea: string; 
  customModel?: CustomModelConfig;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ report, originalIdea, customModel, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `I've analyzed your idea for **${report.oneLineTakeaway}**. I can help you refine your strategy, draft landing page copy, or brainstorm how to beat competitors like *${report.competitors[0]?.name || 'others'}*. \n\nWhat would you like to tackle first?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<ReturnType<typeof initializeChat> | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (!chatSession) {
      try {
        const session = initializeChat(report, originalIdea, customModel);
        setChatSession(session);
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    }
  }, [report, originalIdea, customModel, chatSession]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Create a placeholder for the AI response
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: aiMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        isStreaming: true
      }]);

      const result = await chatSession.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text || '';
        fullText += textChunk;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, text: fullText } 
              : msg
          )
        );
      }

      // Finalize message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );

    } catch (e) {
      console.error("Chat error", e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error connecting to the model. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Write a landing page headline",
    "How do I find my first 10 users?",
    "Critique my monetization strategy",
    "Roleplay a customer interview"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Report
        </button>
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <Sparkles size={16} className="text-emerald-500" />
          <span>Co-Founder AI</span>
        </div>
        <div className="w-16 flex justify-end">
            {customModel && (
               <div className="flex items-center justify-center p-1.5 bg-slate-100 rounded-md" title={`Using ${customModel.provider}`}>
                   <Key size={14} className="text-slate-500" />
               </div>
            )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-emerald-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white' 
                : 'bg-white border border-slate-200 text-slate-800'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-slate-400">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle"></span>
                  )}
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          
          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for details, marketing ideas, or specific feedback..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-sm text-slate-900 placeholder:text-slate-400"
              rows={1}
              style={{ height: 'auto', minHeight: '44px' }}
            />
            <Button 
              size="sm" 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className={`mb-1 transition-all ${isLoading ? 'opacity-50' : ''}`}
            >
              {isLoading ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};