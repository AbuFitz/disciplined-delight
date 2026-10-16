import { supabase } from "@/lib/supabase";
import { circleMessage } from "./circle";

export type ChatThread = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  last_message: string | null;
  last_at: string | null;
  last_mine: boolean | null;
  unread_count: number;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted: boolean;
  mine: boolean;
};

const rpc = async <T>(name: string, params?: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error("Chat needs account services to be configured.");
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    const raw = error.message ?? "";
    if (raw.includes("chat_unavailable"))
      throw new Error("Chat is available only between accepted, unblocked connections.");
    if (raw.includes("invalid_message")) throw new Error("Write between 1 and 1,000 characters.");
    if (raw.includes("message_not_found")) throw new Error("That message is no longer available.");
    throw new Error(circleMessage(error));
  }
  return data as T;
};

export const chatApi = {
  threads: () => rpc<ChatThread[]>("circle_chat_threads"),
  messages: (userId: string) =>
    rpc<ChatMessage[]>("circle_chat_messages", {
      p_user_id: userId,
      p_before: null,
      p_limit: 100,
    }).then((messages) => messages.reverse()),
  send: (userId: string, body: string) =>
    rpc<string>("circle_chat_send", { p_user_id: userId, p_body: body.trim() }),
  markRead: (userId: string) => rpc<number>("circle_chat_mark_read", { p_user_id: userId }),
  delete: (messageId: string) => rpc<void>("circle_chat_delete", { p_message_id: messageId }),
};

export function validateMessage(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Write a message first.";
  if (trimmed.length > 1000) return "Keep messages to 1,000 characters.";
  return null;
}
