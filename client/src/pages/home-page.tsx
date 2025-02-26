import { Sidebar } from "@/components/layout/sidebar";
import { StatsDisplay } from "@/components/layout/stats-display";
import { ConsistencyCalendar } from "@/components/layout/consistency-calendar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Goal } from "@shared/schema";
import { useState } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalSchedule } from "@/components/goals/goal-schedule";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

export default function HomePage() {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <StatsDisplay />
          <ConsistencyCalendar />

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Goals</h2>
            <Sheet>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <GoalForm />
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="border rounded-lg p-6 cursor-pointer hover:border-primary"
                onClick={() => setSelectedGoal(goal)}
              >
                <h3 className="text-xl font-semibold mb-2">{goal.title}</h3>
                <p className="text-muted-foreground">{goal.description}</p>
                <div className="mt-4 text-sm text-muted-foreground">
                  {new Date(goal.startDate).toLocaleDateString()} -{" "}
                  {new Date(goal.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {selectedGoal && <GoalSchedule goal={selectedGoal} />}
        </div>
      </main>
    </div>
  );
}
