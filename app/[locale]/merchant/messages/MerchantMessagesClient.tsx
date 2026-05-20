"use client";

import {
  getChatMessages,
  getChats,
  markMessagesAsRead,
  sendMessage,
} from "@/app/actions/chat";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { MessageSquare, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ChatParticipant {
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    profile_image_url: string;
    role: string;
  };
}

interface Chat {
  chat_id: string;
  last_read_at: string;
  chats: {
    id: string;
    updated_at: string;
    chat_participants: ChatParticipant[];
    messages?: { content: string | null; image_url: string | null; created_at: string }[];
  };
}

interface Message {
  id: string;
  chat_id: string;
  content?: string;
  image_url?: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
}

interface MerchantMessagesClientProps {
  cacheKey?: string;
  realtimeChannelName?: string;
}

export default function MerchantMessagesClient({
  cacheKey = "merchant_chats",
  realtimeChannelName = "merchant_messages",
}: MerchantMessagesClientProps) {
  const t = useTranslations("chat");
  const { user } = useAuthStore();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  // Create a combined channel for tracking presence across chats
  useEffect(() => {
    if (!user || chats.length === 0) return;

    const channels = chats.map((chat) => {
      const presenceChannel = supabase.channel(`presence:chat_${chat.chat_id}`);

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState();

          let isOtherUserOnline = false;
          let otherUserId = "";

          const otherParticipant = chat.chats.chat_participants.find(
            (p) => p.user_id !== user.id,
          );
          if (otherParticipant) {
            otherUserId = otherParticipant.user_id;
            for (const id in state) {
              const presenceArray = state[id] as unknown as { user_id: string }[];
              if (presenceArray.some((p) => p.user_id === otherUserId)) {
                isOtherUserOnline = true;
                break;
              }
            }

            setOnlineUsers((prev) => ({
              ...prev,
              [otherUserId]: isOtherUserOnline,
            }));
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      return presenceChannel;
    });

    return () => {
      channels.forEach((channel) => {
        channel.untrack();
        supabase.removeChannel(channel);
      });
    };
  }, [chats, user, supabase]);

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
  }, [messages, activeChatId]);

  useEffect(() => {
    const fetchChats = async () => {
      let hasCached = false;
      try {
        const cachedChats = localStorage.getItem(cacheKey);
        if (cachedChats) {
          const parsed = JSON.parse(cachedChats);
          if (parsed.length > 0) {
            setChats(parsed);
            setIsLoadingChats(false);
            hasCached = true;
          }
        }
      } catch {}

      if (!hasCached) setIsLoadingChats(true);

      const { data } = await getChats();
      if (data) {
        setChats(data as unknown as Chat[]);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
      setIsLoadingChats(false);
    };

    if (user) {
      fetchChats();
    }
  }, [cacheKey, user]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChatId) return;

      let hasCached = false;
      try {
        const cached = localStorage.getItem(`chat_messages_${activeChatId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setMessages(parsed);
            setIsLoadingMessages(false);
            hasCached = true;
          }
        }
      } catch {}

      if (!hasCached) {
        setMessages([]);
        setIsLoadingMessages(true);
      }

      const { data } = await getChatMessages(activeChatId);
      if (data) {
        setMessages(data as Message[]);
        localStorage.setItem(
          `chat_messages_${activeChatId}`,
          JSON.stringify(data),
        );
        markMessagesAsRead(activeChatId);
      }
      setIsLoadingMessages(false);
    };

    fetchMessages();
  }, [activeChatId]);

  // Update message cache on new messages
  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      localStorage.setItem(
        `chat_messages_${activeChatId}`,
        JSON.stringify(messages),
      );
    }
  }, [messages, activeChatId]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(realtimeChannelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload: { new: Message }) => {
          const newMessage = payload.new as Message;

          if (newMessage.chat_id === activeChatId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            if (newMessage.sender_id !== user.id) {
              markMessagesAsRead(activeChatId);
            }
          }

          // Re-fetch chats to update unread status / sorting
          const { data } = await getChats();
          if (data) {
            setChats(data as unknown as Chat[]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, realtimeChannelName, user, supabase]);

  const getParticipantRoleLabel = (role?: string) => {
    if (role === "admin" || role === "superadmin") {
      return t("support") || "Support";
    }

    if (role === "merchant") {
      return t("merchant") || "Merchant";
    }

    return t("customer") || "Customer";
  };

  const handleSendMessage = async (content: string, file: File | null) => {
    if (!user || !activeChatId) return;
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

      const { data, error } = await sendMessage(
        activeChatId,
        content,
        imageUrl,
      );

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

  const activeChat = chats.find((c) => c.chat_id === activeChatId);
  const activeOtherUser = activeChat?.chats.chat_participants.find(
    (p) => p.user_id !== user?.id,
  )?.profiles;

  const filteredChats = chats
    .filter((chat) => {
      const otherUser = chat.chats.chat_participants.find(
        (p) => p.user_id !== user?.id,
      )?.profiles;
      return otherUser?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    })
    .sort(
      (a, b) =>
        new Date(b.chats.updated_at).getTime() -
        new Date(a.chats.updated_at).getTime(),
    );

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] bg-card rounded-[2rem] border overflow-hidden shadow-2xl m-2 md:m-4">
      {/* Sidebar - Conversation List */}
      <div
        className={cn(
          "w-full h-full md:w-80 lg:w-96 border-r flex flex-col bg-muted/20",
          activeChatId && "hidden md:flex",
        )}
      >
        <div className="p-6 border-b space-y-4">
          <h1 className="text-2xl font-black">{t("messages")}</h1>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder={t("searchConversations")}
              className="pl-10 h-12 rounded-xl bg-background border-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-scroll">
          <div className="p-2 space-y-1">
            {isLoadingChats ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchQuery ? t("noResults") : t("noConversations")}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherUser = chat.chats.chat_participants.find(
                  (p) => p.user_id !== user?.id,
                )?.profiles;
                const isUnread =
                  new Date(chat.chats.updated_at) >
                  new Date(chat.last_read_at || 0);

                // Get last message logic
                const lastMessage = chat.chats.messages && chat.chats.messages.length > 0 
                  ? chat.chats.messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
                  : null;

                let lastMessagePreview = getParticipantRoleLabel(otherUser?.role);
                if (lastMessage) {
                  if (lastMessage.content) {
                    lastMessagePreview = lastMessage.content.length > 20 
                      ? lastMessage.content.substring(0, 20) + "..." 
                      : lastMessage.content;
                  } else if (lastMessage.image_url) {
                    lastMessagePreview = "📷 Image";
                  }
                }
                
                const isOnline = otherUser ? onlineUsers[otherUser.id] || false : false;

                return (
                  <button
                    key={chat.chat_id}
                    onClick={() => setActiveChatId(chat.chat_id)}
                    className={cn(
                      "w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all",
                      activeChatId === chat.chat_id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        {otherUser?.profile_image_url && (
                          <AvatarImage
                            src={otherUser.profile_image_url}
                            alt={otherUser.full_name}
                          />
                        )}
                        <AvatarFallback
                          className={cn(
                            "font-bold",
                            activeChatId === chat.chat_id
                              ? "bg-white/20"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {otherUser?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold truncate">
                          {otherUser?.full_name || "User"}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-tighter opacity-70",
                            activeChatId === chat.chat_id
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {new Date(chat.chats.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs truncate font-medium",
                          activeChatId === chat.chat_id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {lastMessagePreview}
                      </p>
                    </div>
                    {isUnread && activeChatId !== chat.chat_id && (
                      <span className="w-3 h-3 rounded-full bg-primary ring-2 ring-background"></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-background",
          !activeChatId && "hidden md:flex",
        )}
      >
        {activeChatId ? (
          <>
            <ChatHeader
              name={activeOtherUser?.full_name || "User"}
              image={activeOtherUser?.profile_image_url}
              role={
                getParticipantRoleLabel(activeOtherUser?.role)
              }
              online={activeOtherUser ? onlineUsers[activeOtherUser.id] || false : false}
              onBack={() => setActiveChatId(null)}
              // hideActions={false}
            />

            <div
              className="flex-1 overflow-y-scroll p-6 bg-muted/5"
              ref={scrollRef}
            >
              <div className="flex flex-col">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      content={msg.content}
                      imageUrl={msg.image_url}
                      timestamp={new Date(msg.created_at).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                      isSender={msg.sender_id === user?.id}
                      status={msg.is_read ? "read" : "sent"}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <ChatInput
              onSendMessage={handleSendMessage}
              isSending={isSending}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
              <MessageSquare size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2">
              {t("selectConversation")}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {t("selectConversationDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
