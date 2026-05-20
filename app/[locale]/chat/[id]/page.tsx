import { getOrCreateChat } from "@/app/actions/chat";
import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });

  return {
    title: `${t("title")} | Shop & Ship LTD`,
    description: "Chat with merchants or customers on Shop & Ship LTD.",
  };
}

export default async function ChatPage({ params }: Props) {
  const { id, locale } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect(`/${locale}/login?next=/chat/${id}`);
  }
  const currentUserId = userData.user.id;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const resolvedChatId = id;

  if (id === "support") {
    // Find a superadmin to chat with
    const { data: admin } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (admin) {
      const res = await getOrCreateChat(admin.id);
      if (res.data) {
        redirect(`/${locale}/chat/${res.data}`);
      }
    }
  } else if (!uuidRegex.test(id)) {
    // Invalid ID
  } else {
    // Check if it's a chat ID
    const { data: chat } = await supabase
      .from("chats")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!chat) {
      let targetUserId = id;

      // Check if it's a merchant_profile id
      const { data: merchantProfile } = await supabase
        .from("merchant_profiles")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();

      if (merchantProfile) {
        targetUserId = merchantProfile.user_id;
      }

      // Not a chat ID, assume it's a user ID
      const res = await getOrCreateChat(targetUserId);
      if (res.data) {
        redirect(`/${locale}/chat/${res.data}`);
      }
      if (res.error) {
        console.error("Failed to get or create chat:", res.error);
        redirect(`/${locale}/?error=chat_creation_failed`);
      }
    }
  }

  // Fetch the other participant's details
  const { data: participantData } = await supabase
    .from("chat_participants")
    .select(
      `
      user_id,
      profiles!inner (
        full_name,
        profile_image_url,
        role
      )
    `,
    )
    .eq("chat_id", resolvedChatId)
    .neq("user_id", currentUserId)
    .limit(1)
    .single();

  const otherUser = participantData?.profiles
    ? Array.isArray(participantData.profiles)
      ? participantData.profiles[0]
      : participantData.profiles
    : null;

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      <ChatClient
        chatId={resolvedChatId}
        otherUserName={otherUser?.full_name || "Support"}
        otherUserImage={otherUser?.profile_image_url || undefined}
        otherUserRole={otherUser?.role || ""}
      />
    </main>
  );
}
