import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GeneratedTask {
  date: string;
  task: string;
}

interface ScheduleGeneratorBotProps {
  goalTitle: string;
  goalDescription?: string;
  startDate: string;
  endDate: string;
  onScheduleGenerated: (tasks: GeneratedTask[]) => void;
}

export function ScheduleGeneratorBot({
  goalTitle,
  goalDescription,
  startDate,
  endDate,
  onScheduleGenerated,
}: ScheduleGeneratorBotProps) {
  const { toast } = useToast();
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedTask[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-schedule", {
        title: goalTitle,
        description: goalDescription,
        startDate,
        endDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedSchedule(data.tasks);
      toast({
        title: "Schedule Generated",
        description: "Review the schedule and make any needed adjustments.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptSchedule = () => {
    onScheduleGenerated(generatedSchedule);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Schedule Generator Bot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!generatedSchedule.length ? (
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Generate Schedule
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-4 bg-muted p-4 rounded-lg">
              <div className="font-medium">Date</div>
              <div className="font-medium">Task</div>
              {generatedSchedule.map((task, index) => (
                <React.Fragment key={index}>
                  <div className="text-muted-foreground whitespace-nowrap">{task.date}</div>
                  <div>{task.task}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex-1"
              >
                {generateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button 
                onClick={handleAcceptSchedule}
                className="flex-1"
              >
                Accept Schedule
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}