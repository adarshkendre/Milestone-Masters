import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";

interface ManualScheduleCreatorProps {
  goalId: number;
  onScheduleCreated: () => void;
}

interface TaskInput {
  date: Date;
  task: string;
}

const ManualScheduleCreator: React.FC<ManualScheduleCreatorProps> = ({ goalId, onScheduleCreated }) => {
  const [tasks, setTasks] = useState<TaskInput[]>([{ date: new Date(), task: '' }]);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const formattedTasks = tasks.map(task => ({
        date: task.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        task: task.task
      }));
      
      const response = await apiRequest("POST", `/api/goals/${goalId}/bulk-tasks`, {
        tasks: formattedTasks
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Schedule created successfully",
      });
      onScheduleCreated();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    setTasks([...tasks, { date: new Date(), task: '' }]);
  };

  const handleRemoveTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleTaskChange = (index: number, field: keyof TaskInput, value: Date | string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tasks.some(task => !task.task.trim())) {
      toast({
        title: "Validation Error",
        description: "All tasks must have a description",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Create Schedule Manually</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {tasks.map((task, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="flex-1">
              <Label>Date</Label>
              <DatePicker
                selected={task.date}
                onChange={(date) => handleTaskChange(index, 'date', date || new Date())}
                dateFormat="yyyy-MM-dd"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </div>
            
            <div className="flex-[2]">
              <Label>Task</Label>
              <Input
                value={task.task}
                onChange={(e) => handleTaskChange(index, 'task', e.target.value)}
                placeholder="Task description"
              />
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-8"
              onClick={() => handleRemoveTask(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTask}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Task
          </Button>
          
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create Schedule
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ManualScheduleCreator;
