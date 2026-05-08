import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the API using the injected environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const LITE_MODEL = "gemini-3-flash-preview";
const REASONING_MODEL = "gemini-3.1-pro-preview";

export async function expandPrompt(
  rawText: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const parts: any[] = [{ text: rawText }];
  
  if (imageBase64 && imageMimeType) {
    parts.unshift({
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType,
      },
    });
  }

  const systemInstruction = 
    "You are an elite AI art director. Analyze the user's raw, verbose, and potentially chaotic prompt. " +
    "Your task is to EXPAND and CLARIFY it into a beautifully flowing, highly detailed, and coherent " +
    "visual narrative paragraph (approx 2000 to 2600 characters). " +
    "Describe the subject, spatial relationships, environment, lighting, atmosphere, and artistic medium in vivid prose. " +
    "Remove all conversational filler. Maximize visual depth, narrative flow, and specific aesthetic details. " +
    "Output ONLY the expanded narrative paragraph.";

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: LITE_MODEL,
    contents: { parts },
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text || "";
}

export async function compressPrompt(expandedText: string): Promise<string> {
  const systemInstruction = 
    "You are an expert in AI prompt densification. Take the provided expansive visual narrative and " +
    "CONTRACT it into a single, incredibly dense, and impactful paragraph strictly under 1450 characters. \n" +
    "CRITICAL RULES:\n" +
    "1. DO NOT use a simple comma-separated list of tags. Maintain a flowing, prose-like narrative structure.\n" +
    "2. Preserve the 'massive' feel and scale of the original narrative.\n" +
    "3. Use advanced, evocative, and highly specific visual vocabulary to replace lengthy descriptions.\n" +
    "4. Ensure spatial relationships, lighting, and style are seamlessly woven into the paragraph.\n" +
    "5. The absolute maximum length is 1450 characters. Make every single word count.\n" +
    "6. Output ONLY the final dense paragraph. No intros, no outros, no quotes.";

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: expandedText,
    config: {
      systemInstruction,
      temperature: 0.4, // lower temp for strict adherence
    },
  });

  let text = response.text || "";
  
  // Cleanup any potential thinking blocks, just in case
  text = text.replace(/<\|?think\|?>[\s\S]*?<\/\|?think\|?>/gi, '').trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim();
  }
  
  return text;
}
