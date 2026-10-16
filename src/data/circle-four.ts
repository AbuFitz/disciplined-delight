import { normaliseFourBoard, type FourBoard } from "@/domain/four";
import { supabase } from "@/lib/supabase";
import { circleMessage } from "./circle";

export type FourStatus = "pending" | "active" | "won" | "draw" | "declined" | "closed";

export type FourGame = {
  id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  board: FourBoard;
  mine_token: 1 | 2;
  current_turn_id: string | null;
  winner_id: string | null;
  status: FourStatus;
  invited_me: boolean;
  my_turn: boolean;
  creator_dare: string;
  invited_dare: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteFourGame = Omit<FourGame, "board"> & { board: unknown };

export type FourDraft = { userId: string; dare: string };

const rpc = async <T>(name: string, params?: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error("Four in a Row needs account services to be configured.");
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(fourMessage(error));
  return data as T;
};

export function fourMessage(error: unknown): string {
  const raw = (error as { message?: string })?.message ?? String(error ?? "");
  if (raw.includes("invalid_dare")) return "Write a self-chosen dare between 4 and 120 characters.";
  if (raw.includes("game_open")) return "You already have an open game with this person.";
  if (raw.includes("game_unavailable")) return "This game is no longer available.";
  if (raw.includes("not_your_turn")) return "It is not your turn yet.";
  if (raw.includes("column_full")) return "That column is full. Choose another.";
  if (raw.includes("invalid_column")) return "Choose one of the seven columns.";
  return circleMessage(error);
}

export function validateFourDraft(draft: FourDraft): string | null {
  if (!draft.userId) return "Choose a connection.";
  return validateFourDare(draft.dare);
}

export function validateFourDare(dare: string): string | null {
  const length = dare.trim().length;
  if (length < 4 || length > 120) return "Write a self-chosen dare between 4 and 120 characters.";
  return null;
}

const normaliseGame = (game: RemoteFourGame): FourGame => ({
  ...game,
  board: normaliseFourBoard(game.board),
});

export const fourApi = {
  async list(): Promise<FourGame[]> {
    const games = await rpc<RemoteFourGame[]>("circle_four_games");
    return games.map(normaliseGame);
  },
  create: (draft: FourDraft) =>
    rpc<string>("circle_four_create", {
      p_user_id: draft.userId,
      p_creator_dare: draft.dare.trim(),
    }),
  respond: (id: string, accept: boolean, dare?: string) =>
    rpc<FourStatus>("circle_four_respond", {
      p_game_id: id,
      p_accept: accept,
      p_invited_dare: accept ? dare?.trim() : null,
    }),
  move: (id: string, column: number) =>
    rpc<FourStatus>("circle_four_move", { p_game_id: id, p_column: column }),
  close: (id: string) => rpc<void>("circle_four_close", { p_game_id: id }),
};
