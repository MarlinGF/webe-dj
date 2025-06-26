'use server';

import { customizedChatTool } from '@/ai/flows/customizedChatTool';
import { z } from 'zod';

const commandSchema = z.object({
  prompt: z.string().min(10, 'Please describe the command you want to create in more detail.'),
});

type State = {
  message?: string | null;
  data?: {
    command: string;
    response: string;
  } | null;
  errors?: {
    prompt?: string[];
  } | null;
};

export async function generateChatCommand(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = commandSchema.safeParse({
    prompt: formData.get('prompt'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'There was an error with your request.',
    };
  }
  
  try {
    const result = await customizedChatTool(validatedFields.data);
    return { message: 'Command generated successfully!', data: result };
  } catch (error) {
    console.error('AI Error:', error);
    return { message: 'Failed to generate command. Please try again later.' };
  }
}
