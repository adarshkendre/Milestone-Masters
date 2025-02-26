import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { cn } from "@/lib/utils";

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
          classNames={{
            day_selected: "bg-green-500 text-primary-foreground hover:bg-green-500",
            cell: "h-9 w-9 text-center p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
            day: "h-9 w-9 p-0 font-normal",
            head_cell: "text-muted-foreground font-normal text-[0.8rem]",
            table: "w-full border-collapse space-y-1",
            row: "flex w-full mt-2",
            head_row: "flex",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            caption: "relative pt-1 items-center justify-center text-sm font-medium",
          }}
          disabled
        />
      </CardContent>
    </Card>
  );
}