import { Goal, Task } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConceptValidation } from "@/components/chat/concept-validation";
import { useState } from "react";

export function GoalSchedule({ goal }: { goal: Goal }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/goals", goal.id, "tasks"],
  });

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Schedule for {goal.title}</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Daily Task</th>
              <th className="p-4 text-center">Completed</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t">
                <td className="p-4">{format(new Date(task.date), "PPP")}</td>
                <td className="p-4">{task.task}</td>
                <td className="p-4 text-center">
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={() => {
                      if (!task.isCompleted) {
                        setSelectedTask(task);
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validate Your Learning</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <ConceptValidation
              task={selectedTask}
              onValidated={() => setSelectedTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
