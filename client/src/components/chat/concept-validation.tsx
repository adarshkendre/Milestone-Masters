import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Task } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface ConceptValidationProps {
  task?: Task;
  onValidated?: () => void;
  mode?: "validation" | "chat";
}

export function ConceptValidation({
  task,
  onValidated,
  mode = "validation",
}: ConceptValidationProps) {
  const [concept, setConcept] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "chat") {
        const res = await apiRequest("POST", "/api/chat", { message: concept });
        return res.json();
      } else {
        const res = await apiRequest(
          "POST",
          `/api/tasks/${task?.id}/validate`,
          { concept }
        );
        return res.json();
      }
    },
    onSuccess: (data) => {
      if (mode === "chat") {
        toast({
          title: "Bot Response",
          description: data.response,
        });
      } else if (data.isValid) {
        toast({
          title: "Concept Validated",
          description: "Great job! Your understanding has been validated.",
        });
        onValidated?.();
      } else {
        toast({
          title: "Try Again",
          description: data.feedback,
          variant: "destructive",
        });
      }
      setConcept("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      {mode === "validation" && task && (
        <div>
          <h4 className="font-medium mb-2">Today's Task</h4>
          <p className="text-muted-foreground">{task.task}</p>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">
          {mode === "validation"
            ? "What did you learn?"
            : "Ask me anything about your goals"}
        </h4>
        <Textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder={
            mode === "validation"
              ? "Explain the key concepts you learned..."
              : "Type your question here..."
          }
          className="h-32"
        />
      </div>

      <Button
        className="w-full"
        disabled={mutation.isPending || !concept}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {mode === "validation" ? "Validate Learning" : "Ask Bot"}
      </Button>
    </div>
  );
}