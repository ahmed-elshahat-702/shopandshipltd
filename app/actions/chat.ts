"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(chatId: string, content: string, imageUrl?: string) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      sender_id: userData.user.id,
      content,
      image_url: imageUrl,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return { error: error.message };
  }

  revalidatePath(`/chat/${chatId}`);
  return { data };
}

export async function getChatMessages(chatId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return { error: error.message };
  }

  return { data };
}

export async function getChats() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("chat_participants")
    .select(`
      chat_id,
      last_read_at,
      chats (
        id,
        updated_at,
        chat_participants (
          user_id,
          profiles (
            id,
            full_name,
            profile_image_url,
            role
          )
        ),
        messages (
          content,
          image_url,
          created_at
        )
      )
    `)
    .eq("user_id", userData.user.id)
    .order('updated_at', { referencedTable: 'chats', ascending: false });

  if (error) {
    console.error("Error fetching chats:", error);
    return { error: error.message };
  }

  return { data };
}

export async function getUnreadChatCount() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Unauthorized", count: 0 };
  }

  const { data, error } = await supabase
    .from("chat_participants")
    .select(
      `
      last_read_at,
      chats (
        updated_at
      )
    `,
    )
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("Error fetching unread chat count:", error);
    return { error: error.message, count: 0 };
  }

  const count =
    data?.filter((participant) => {
      const chat = Array.isArray(participant.chats)
        ? participant.chats[0]
        : participant.chats;

      if (!chat?.updated_at) return false;

      return (
        new Date(chat.updated_at).getTime() >
        new Date(participant.last_read_at || 0).getTime()
      );
    }).length ?? 0;

  return { count };
}

export async function getOrCreateChat(otherUserId: string) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Unauthorized" };
  }

  // Check if chat already exists
  const { data: existingChats, error: fetchError } = await supabase
    .from("chat_participants")
    .select("chat_id")
    .eq("user_id", userData.user.id);

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (existingChats && existingChats.length > 0) {
    const chatIds = existingChats.map((c) => c.chat_id);
    const { data: match } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .in("chat_id", chatIds)
      .eq("user_id", otherUserId)
      .maybeSingle();

    if (match) {
      return { data: match.chat_id };
    }
  }

  // Create new chat
  const newChatId = crypto.randomUUID();
  const { error: createError } = await supabase
    .from("chats")
    .insert({ id: newChatId, updated_at: new Date().toISOString() });

  if (createError) {
    console.error("Failed to create chat:", createError);
    return { error: createError.message };
  }

  // Add participants
  const { error: partError } = await supabase.from("chat_participants").insert([
    { chat_id: newChatId, user_id: userData.user.id },
    { chat_id: newChatId, user_id: otherUserId },
  ]);

  if (partError) {
    console.error("Failed to add participants:", partError);
    return { error: partError.message };
  }

  return { data: newChatId };
}

export async function markMessagesAsRead(chatId: string) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", userData.user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
