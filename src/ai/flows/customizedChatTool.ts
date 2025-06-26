import {defineFlow} from 'genkit';
import {z} from 'zod';
import {ai} from '../genkit';

export const customizedChatTool = defineFlow(
  {
    name: 'customizedChatTool',
    inputSchema: z.object({
      prompt: z.string(),
    }),
    outputSchema: z.object({
      command: z.string(),
      response: z.string(),
    }),
  },
  async ({prompt}) => {
    const llmResponse = await ai.generate({
      prompt: `You are a helpful assistant for a live streamer. Your task is to generate a chat command and a response for it based on the streamer's request. 
      The output should be a JSON object with two keys: "command" and "response". 
      The "command" should be a single word without any prefix. 
      The "response" should be the text the bot will say.
      
      Streamer's request: "${prompt}"
      
      Generate the JSON object now.`,
      format: 'json',
    });

    return llmResponse.output() as {command: string; response: string};
  }
);
