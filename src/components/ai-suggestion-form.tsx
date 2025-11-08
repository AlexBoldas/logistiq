'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAiSuggestions } from '@/app/actions';
import type { AiSuggestedSceneLayoutOutput } from '@/ai/flows/ai-suggested-scene-layout';
import type { ObjectType } from '@/lib/types';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader, Sparkles, Wand2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters long.'),
});

type AiSuggestionFormProps = {
  onAddObject: (type: ObjectType) => void;
};

export function AiSuggestionForm({ onAddObject }: AiSuggestionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiSuggestedSceneLayoutOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    const actionResult = await getAiSuggestions(values.prompt);

    if (actionResult.success && actionResult.data) {
      setResult(actionResult.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: actionResult.error || 'An unknown error occurred.',
      });
    }
    setIsLoading(false);
  }

  const handleAddObjectFromSuggestion = (suggestion: string) => {
    // Simple logic: add a box for any suggestion. A more complex implementation could parse the string.
    onAddObject('box');
    toast({
      title: 'Object Added',
      description: `A new object inspired by "${suggestion}" was added to the scene.`,
    });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Describe your scene</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., a futuristic city with flying cars"
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Generate Ideas
          </Button>
        </form>
      </Form>

      {result && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand2 className="text-primary" /> AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Scene Description</h4>
              <p className="text-sm text-muted-foreground">{result.sceneDescription}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Suggested Objects</h4>
              <div className="flex flex-wrap gap-2">
                {result.suggestedObjects.map((obj, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Badge variant="secondary">{obj}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleAddObjectFromSuggestion(obj)}
                      aria-label={`Add ${obj} to scene`}
                    >
                      <PlusCircle className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {result.additionalDetails && (
              <div>
                <h4 className="font-semibold mb-2">Additional Details</h4>
                <p className="text-sm text-muted-foreground">{result.additionalDetails}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
