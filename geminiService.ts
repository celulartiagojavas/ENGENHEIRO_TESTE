
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./prompts";
import { ModelType, Attachment } from "./types";

export class GeminiService {
  /**
   * Generates a chat response using the Gemini API.
   * Following guidelines: Initialize a new GoogleGenAI instance for each call
   * to ensure fresh environment variable access.
   */
  async chat(message: string, history: any[] = [], attachments: Attachment[] = []) {
    // Initializing right before the call as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Determine the best model. Gemini 3 Pro is best for complex reasoning and multimodal tasks.
    const hasDocuments = attachments.some(a => a.type.includes('pdf') || a.type.includes('image'));
    const modelName = hasDocuments ? ModelType.VISION : ModelType.REASONING;
    
    const parts: any[] = [{ text: message }];
    
    // Convert history to part format if needed, but for simplicity we focus on the current turn + context
    // This could be expanded to full multi-turn if memory budget allows.
    
    attachments.forEach(att => {
      parts.push({
        inlineData: {
          data: att.data.split(',')[1],
          mimeType: att.type
        }
      });
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        /**
         * Rule: googleMaps grounding is only supported in Gemini 2.5 series. 
         * Since ModelType uses Gemini 3 models, we exclude googleMaps to remain compliant.
         */
        tools: [{ googleSearch: {} }],
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
