
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./prompts";
import { ModelType, Attachment } from "./types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async chat(message: string, history: any[] = [], attachments: Attachment[] = []) {
    // Se houver PDF ou Imagem, usamos o modelo Vision/Multimodal
    const hasDocuments = attachments.some(a => a.type.includes('pdf') || a.type.includes('image'));
    const model = hasDocuments ? ModelType.VISION : ModelType.REASONING;
    
    const parts: any[] = [{ text: message }];
    
    attachments.forEach(att => {
      // O Gemini suporta nativamente PDF e Imagens via inlineData
      parts.push({
        inlineData: {
          data: att.data.split(',')[1],
          mimeType: att.type
        }
      });
    });

    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: model === ModelType.VISION 
          ? [{ googleSearch: {} }, { googleMaps: {} }] 
          : [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 16384 },
        temperature: 0.15
      }
    });

    return {
      text: response.text,
      metadata: response.candidates?.[0]?.groundingMetadata || null
    };
  }
}

export const gemini = new GeminiService();
