
import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI | null => {
  if (ai) {
    return ai;
  }
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_API_KEY environment variable not set. Gemini features will not work.");
    return null;
  }
  ai = new GoogleGenAI({ apiKey });
  return ai;
};

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  language: Language;
}

export const getFinancialInsights = async (summary: FinancialSummary): Promise<string> => {
  const client = getAiClient();
  if (!client) {
    throw new Error("API key is not configured.");
  }

  const languageMap = {
    pt: 'Portuguese',
    en: 'English',
  };

  const prompt = `
    Based on the following financial summary for a given period, provide some encouraging insights and one actionable tip for improvement.
    The user's goal is to increase their savings. Be brief, positive, and format the output as clean markdown.
    Do not use headers.

    Summary:
    - Total Income: ${summary.totalIncome.toFixed(2)}
    - Total Expenses: ${summary.totalExpenses.toFixed(2)}
    - Savings Rate: ${summary.savingsRate.toFixed(2)}%

    Respond in ${languageMap[summary.language]}.
  `;

  try {
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text ?? '';
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get financial insights from AI.");
  }
};
