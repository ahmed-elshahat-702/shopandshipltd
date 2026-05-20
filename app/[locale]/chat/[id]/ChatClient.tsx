"use client";

import {
  getChatMessages,
  markMessagesAsRead,
  sendMessage,
} from "@/app/actions/chat";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  content?: string;
  image_url?: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
}

interface ChatClientProps {
  chatId: string;
  otherUserName?: string;
  otherUserImage?: string;
  otherUserRole?: string;
}

export default function ChatClient({
  chatId,
  otherUserName = "Chat",
  otherUserImage,
  otherUserRole = "",
}: ChatClientProps) {
  const t = useTranslations("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Online Presence
  useEffect(() => {
    if (!user || !chatId) return;

    const presenceChannel = supabase.channel(`presence:chat_${chatId}`);

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        // Check if any user other than the current user is in the room
        let otherUserOnline = false;
        for (const id in state) {
          const presenceArray = state[id] as unknown as { user_id: string }[];
          if (presenceArray.some((p) => p.user_id !== user.id)) {
            otherUserOnline = true;
            break;
          }
        }
        setIsOnline(otherUserOnline);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [user, chatId, supabase]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      let hasCached = false;
      try {
        const cached = localStorage.getItem(`chat_messages_${chatId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setMessages(parsed);
            setIsLoading(false);
            hasCached = true;
          }
        }
      } catch {}

      if (!hasCached) setIsLoading(true);

      const { data, error } = await getChatMessages(chatId);
      if (error) {
        toast.error(t("errorFetchingMessages") || "Failed to fetch messages");
      } else if (data) {
        setMessages(data as Message[]);
        localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(data));
        // Mark as read
        await markMessagesAsRead(chatId);
      }
      setIsLoading(false);
    };

    if (user) {
      fetchMessages();
    }
  }, [chatId, user, t]);

  // Update cache when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  // Listen to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Add if not already there (we might have added it optimistically or from our own action)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (newMessage.sender_id !== user.id) {
            markMessagesAsRead(chatId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, supabase]);

  const handleSendMessage = async (content: string, file: File | null) => {
    if (!user) return;
    setIsSending(true);

    let imageUrl = "";

    try {
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-images").getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { data, error } = await sendMessage(chatId, content, imageUrl);

      if (error) {
        throw new Error(error);
      }

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(t("errorSending") || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // No need for old scroll effect

  return (
    <div className="flex flex-col h-full w-full relative">
      <ChatHeader
        name={otherUserName}
        image={otherUserImage}
        role={otherUserRole}
        online={isOnline}
      />

      <div className="flex-1 p-6 overflow-auto" ref={scrollRef}>
        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-muted-foreground py-10 text-sm">
              {t("noMessagesYet") || "No messages yet. Start the conversation!"}
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                imageUrl={msg.image_url}
                timestamp={new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                isSender={msg.sender_id === user?.id}
                status={msg.is_read ? "read" : "sent"}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
