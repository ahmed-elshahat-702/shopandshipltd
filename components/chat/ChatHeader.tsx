"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";

interface ChatHeaderProps {
  name: string;
  image?: string;
  role: string;
  online?: boolean;
  // hideActions?: boolean;
  onBack?: () => void;
}

export function ChatHeader({
  name,
  image,
  role,
  online,
  // hideActions,
  onBack,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              router.back();
            }
          }}
        >
          <ChevronLeft size={24} />
        </Button>
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {image && <AvatarImage src={image} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-foreground leading-none mb-1 truncate">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest truncate">
            {role}
          </p>
        </div>
      </div>

      {/* {!hideActions && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-primary transition-colors"
          >
            <Video size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-primary transition-colors"
          >
            <MoreVertical size={20} />
          </Button>
        </div>
      )} */}
    </div>
  );
}
