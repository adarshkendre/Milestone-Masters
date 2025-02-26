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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Consistency Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="multiple"
          selected={completedDates}
          className="rounded-md border w-full"
          classNames={{
            day_selected: "bg-green-500 text-primary-foreground hover:bg-green-500",
            cell: "h-9 w-9 text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
            day: "h-9 w-9 p-0 font-normal aria-selected:bg-green-500 aria-selected:text-white aria-selected:hover:bg-green-500",
            head_cell: "text-muted-foreground font-normal text-[0.8rem] w-9",
            table: "w-full border-collapse space-y-1",
            row: "flex w-full mt-2 justify-around",
            head_row: "flex w-full justify-around",
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