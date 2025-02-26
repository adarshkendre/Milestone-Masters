import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, AlertCircle } from "lucide-react";

export function StatsDisplay() {
  const { user } = useAuth();

  const stats = [
    {
      label: "Current Streak",
      value: user?.streak || 0,
      icon: Flame,
      color: "text-orange-500",
    },
    {
      label: "Active Days",
      value: user?.activeDays || 0,
      icon: Calendar,
      color: "text-green-500",
    },
    {
      label: "Missing Days",
      value: user?.missingDays || 0,
      icon: AlertCircle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6 flex items-center gap-4">
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
