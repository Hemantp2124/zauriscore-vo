import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { UserProfile } from '../types';
import { ArrowLeft, Sparkles, Upload, FileText, X, AlertCircle, Mic, Square, Trash2, Play, Pause, CheckCircle2, Key } from 'lucide-react';

interface InputViewProps {
  user: UserProfile | null;
  onBack: () => void;
  onSubmit: (idea: string, attachment?: { mimeType: string, data: string }, customModelId?: string) => void;
}

export const InputView: React.FC<InputViewProps> = ({ user, onBack, onSubmit }) => {
  const [idea, setIdea] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("default");
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Custom Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const customModels = user?.preferences?.customModels || [];

  // Validation Constants
  const MIN_TEXT_LENGTH = 10;
  const textLength = idea.trim().length;
  const hasSufficientText = textLength >= MIN_TEXT_LENGTH;
  const hasAttachment = attachment !== null;
  const canSubmit = hasSufficientText || hasAttachment;

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    setAttachment(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Convert to Base64 for API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
           const base64String = reader.result as string;
           const base64Data = base64String.split(',')[1];
           setAttachment({
             name: "Audio Pitch",
             mimeType: audioBlob.type,
             data: base64Data
           });
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setAttachment(null);
    setRecordingTime(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  };

  // Custom Player Handlers
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
    }
  };

  const handleSubmit = () => {
    if (canSubmit) {
      const modelParam = selectedModelId === 'default' ? undefined : selectedModelId;
      if (attachment) {
          onSubmit(idea, { mimeType: attachment.mimeType, data: attachment.data }, modelParam);
      } else {
          onSubmit(idea, undefined, modelParam);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    deleteRecording();

    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        if (file.size > 20 * 1024 * 1024) {
            setError("File is too large. Max size is 20MB due to API limits.");
            return;
        }

        if (file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            // Reset player state
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
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
        <p className="text-slate-500 mb-6">Describe your product, record a voice note, or upload a pitch deck or audio file.</p>

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
                accept=".pdf,.txt,.md,.csv,.doc,.docx,.rtf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
                onChange={handleFileChange}
             />
             
             {/* Active Recording State */}
             {isRecording && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>
                        <span className="font-mono text-rose-700 font-bold text-lg">{formatTime(recordingTime)}</span>
                        <span className="text-rose-600 text-sm">Recording...</span>
                    </div>
                    <Button onClick={stopRecording} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white border-none gap-2">
                        <Square size={16} fill="currentColor" /> Stop
                    </Button>
                </div>
             )}

             {/* Recorded/Uploaded Audio State (Custom Player) */}
             {!isRecording && audioUrl && (
                 <div className="p-4 bg-slate-900 rounded-xl flex items-center gap-4 shadow-md w-full">
                     <button 
                        onClick={togglePlayback}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500"
                        title={isPlaying ? "Pause" : "Play"}
                     >
                         {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                     </button>
                     
                     <div className="flex-grow flex flex-col justify-center min-w-0 space-y-2">
                         <div className="flex justify-between text-xs text-slate-400 font-medium items-center">
                            <span className="truncate pr-2 max-w-[150px] sm:max-w-[200px]">{attachment?.name || "Voice Pitch Recorded"}</span>
                            <span className="font-mono tabular-nums bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {formatTime(currentTime)} / {formatTime(duration || 0)}
                            </span>
                         </div>
                         
                         {/* Hidden Audio Element */}
                         <audio 
                            ref={audioRef} 
                            src={audioUrl} 
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            className="hidden"
                         />
                         
                         {/* Custom Seek Bar */}
                         <div className="relative w-full h-1.5 bg-slate-700 rounded-full">
                             <div 
                                className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full pointer-events-none" 
                                style={{ width: `${(duration > 0 ? (currentTime / duration) * 100 : 0)}%` }}
                             />
                             <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                step="0.1"
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute top-[-5px] left-0 w-full h-4 opacity-0 cursor-pointer"
                                title="Seek"
                             />
                         </div>
                     </div>

                     <button 
                        onClick={deleteRecording} 
                        className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors p-2 flex-shrink-0"
                        title="Delete recording"
                     >
                         <Trash2 size={20} />
                     </button>
                 </div>
             )}

             {/* Document Upload State (Non-Audio) */}
             {!isRecording && !audioUrl && attachment && (
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

             {/* Default Buttons (Show if not recording and no attachments) */}
             {!isRecording && !audioUrl && !attachment && (
                 <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all font-medium text-sm"
                     >
                        <Upload size={24} /> 
                        <span>Upload File / Audio</span>
                     </button>
                     <button 
                        onClick={startRecording}
                        className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-medium text-sm group"
                     >
                        <Mic size={24} className="group-hover:text-rose-500" /> 
                        <span>Record Audio</span>
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
            onClick={handleSubmit} 
            disabled={!canSubmit}
            className="gap-2 w-full sm:w-auto h-[42px]"
          >
            <Sparkles size={18} /> Analyze Idea
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          AI analyzes text, documents, and audio patterns. <br/>Results are for guidance only.
        </p>
      </div>
    </div>
  );
};