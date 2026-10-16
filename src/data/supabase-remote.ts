import { supabase } from "@/lib/supabase";
import type { PushResult, Remote, RemoteRecord } from "./sync-engine";

const PAGE = 500;

export function createSupabaseRemote(): Remote & { count(): Promise<number> } {
  if (!supabase) throw new Error("Supabase isn't configured");
  const sb = supabase;
  return {
    async push(m) {
      const { data, error } = await sb.rpc("push_mutation", {
        p_collection: m.collection,
        p_id: m.id,
        p_op: m.op,
        p_data: m.data ?? null,
        p_base_rev: m.baseRev,
        p_mid: m.mid,
      });
      if (error) throw new Error(error.message);
      return data as PushResult;
    },
    async pull(after) {
      const { data, error } = await sb
        .from("records")
        .select("collection,id,data,rev,seq,deleted_at")
        .gt("seq", after)
        .order("seq", { ascending: true })
        .limit(PAGE);
      if (error) throw new Error(error.message);
      const records = (data ?? []) as RemoteRecord[];
      return {
        records,
        cursor: records.length ? records[records.length - 1]!.seq : after,
        more: records.length === PAGE,
      };
    },
    async count() {
      const { count, error } = await sb
        .from("records")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  };
}
