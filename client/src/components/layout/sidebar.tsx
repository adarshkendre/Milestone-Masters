import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  User,
  MessageSquareText,
  HelpCircle,
} from "lucide-react";
import { ConceptValidation } from "@/components/chat/concept-validation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="w-[250px] border-r min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <Avatar>
          <AvatarFallback>
            {user?.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{user?.username}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      <div className="space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <div>
            <User className="mr-2 h-4 w-4" />
            Profile
          </div>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquareText className="mr-2 h-4 w-4" />
              Clear Concept Bot
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Clear Concept Bot</SheetTitle>
            </SheetHeader>
            <ConceptValidation mode="chat" />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="w-full justify-start">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>How to Use Goal Tracker AI</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <section>
                <h3 className="font-medium mb-2">Creating Goals</h3>
                <p className="text-muted-foreground">Click the "Add Goal" button to create a new goal. Enter a title, description, and date range. The AI will automatically generate a daily task schedule.</p>
              </section>

              <section>
                <h3 className="font-medium mb-2">Tracking Progress</h3>
                <p className="text-muted-foreground">The calendar shows your progress:
                  - Current day is highlighted
                  - Green circles indicate completed tasks
                  - Red circles show missed tasks
                </p>
              </section>

              <section>
                <h3 className="font-medium mb-2">Clear Concept Bot</h3>
                <p className="text-muted-foreground">Use the Clear Concept Bot to:
                  - Get help with your goals
                  - Validate your learning
                  - Ask questions about tasks
                </p>
              </section>

              <section>
                <h3 className="font-medium mb-2">Stats</h3>
                <p className="text-muted-foreground">Track your:
                  - Current streak
                  - Active days
                  - Missing days
                </p>
              </section>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </div>
    </div>
  );
}