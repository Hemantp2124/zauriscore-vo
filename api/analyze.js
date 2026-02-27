import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import { Resend } from 'resend';

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idea, attachment, email, customModel } = req.body;

    if (customModel && customModel.apiKey) {
      // Custom model logic
      let userText = idea ? idea.trim() : "";
      let isTextAttachment = false;

      if (attachment) {
        const isImage = attachment.mimeType.startsWith('image/');
        const isPdf = attachment.mimeType === 'application/pdf';
        const isAudio = attachment.mimeType.startsWith('audio/') ||
                       attachment.mimeType.includes('webm') ||
                       attachment.mimeType.includes('mp4') ||
                       attachment.mimeType.includes('mpeg');
        isTextAttachment = attachment.mimeType.startsWith('text/') ||
                          attachment.mimeType.includes('json') ||
                          attachment.mimeType.includes('csv') ||
                          attachment.mimeType.includes('xml');

        if (isTextAttachment) {
          try {
            userText = atob(attachment.data.split(',')[1]);
          } catch (e) {
            console.error('Failed to decode text attachment:', e);
          }
        }
      }

      const prompt = `Analyze this startup idea for viability. Be critical and thorough. Consider market size, competition, technical feasibility, and monetization potential.

${userText}

Return a JSON response with this exact structure:
{
  "viabilityScore": number (0-100),
  "summaryVerdict": "Promising" | "Risky" | "Questionable",
  "oneLineTakeaway": "string",
  "marketReality": "string (markdown)",
  "pros": ["string1", "string2", "string3"],
  "cons": ["string1", "string2", "string3"],
  "competitors": [{"name": "string", "differentiation": "string"}],
  "monetizationStrategies": ["string1", "string2"],
  "whyPeoplePay": "string",
  "nextSteps": ["string1", "string2", "string3"],
  "id": "unique-id"
}`;

      try {
        const model = genAI.getGenerativeModel({
          model: customModel.model || 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let report;
        try {
          report = JSON.parse(text);
          report.id = Date.now().toString();
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          report = {
            viabilityScore: 50,
            summaryVerdict: "Questionable",
            oneLineTakeaway: "Unable to analyze - please try again",
            marketReality: "Analysis failed due to parsing error",
            pros: ["Analysis attempted"],
            cons: ["Technical issue occurred"],
            competitors: [],
            monetizationStrategies: [],
            whyPeoplePay: "Unknown",
            nextSteps: ["Try again", "Contact support"],
            id: Date.now().toString()
          };
        }

        return res.status(200).json(report);

      } catch (error) {
        console.error('Custom model error:', error);
        return res.status(500).json({
          error: 'AI service error',
          details: error.message
        });
      }
    }

    // Default Gemini model logic
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Analyze this startup idea for viability. Be critical and thorough. Consider market size, competition, technical feasibility, and monetization potential.

${idea}

Return a JSON response with this exact structure:
{
  "viabilityScore": number (0-100),
  "summaryVerdict": "Promising" | "Risky" | "Questionable",
  "oneLineTakeaway": "string",
  "marketReality": "string (markdown)",
  "pros": ["string1", "string2", "string3"],
  "cons": ["string1", "string2", "string3"],
  "competitors": [{"name": "string", "differentiation": "string"}],
  "monetizationStrategies": ["string1", "string2"],
  "whyPeoplePay": "string",
  "nextSteps": ["string1", "string2", "string3"],
  "id": "unique-id"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let report;
    try {
      report = JSON.parse(text);
      report.id = Date.now().toString();
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      report = {
        viabilityScore: 50,
        summaryVerdict: "Questionable",
        oneLineTakeaway: "Unable to analyze - please try again",
        marketReality: "Analysis failed due to parsing error",
        pros: ["Analysis attempted"],
        cons: ["Technical issue occurred"],
        competitors: [],
        monetizationStrategies: [],
        whyPeoplePay: "Unknown",
        nextSteps: ["Try again", "Contact support"],
        id: Date.now().toString()
      };
    }

    res.status(200).json(report);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
