"use client";

import { getUnreadChatCount } from "@/app/actions/chat";
import { useUser } from "@/hooks/use-auth";
import { usePathname } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useUnreadChatCount() {
  const { user } = useUser();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    await Promise.resolve();

    if (!user) {
      setCount(0);
      return;
    }

    const result = await getUnreadChatCount();
    setCount(result.count ?? 0);
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh, pathname]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread_chat_count:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${user.id}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, supabase, user]);

  return count;
}
