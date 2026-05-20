"use server";

import { createClient } from "@/utils/supabase/server";
import { Deal } from "@/lib/types";

export async function getActiveDealsAction(): Promise<{ deals: Deal[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching deals:", error);
    return { deals: [], error: error.message };
  }

  return { deals: data as Deal[] };
}
