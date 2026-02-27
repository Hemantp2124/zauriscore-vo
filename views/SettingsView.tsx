import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Download, Shield, Mail, User, Bell, Lock, Camera, CheckCircle2, AlertCircle, Loader2, AlertTriangle, FileArchive, Trash2, Key, Plus } from 'lucide-react';
import { UserProfile, ValidationReport, CustomModelConfig } from '../types';
import { jsPDF } from "jspdf";
import JSZip from "jszip";

interface SettingsViewProps {
  user: UserProfile | null;
  history: ValidationReport[];
  onBack: () => void;
  onDeleteData: () => void;
  onUpdateProfile: (data: Partial<UserProfile>) => void;
  onLogout: () => void;
  credits: number;
  isLifetime: boolean;
}

const PROVIDERS = ['Google', 'OpenAI', 'Anthropic', 'OpenRouter'];

const PROVIDER_MODELS: Record<string, string[]> = {
  'Google': ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-exp'],
  'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
  'Anthropic': ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus']
  // OpenRouter models are typed manually due to the vast number of options
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  user,
  history,
  onBack, 
  onDeleteData,
  onUpdateProfile,
  onLogout,
  credits,
  isLifetime 
}) => {
  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  
  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(user?.preferences?.emailNotifications ?? true);
  const [marketingEmails, setMarketingEmails] = useState(user?.preferences?.marketingEmails ?? false);
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>(user?.preferences?.customModels || []);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'notifications' | 'models'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Custom Model Modal State
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [newModelProvider, setNewModelProvider] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if user prop changes externally
  useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setAvatarUrl(user.avatarUrl);
        if (user.preferences) {
            setEmailNotifications(user.preferences.emailNotifications);
            setMarketingEmails(user.preferences.marketingEmails);
            if (user.preferences.customModels) {
                setCustomModels(user.preferences.customModels);
            }
        }
    }
  }, [user]);

  const handleProfileSave = async () => {
    setIsSaving(true);
    await onUpdateProfile({ 
        name, 
        email,
        avatarUrl
    });
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      onUpdateProfile({ avatarUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const toggleNotification = (type: 'email' | 'marketing') => {
      let newEmailNotifs = emailNotifications;
      let newMarketing = marketingEmails;

      if (type === 'email') {
          newEmailNotifs = !emailNotifications;
          setEmailNotifications(newEmailNotifs);
      } else {
          newMarketing = !marketingEmails;
          setMarketingEmails(newMarketing);
      }

      onUpdateProfile({
          preferences: {
              ...(user?.preferences || { theme: 'light', emailNotifications: true, marketingEmails: false }),
              emailNotifications: newEmailNotifs,
              marketingEmails: newMarketing,
              customModels: customModels
          }
      });
  };

  const handleAddCustomModel = () => {
      if (!newModelProvider || !newModelName || !newModelApiKey) return;

      const newModel: CustomModelConfig = {
          id: Date.now().toString(),
          provider: newModelProvider,
          model: newModelName.trim(),
          apiKey: newModelApiKey.trim()
      };

      const updatedModels = [...customModels, newModel];
      setCustomModels(updatedModels);
      
      onUpdateProfile({
          preferences: {
              ...(user?.preferences || { theme: 'light', emailNotifications: true, marketingEmails: false }),
              customModels: updatedModels
          }
      });

      // Reset and close
      setNewModelProvider('');
      setNewModelName('');
      setNewModelApiKey('');
      setIsAddModelModalOpen(false);
  };

  const handleRemoveCustomModel = (id: string) => {
      const updatedModels = customModels.filter(m => m.id !== id);
      setCustomModels(updatedModels);
      
      onUpdateProfile({
          preferences: {
              ...(user?.preferences || { theme: 'light', emailNotifications: true, marketingEmails: false }),
              customModels: updatedModels
          }
      });
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      zip.file("validation_history.json", JSON.stringify(history, null, 2));
      zip.file("README.txt", "This archive contains your validation history from ZauriScore.");

      const reportsFolder = zip.folder("reports");
      
      if (history && history.length > 0) {
          history.forEach((report) => {
              const doc = new jsPDF();
              doc.text(`Report for: ${report.oneLineTakeaway}`, 10, 10);
              doc.text(`Verdict: ${report.summaryVerdict}`, 10, 20);
              doc.text(report.marketReality, 10, 30, { maxWidth: 180 });
              
              const safeDate = new Date(report.createdAt).toISOString().split('T')[0];
              const filename = `Report_${safeDate}_${report.id.substring(0,6)}.pdf`;
              reportsFolder?.file(filename, doc.output('blob'));
          });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ZauriScore_Export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (n: string) => {
      return n ? n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Settings</h1>
            <p className="text-slate-500">Manage your preferences.</p>
         </div>
         <Button variant="outline" onClick={onLogout} className="text-rose-600 border-rose-200">Log Out</Button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'general' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>General</button>
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Profile</button>
        <button onClick={() => setActiveTab('models')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'models' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>API Keys</button>
        <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'notifications' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Notifications</button>
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && (
          <div className="space-y-8 animate-fade-in">
            <Card title="Account & Subscription">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Plan</p>
                  <p className="font-semibold text-slate-900 text-lg">{isLifetime ? "Founder Lifetime" : "Standard"}</p>
                </div>
                {!isLifetime && (
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Credits</p>
                    <p className="font-semibold text-slate-900 text-lg">{credits}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Data Export">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Export Data</h4>
                  <p className="text-sm text-slate-500">Download ZIP archive.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileArchive size={16} />}
                </Button>
              </div>
            </Card>

            <div className="border border-rose-200 rounded-xl overflow-hidden">
                <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
                    <h3 className="font-semibold text-rose-700">Danger Zone</h3>
                </div>
                <div className="p-6 bg-white flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold">Delete Account</h4>
                        <p className="text-sm text-slate-500">Permanently remove your account and data.</p>
                    </div>
                    <Button variant="outline" className="text-rose-600 border-rose-200" onClick={() => setIsDeleteModalOpen(true)}>Delete</Button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card className="animate-fade-in">
             <div className="mb-6 border-b border-slate-100 pb-5">
                 <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
                 <p className="text-sm text-slate-500">Update your photo and personal details here.</p>
             </div>

             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                
                <div 
                    onClick={handleAvatarClick} 
                    className="relative w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-500 flex items-center justify-center text-3xl font-bold cursor-pointer overflow-hidden group shadow-sm transition-all hover:border-slate-300"
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                    ) : (
                        getInitials(name)
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white mb-1" size={20} />
                        <span className="text-[10px] text-white font-medium uppercase tracking-wider">Upload</span>
                    </div>
                </div>

                <div>
                    <div className="flex flex-wrap gap-3 mt-2">
                        <Button variant="secondary" size="sm" onClick={handleAvatarClick} className="gap-2 font-medium">
                            <Camera size={16} /> Change picture
                        </Button>
                        {avatarUrl && (
                            <Button variant="outline" size="sm" onClick={() => { setAvatarUrl(''); onUpdateProfile({ avatarUrl: '' }) }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-2">
                                <Trash2 size={16} /> Remove
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">JPG, GIF or PNG. Max size of 5MB.</p>
                </div>
             </div>

             <div className="space-y-5 max-w-lg">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-slate-300 shadow-sm"
                            placeholder="e.g. Elon M."
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all text-slate-500 cursor-not-allowed shadow-sm"
                            disabled
                            title="Email cannot be changed directly."
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                        <Lock size={12} className="text-slate-400" /> Contact support to change your account email address.
                    </p>
                </div>
             </div>

             <div className="flex justify-end pt-8 mt-6 border-t border-slate-100">
                <Button onClick={handleProfileSave} disabled={isSaving} className="min-w-[140px] gap-2">
                    {isSaving ? (
                        <>
                           <Loader2 className="animate-spin" size={18} /> Saving...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
             </div>
          </Card>
        )}

        {activeTab === 'models' && (
          <div className="animate-fade-in space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Custom Provider Models</h2>
                        <p className="text-sm text-slate-500">Bring your own API keys to run analysis locally.</p>
                    </div>
                    <Button onClick={() => setIsAddModelModalOpen(true)} size="sm" className="gap-2 shrink-0">
                        <Plus size={16}/> Add Model
                    </Button>
                </div>

                {customModels.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <Key className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-500 font-medium text-sm">No custom models added yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {customModels.map(model => (
                            <div key={model.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{model.provider} <span className="text-slate-400 font-normal ml-1">({model.model})</span></h4>
                                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                            {model.apiKey.substring(0, 4)}...{model.apiKey.substring(model.apiKey.length - 4)}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleRemoveCustomModel(model.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Remove Model"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
           <Card title="Preferences" className="animate-fade-in">
              <div className="space-y-4">
                 <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors -mx-2" onClick={() => toggleNotification('email')}>
                    <div>
                        <p className="font-medium text-slate-900">Email Notifications</p>
                        <p className="text-sm text-slate-500">Get notified when analysis is ready.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${emailNotifications ? 'bg-slate-900' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : ''}`} />
                    </div>
                 </div>
                 <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors -mx-2" onClick={() => toggleNotification('marketing')}>
                    <div>
                        <p className="font-medium text-slate-900">Marketing Emails</p>
                        <p className="text-sm text-slate-500">Product updates and news.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${marketingEmails ? 'bg-slate-900' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${marketingEmails ? 'translate-x-6' : ''}`} />
                    </div>
                 </div>
              </div>
           </Card>
        )}
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account?">
          <p className="text-slate-600 mb-4">This action is permanent. Type <strong>delete my account</strong> to confirm.</p>
          <input 
              type="text" 
              className="w-full p-2 border border-slate-200 rounded-lg mb-4 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
              placeholder="delete my account"
              value={deleteConfirmation} 
              onChange={(e) => setDeleteConfirmation(e.target.value)} 
          />
          <Button 
              fullWidth 
              disabled={deleteConfirmation !== 'delete my account'} 
              className="bg-rose-600 hover:bg-rose-700 text-white border-none" 
              onClick={onDeleteData}
          >
              Delete Permanently
          </Button>
      </Modal>

      {/* Add Custom Model Modal matching requested dark slate theme style */}
      {isAddModelModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModelModalOpen(false)} />
          <div className="relative bg-[#262c36] text-slate-200 rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up border border-slate-700">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h3 className="text-base font-semibold text-white">Add Model</h3>
              <button onClick={() => setIsAddModelModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    <span className="text-rose-500 mr-1">*</span>Provider
                </label>
                <div className="relative">
                    <select 
                        className="w-full appearance-none bg-[#1e232b] border border-slate-700 text-slate-300 py-2.5 px-3 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                        value={newModelProvider}
                        onChange={(e) => {
                            setNewModelProvider(e.target.value);
                            setNewModelName(''); // Reset model when provider changes
                        }}
                    >
                        <option value="" disabled hidden>Choose Model Provider</option>
                        {PROVIDERS.map(provider => (
                            <option key={provider} value={provider}>{provider}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    <span className="text-rose-500 mr-1">*</span>Model
                </label>
                {newModelProvider === 'OpenRouter' ? (
                    <input 
                        type="text" 
                        className="w-full bg-[#1e232b] border border-slate-700 text-slate-300 py-2.5 px-3 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                        placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                    />
                ) : (
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-[#1e232b] border border-slate-700 text-slate-300 py-2.5 px-3 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm disabled:opacity-50"
                            value={newModelName}
                            onChange={(e) => setNewModelName(e.target.value)}
                            disabled={!newModelProvider}
                        >
                            <option value="" disabled hidden>Choose Model</option>
                            {newModelProvider && PROVIDER_MODELS[newModelProvider]?.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    <span className="text-rose-500 mr-1">*</span>API Key
                </label>
                <input 
                    type="password" 
                    className="w-full bg-[#1e232b] border border-slate-700 text-slate-300 py-2.5 px-3 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                    placeholder="Fill API Key here"
                    value={newModelApiKey}
                    onChange={(e) => setNewModelApiKey(e.target.value)}
                />
              </div>

            </div>
            
            <div className="p-5 pt-2">
                <button 
                    onClick={handleAddCustomModel}
                    disabled={!newModelProvider || !newModelName || !newModelApiKey}
                    className="w-full bg-[#e2e8f0] hover:bg-white text-slate-900 font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    Add Model
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};