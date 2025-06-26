'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { generateChatCommand } from '@/lib/actions/generate-command';
import { Bot, Loader2 } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Generate Command
    </Button>
  );
}

export function ChatCommandGenerator() {
  const initialState = { message: null, data: null, errors: null };
  const [state, dispatch] = useActionState(generateChatCommand, initialState);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-2xl">
            <Bot className="h-6 w-6" /> Custom Chat Commands
        </CardTitle>
        <CardDescription>
          Let AI create custom chat commands for you. Describe what you want the command to do.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={dispatch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Command Description</Label>
            <Textarea
              id="prompt"
              name="prompt"
              placeholder="e.g., A command that tells viewers about my painting tools and links to my art supplies list."
              rows={3}
            />
             {state?.errors?.prompt && <p className="text-sm text-destructive">{state.errors.prompt}</p>}
          </div>
          <SubmitButton />
        </form>
        
        {state?.message && !state.data && (
            <p className="text-sm text-destructive text-center">{state.message}</p>
        )}

        {state?.data && (
          <div className="mt-6 space-y-4 rounded-lg border bg-background p-4">
            <h4 className="font-semibold text-lg">Generated Command:</h4>
            <div>
              <Label className="text-muted-foreground">Command Name</Label>
              <p className="font-code text-primary rounded bg-muted p-2">!{state.data.command}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Bot Response</Label>
              <p className="rounded bg-muted p-2">{state.data.response}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
