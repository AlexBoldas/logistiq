'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating AI-suggested scene layouts based on a user prompt.
 *
 * - aiSuggestedSceneLayout - The main function to generate scene layout suggestions.
 * - AiSuggestedSceneLayoutInput - The input type for the aiSuggestedSceneLayout function.
 * - AiSuggestedSceneLayoutOutput - The output type for the aiSuggestedSceneLayout function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSuggestedSceneLayoutInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired 3D scene.'),
});
export type AiSuggestedSceneLayoutInput = z.infer<typeof AiSuggestedSceneLayoutInputSchema>;

const AiSuggestedSceneLayoutOutputSchema = z.object({
  sceneDescription: z.string().describe('A detailed description of the suggested 3D scene layout, including objects and their arrangement.'),
  suggestedObjects: z.array(z.string()).describe('An array of suggested 3D object names or descriptions to include in the scene.'),
  additionalDetails: z.string().optional().describe('Any additional details or considerations for the scene layout.'),
});
export type AiSuggestedSceneLayoutOutput = z.infer<typeof AiSuggestedSceneLayoutOutputSchema>;

export async function aiSuggestedSceneLayout(input: AiSuggestedSceneLayoutInput): Promise<AiSuggestedSceneLayoutOutput> {
  return aiSuggestedSceneLayoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSuggestedSceneLayoutPrompt',
  input: {schema: AiSuggestedSceneLayoutInputSchema},
  output: {schema: AiSuggestedSceneLayoutOutputSchema},
  prompt: `You are an AI assistant that helps users generate 3D scenes.
  Based on the user's prompt, suggest a detailed scene layout, including specific 3D objects and their arrangement.
  Also include any additional details or considerations that might be relevant to the scene.

  User Prompt: {{{prompt}}}
  `,
});

const aiSuggestedSceneLayoutFlow = ai.defineFlow(
  {
    name: 'aiSuggestedSceneLayoutFlow',
    inputSchema: AiSuggestedSceneLayoutInputSchema,
    outputSchema: AiSuggestedSceneLayoutOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
