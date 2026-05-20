"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface MessageBubbleProps {
  content?: string;
  imageUrl?: string;
  timestamp: string;
  isSender: boolean;
  status?: "sent" | "delivered" | "read";
}

export function MessageBubble({ content, imageUrl, timestamp, isSender, status }: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex flex-col mb-4 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300",
      isSender ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "p-4 rounded-[1.5rem] text-sm font-medium leading-relaxed shadow-sm flex flex-col gap-2",
        isSender 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-card border border-border text-foreground rounded-tl-none"
      )}>
        {imageUrl && (
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden">
            <Image 
              src={imageUrl} 
              alt="Attachment" 
              width={400}
              height={400}
              className="w-full h-auto object-cover max-h-64 rounded-md border border-white/20"
            />
          </div>
        )}
        {content && <span>{content}</span>}
      </div>
      <div className="flex items-center gap-2 mt-1 px-2">
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
          {timestamp}
        </span>
        {isSender && status && (
          <span className="text-[10px] text-primary/50 font-black uppercase tracking-tighter">
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
