import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";

export function ConsistencyCalendar() {
  const { user } = useAuth();
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/goals", "all-tasks"],
  });

  const completedDates = tasks
    .filter((task) => task.isCompleted)
    .map((task) => new Date(task.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistency Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="multiple"
          selected={completedDates}
          className="rounded-md border"
          disabled
        />
      </CardContent>
    </Card>
  );
}
