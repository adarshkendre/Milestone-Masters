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

        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help
        </Button>
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
