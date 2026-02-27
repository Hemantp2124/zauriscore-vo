import { UserProfile, ValidationReport, MOCK_REPORT, CustomModelConfig } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const API_URL = (import.meta as any).env.VITE_API_URL || "https://zauriscore-vo.vercel.app/api";

export const api = {
  // --- AI ---
  analyzeIdea: async (idea: string, attachment?: { mimeType: string, data: string }, email?: string, customModel?: CustomModelConfig): Promise<ValidationReport> => {
    
    // ----------------------------------------------------------------------
    // CUSTOM MODEL LOGIC (Client-side routing with user's own API Key)
    // ----------------------------------------------------------------------
    if (customModel && customModel.apiKey) {
        
        let userText = idea ? idea.trim() : "";
        let isTextAttachment = false;

        // Process attachments and enforce provider limits
        if (attachment) {
            const isImage = attachment.mimeType.startsWith('image/');
            const isPdf = attachment.mimeType === 'application/pdf';
            const isAudio = attachment.mimeType.startsWith('audio/') || attachment.mimeType.includes('webm') || attachment.mimeType.includes('mp4') || attachment.mimeType.includes('mpeg');
            isTextAttachment = attachment.mimeType.startsWith('text/') || attachment.mimeType.includes('json') || attachment.mimeType.includes('csv') || attachment.mimeType.includes('xml');

            if (isTextAttachment) {
                try {
                    const decodedText = decodeURIComponent(escape(atob(attachment.data)));
                    userText += `\n\n--- Attached Document ---\n${decodedText}`;
                } catch (e) {
                    throw new Error("Failed to read the attached text document. Please try pasting the text directly.");
                }
            } else if (customModel.provider !== 'Google') {
                // Non-Google models have strict attachment limitations in this app architecture
                if ((customModel.provider === 'OpenAI' || customModel.provider === 'OpenRouter') && !isImage) {
                    throw new Error(`${customModel.provider} only supports image attachments. Please remove the ${isPdf ? 'PDF' : isAudio ? 'Audio' : 'file'} or switch to ZauriScore / Google.`);
                }
                if (customModel.provider === 'Anthropic' && !isImage && !isPdf) {
                    throw new Error(`Anthropic only supports image and PDF attachments. Please remove the ${isAudio ? 'Audio' : 'file'} or switch to ZauriScore / Google.`);
                }
            }
        }

        if (!userText && !attachment) {
            throw new Error("Please provide a startup idea or an attachment to analyze.");
        }
        if (!userText && attachment) {
            userText = "Please analyze the attached file and provide the startup validation report.";
        }

        const systemPrompt = `You are an expert startup advisor and product manager. Your goal is to provide honest, clear, and encouraging feedback to founders. Do not use hype. Do not use investor jargon. Be direct but kind. Analyze the user's startup idea. Return a structured validation report in JSON.

CRITICAL INSTRUCTION: You MUST return ONLY a raw, valid JSON object. Do not include any markdown formatting like \`\`\`json. Do not include any conversational text before or after the JSON.

The JSON must strictly match this schema:
{
  "summaryVerdict": "Promising" | "Risky" | "Needs Refinement",
  "oneLineTakeaway": "string",
  "marketReality": "string",
  "pros": ["string"],
  "cons": ["string"],
  "competitors": [{"name": "string", "differentiation": "string"}],
  "monetizationStrategies": ["string"],
  "whyPeoplePay": "string",
  "viabilityScore": 85,
  "nextSteps": ["string"]
}`;

        const enforcedUserPrompt = `=== STARTUP IDEA TO ANALYZE ===\n${userText}\n========================\n\nRemember: Output strictly valid JSON matching the schema. NO CONVERSATIONAL TEXT.`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

            let endpoint = '';
            let headers: any = { 'Content-Type': 'application/json' };
            let payload: any = {};

            if (customModel.provider === 'OpenAI') {
                endpoint = 'https://api.openai.com/v1/chat/completions';
                headers['Authorization'] = `Bearer ${customModel.apiKey}`;
                
                const contentArray: any[] = [{ type: "text", text: enforcedUserPrompt }];
                if (attachment && !isTextAttachment && attachment.mimeType.startsWith('image/')) {
                    contentArray.push({
                        type: "image_url",
                        image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` }
                    });
                }

                payload = {
                    model: customModel.model,
                    messages: [
                        { role: "system", content: systemPrompt }, 
                        { role: "user", content: contentArray }
                    ],
                    response_format: { type: "json_object" }
                };
            } else if (customModel.provider === 'Anthropic') {
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers['x-api-key'] = customModel.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                headers['anthropic-dangerously-allow-browser'] = 'true';

                const contentArray: any[] = [];
                if (attachment && !isTextAttachment) {
                    if (attachment.mimeType.startsWith('image/')) {
                        contentArray.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: attachment.mimeType,
                                data: attachment.data
                            }
                        });
                    } else if (attachment.mimeType === 'application/pdf') {
                        contentArray.push({
                            type: "document",
                            source: {
                                type: "base64",
                                media_type: "application/pdf",
                                data: attachment.data
                            }
                        });
                    }
                }
                contentArray.push({ type: "text", text: enforcedUserPrompt });

                payload = {
                    model: customModel.model,
                    max_tokens: 2000,
                    system: systemPrompt,
                    messages: [{ role: "user", content: contentArray }]
                };
            } else if (customModel.provider === 'Google') {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${customModel.model}:generateContent?key=${customModel.apiKey}`;
                
                const parts: any[] = [];
                if (attachment && !isTextAttachment) {
                    parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
                }
                parts.push({ text: enforcedUserPrompt });

                payload = {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                };
            } else if (customModel.provider === 'OpenRouter') {
                endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                headers['Authorization'] = `Bearer ${customModel.apiKey}`;
                headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://zauriscore.com';
                headers['X-Title'] = 'ZauriScore';

                const contentArray: any[] = [{ type: "text", text: `${systemPrompt}\n\n${enforcedUserPrompt}` }];
                if (attachment && !isTextAttachment && attachment.mimeType.startsWith('image/')) {
                    contentArray.push({
                        type: "image_url",
                        image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` }
                    });
                }

                payload = {
                    model: customModel.model,
                    messages: [
                        { role: "user", content: contentArray }
                    ]
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = res.statusText;
                try {
                    const err = JSON.parse(errText);
                    errMsg = err.error?.message || errMsg;
                    const raw = err.error?.metadata?.raw;
                    if (raw) {
                        const rawStr = typeof raw === 'object' ? JSON.stringify(raw) : raw;
                        errMsg += ` (Raw: ${rawStr})`;
                    }
                } catch (e) {
                    errMsg = errText || errMsg;
                }
                throw new Error(`${customModel.provider} Error: ${errMsg}`);
            }

            const data = await res.json();
            let resultText = "";
            
            if (customModel.provider === 'Anthropic') {
                resultText = data.content?.[0]?.text || "";
            } else if (customModel.provider === 'Google') {
                resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else {
                resultText = data.choices?.[0]?.message?.content || "";
            }

            if (!resultText) {
                throw new Error("Received empty response from the model.");
            }

            let cleanedText = resultText.trim();
            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
            }

            let parsed;
            try {
                parsed = JSON.parse(cleanedText);
            } catch (e) {
                console.error("JSON Parse Error:", resultText);
                // If the model refused to output JSON, show the raw conversational output to the user
                const peek = resultText.length > 200 ? resultText.substring(0, 200) + "..." : resultText;
                
                if (peek.toLowerCase().includes("please provide") || peek.toLowerCase().includes("i need") || peek.toLowerCase().includes("idea")) {
                     throw new Error(`The AI requested more information: "${peek.replace(/```json/g, '').trim()}"\n\nPlease check your input and try again.`);
                }
                
                throw new Error(`Model returned invalid data format instead of JSON: "${peek.trim()}"`);
            }

            // Unpack if the model nested the response under a single root key (like {"report": {...}})
            let dataObj = parsed;
            if (parsed && !parsed.summaryVerdict && !parsed.oneLineTakeaway) {
                const keys = Object.keys(parsed);
                if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && parsed[keys[0]] !== null) {
                    dataObj = parsed[keys[0]];
                }
            }

            // Case-insensitive key lookup helper to handle hallucinations
            const getField = (obj: any, keys: string[], defaultVal: any) => {
                if (!obj || typeof obj !== 'object') return defaultVal;
                const foundKey = Object.keys(obj).find(k => keys.includes(k.toLowerCase()));
                const val = foundKey ? obj[foundKey] : undefined;
                
                if (val !== undefined && val !== null && val !== "") {
                    // Enforce array type if defaultVal is an array
                    if (Array.isArray(defaultVal)) {
                        return Array.isArray(val) ? val : [String(val)];
                    }
                    return val;
                }
                return defaultVal;
            };

            const summaryVerdictRaw = String(getField(dataObj, ['summaryverdict', 'verdict', 'summary'], 'Unknown'));
            const normalizedVerdict = ["Promising", "Risky", "Needs Refinement"].includes(summaryVerdictRaw) ? summaryVerdictRaw : "Unknown";

            const safeParsed = {
                summaryVerdict: normalizedVerdict as any,
                oneLineTakeaway: getField(dataObj, ['onelinetakeaway', 'takeaway', 'headline'], "Analysis completed successfully, but missing takeaway."),
                marketReality: getField(dataObj, ['marketreality', 'market', 'reality', 'analysis'], "Market analysis was generated but could not be parsed."),
                pros: getField(dataObj, ['pros', 'strengths', 'advantages'], ["Identified strengths from the idea."]),
                cons: getField(dataObj, ['cons', 'risks', 'weaknesses'], ["Identified potential risks."]),
                competitors: getField(dataObj, ['competitors', 'competition'], []),
                monetizationStrategies: getField(dataObj, ['monetizationstrategies', 'monetization', 'revenue', 'businessmodel'], []),
                whyPeoplePay: getField(dataObj, ['whypeoplepay', 'valueproposition', 'value'], "Value proposition identified."),
                viabilityScore: parseInt(getField(dataObj, ['viabilityscore', 'score', 'viability'], 50)) || 50,
                nextSteps: getField(dataObj, ['nextsteps', 'steps', 'actionplan'], ["Review the detailed analysis above."])
            };

            return {
                ...safeParsed,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                originalIdea: idea || "Attachment Analysis"
            };

        } catch (err: any) {
            console.error("Custom Provider Error:", err);
            if (err.name === 'AbortError') {
                throw new Error(`Request to ${customModel.provider} timed out. The model took too long to respond.`);
            }
            throw new Error(err.message || `Analysis failed using custom provider ${customModel.provider}. Check your API key and network.`);
        }
    }

    // ----------------------------------------------------------------------
    // DEFAULT BACKEND LOGIC
    // ----------------------------------------------------------------------
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, attachment, email }),
      });
      if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Analysis failed');
      }
      return await res.json();
    } catch (error: any) {
      // Silent Fallback 1: Return mock data if no API Key is available
      if (!process.env.API_KEY) {
          return {
             ...MOCK_REPORT,
             id: crypto.randomUUID(),
             createdAt: Date.now(),
             originalIdea: idea
          };
      }

      // Silent Fallback 2: Direct Client-Side Gemini Call
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const systemPrompt = `You are an expert startup advisor and product manager. Your goal is to provide honest, clear, and encouraging feedback to founders. Do not use hype. Do not use investor jargon. Be direct but kind. Analyze the user's startup idea. Return a structured validation report in JSON.`;
          
          const parts: any[] = [];
          if (attachment) {
              parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
          }
          if (idea) {
              parts.push({ text: idea });
          } else if (attachment) {
              parts.push({ text: "Please analyze this file." });
          }

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts },
              config: {
                  systemInstruction: systemPrompt,
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          summaryVerdict: { type: Type.STRING, description: "Promising, Risky, or Needs Refinement" },
                          oneLineTakeaway: { type: Type.STRING },
                          marketReality: { type: Type.STRING },
                          pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                          cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                          competitors: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      name: { type: Type.STRING },
                                      differentiation: { type: Type.STRING }
                                  }
                              }
                          },
                          monetizationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                          whyPeoplePay: { type: Type.STRING },
                          viabilityScore: { type: Type.INTEGER },
                          nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                  }
              }
          });
          
          const result = JSON.parse(response.text || '{}');
          return {
              ...result,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
              originalIdea: idea,
              summaryVerdict: ["Promising", "Risky", "Needs Refinement"].includes(result.summaryVerdict) ? result.summaryVerdict : "Unknown"
          };
      } catch (aiError) {
          throw new Error("Analysis failed. Please check your network or backend server.");
      }
    }
  },

  chat: async (message: string, context: any, customModel?: CustomModelConfig): Promise<string> => {
    // Custom Model Chat Override
    if (customModel && customModel.apiKey) {
        const systemPrompt = `Context: You are discussing a startup idea.\nIdea: ${context.originalIdea}\nReport Summary: ${JSON.stringify(context.report)}\nRole: Helpful Co-founder.`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);

            let endpoint = '';
            let headers: any = { 'Content-Type': 'application/json' };
            let payload: any = {};

            if (customModel.provider === 'OpenAI') {
                endpoint = 'https://api.openai.com/v1/chat/completions';
                headers['Authorization'] = `Bearer ${customModel.apiKey}`;
                payload = {
                    model: customModel.model,
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }]
                };
            } else if (customModel.provider === 'Anthropic') {
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers['x-api-key'] = customModel.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                headers['anthropic-dangerously-allow-browser'] = 'true';
                payload = {
                    model: customModel.model,
                    max_tokens: 1000,
                    system: systemPrompt,
                    messages: [{ role: "user", content: message }]
                };
            } else if (customModel.provider === 'Google') {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${customModel.model}:generateContent?key=${customModel.apiKey}`;
                payload = {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [{ text: message }] }]
                };
            } else if (customModel.provider === 'OpenRouter') {
                endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                headers['Authorization'] = `Bearer ${customModel.apiKey}`;
                headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://zauriscore.com';
                headers['X-Title'] = 'ZauriScore';
                payload = {
                    model: customModel.model,
                    messages: [
                        { role: "user", content: `${systemPrompt}\n\n---\n\nUser: ${message}` }
                    ]
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = res.statusText;
                try {
                    const err = JSON.parse(errText);
                    errMsg = err.error?.message || errMsg;
                    const raw = err.error?.metadata?.raw;
                    if (raw) errMsg += ` (Raw: ${typeof raw === 'object' ? JSON.stringify(raw) : raw})`;
                } catch (e) {
                    errMsg = errText || errMsg;
                }
                throw new Error(`${customModel.provider} Error: ${errMsg}`);
            }

            const data = await res.json();
            
            if (customModel.provider === 'Anthropic') {
                return data.content?.[0]?.text || "";
            } else if (customModel.provider === 'Google') {
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else {
                return data.choices?.[0]?.message?.content || "";
            }
        } catch (err: any) {
            console.error("Custom Provider Chat Error", err);
            if (err.name === 'AbortError') {
                return `Error: Request to ${customModel.provider} timed out.`;
            }
            return `Error communicating with ${customModel.provider}: ${err.message}`;
        }
    }

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context }),
        });
        if (!res.ok) throw new Error('Chat failed');
        const data = await res.json();
        return data.text;
    } catch (error) {
        // Silent fallback
        if (!process.env.API_KEY) {
            return "Sorry, I am offline and cannot chat right now.";
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `Context: You are discussing a startup idea.\nIdea: ${context.originalIdea}\nReport Summary: ${JSON.stringify(context.report)}\nRole: Helpful Co-founder.`
            }
        });
        const response = await chatSession.sendMessage({ message });
        return response.text || "No response";
    }
  },

  // --- Auth & User ---
  getGoogleAuthUrl: async (): Promise<string> => {
    const res = await fetch(`${API_URL}/auth/google/url`);
    if (!res.ok) throw new Error('Failed to get Google Auth URL');
    const { url } = await res.json();
    return url;
  },

  login: async (email: string, name: string): Promise<UserProfile> => {
    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error('Login failed');
      return await res.json();
    } catch (error) {
      // Check local storage first so we don't reset their credits on every reload
      const saved = localStorage.getItem('zauriscore_user');
      if (saved) {
         const parsed = JSON.parse(saved);
         if (parsed.email === email) return parsed;
      }
      
      // Create new mock user
      return {
        id: 'local-' + Date.now(),
        email,
        name,
        isPro: false,
        credits: 3,
        joinedAt: Date.now(),
        preferences: { emailNotifications: true, marketingEmails: false, theme: 'light' }
      };
    }
  },

  updateProfile: async (email: string, data: Partial<UserProfile>): Promise<UserProfile> => {
    try {
      const res = await fetch(`${API_URL}/users/${email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      return await res.json();
    } catch (error) {
      const saved = localStorage.getItem('zauriscore_user');
      if (saved) {
          const parsed = JSON.parse(saved);
          return { ...parsed, ...data };
      }
      return data as UserProfile; 
    }
  },

  deleteAccount: async (email: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/users/${email}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Deletion failed');
    } catch (error) {
       // Silent fallback for local
    }
  },

  // --- Reports ---
  saveReport: async (email: string, report: ValidationReport): Promise<ValidationReport> => {
    try {
      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, report }),
      });
      if (!res.ok) throw new Error('Failed to save report');
      return await res.json();
    } catch (error) {
      return report;
    }
  },

  getHistory: async (email: string): Promise<ValidationReport[]> => {
    try {
      const res = await fetch(`${API_URL}/reports/${email}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return await res.json();
    } catch (error) {
      const local = localStorage.getItem('zauriscore_history');
      return local ? JSON.parse(local) : [];
    }
  },

  // --- Credits ---
  deductCredit: async (email: string): Promise<{ credits: number }> => {
    try {
      const res = await fetch(`${API_URL}/users/${email}/deduct-credit`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to deduct credit');
      return await res.json();
    } catch (error) {
      const saved = localStorage.getItem('zauriscore_user');
      if (saved) {
          const parsed = JSON.parse(saved);
          return { credits: Math.max(0, parsed.credits - 1) };
      }
      return { credits: 0 };
    }
  },

  // --- Marketing ---
  joinWaitlist: async (email: string, source: string = 'landing'): Promise<{ success: boolean }> => {
    try {
        const res = await fetch(`${API_URL}/waitlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, source }),
        });
        if (!res.ok) throw new Error('Failed to join waitlist');
        return await res.json();
    } catch (error) {
        // Fully functional local fallback using localStorage if backend is offline
        await new Promise(resolve => setTimeout(resolve, 600)); 
        
        const existingList = JSON.parse(localStorage.getItem('zauriscore_waitlist') || '[]');
        if (!existingList.includes(email)) {
            existingList.push(email);
            localStorage.setItem('zauriscore_waitlist', JSON.stringify(existingList));
        }
        
        return { success: true };
    }
  }
};