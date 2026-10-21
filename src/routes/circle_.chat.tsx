import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, MessageCircle, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Group,
  IconButton,
  PageHeader,
  Panel,
  Skeleton,
  TextArea,
} from "@/components/nl/ui";
import { useAccountProfile } from "@/data/account-profile";
import { chatApi, type ChatMessage, type ChatThread, validateMessage } from "@/data/circle-chat";
import { circleMessage } from "@/data/circle";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// The trailing underscore in the filename keeps this full-page route out of Circle's layout tree.
export const Route = createFileRoute("/circle_/chat")({ component: CircleChatPage });

function CircleChatPage() {
  const auth = useAuth();
  const profile = useAccountProfile();
  const ready = !!auth.user && profile.state.status === "ready" && isSupabaseConfigured;
  return (
    <>
      <PageHeader
        title="Chat"
        sub="One-to-one with accepted connections. No strangers."
        actions={
          <Link
            to="/circle"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Circle
          </Link>
        }
      />
      {ready ? <ChatLive /> : <ChatGate />}
    </>
  );
}

function ChatGate() {
  return (
    <Panel tone="dusk">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <MessageCircle className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight">
        Chat starts with a real connection
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Connect VAYVOR account services, sign in, finish your handle and accept a Circle connection.
        Chat does not create sample conversations.
      </p>
      <Link
        to="/settings"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground sm:w-fit"
      >
        Open account settings
      </Link>
    </Panel>
  );
}

function ChatLive() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<ChatMessage | null>(null);
  const selected = useMemo(
    () => threads.find((thread) => thread.user_id === selectedId) ?? null,
    [threads, selectedId],
  );

  const loadThreads = useCallback(async () => {
    try {
      const next = await chatApi.threads();
      setThreads(next);
      setSelectedId((current) =>
        current && next.some((thread) => thread.user_id === current)
          ? current
          : (next[0]?.user_id ?? null),
      );
      setError(null);
    } catch (cause) {
      setError(circleMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const next = await chatApi.messages(userId);
      setMessages(next);
      await chatApi.markRead(userId);
      setError(null);
    } catch (cause) {
      setError(circleMessage(cause));
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId).then(loadThreads);
    const timer = window.setInterval(() => {
      void loadMessages(selectedId, true);
      void loadThreads();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages, loadThreads]);

  const send = async () => {
    if (!selectedId || validateMessage(draft)) return;
    setSending(true);
    try {
      await chatApi.send(selectedId, draft);
      setDraft("");
      await Promise.all([loadMessages(selectedId, true), loadThreads()]);
    } catch (cause) {
      toast.error(circleMessage(cause));
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-[19rem_minmax(0,1fr)]">
      <Panel className="h-fit" aria-label="Conversations">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">Connections</h2>
          <IconButton label="Refresh chat" onClick={() => void loadThreads()}>
            <RefreshCw className="size-4" />
          </IconButton>
        </div>
        {threads.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No one to message yet"
              body="Accept a Circle connection first. Chat is never open to strangers."
              action={
                <Link to="/circle" className="font-semibold underline underline-offset-4">
                  Find people
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line/70">
            {threads.map((thread) => (
              <li key={thread.user_id}>
                <button
                  onClick={() => setSelectedId(thread.user_id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-2xl py-2 text-left",
                    selectedId === thread.user_id && "font-semibold text-primary",
                  )}
                >
                  <Avatar thread={thread} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{thread.display_name}</span>
                      {thread.unread_count > 0 && <Chip tone="ok">{thread.unread_count}</Chip>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {thread.last_message
                        ? `${thread.last_mine ? "You: " : ""}${thread.last_message}`
                        : `@${thread.username}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="min-h-[32rem]" aria-label="Selected conversation">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        {!selected ? (
          <EmptyState title="Choose a connection" body="Your conversation will appear here." />
        ) : (
          <div className="flex min-h-[28rem] flex-col">
            <div className="flex items-center gap-3 pb-2">
              <Avatar thread={selected} />
              <div>
                <h2 className="text-xl font-bold tracking-tight">{selected.display_name}</h2>
                <p className="text-xs text-muted-foreground">@{selected.username}</p>
              </div>
              <Chip tone="ok">Connected</Chip>
            </div>
            <div className="flex-1 py-4" aria-live="polite">
              {loadingMessages ? (
                <Skeleton className="h-40" />
              ) : messages.length === 0 ? (
                <EmptyState
                  title="Start with something real"
                  body="Ask about tomorrow's session, share encouragement, or just say hello."
                />
              ) : (
                <ol className="grid gap-2">
                  {messages.map((message) => (
                    <li
                      key={message.id}
                      className={cn("flex", message.mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                          message.mine ? "bg-primary text-primary-foreground" : "bg-surface-2",
                          message.deleted && "italic opacity-65",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[.68rem] opacity-70">
                          <time dateTime={message.created_at}>
                            {formatTime(message.created_at)}
                          </time>
                          {message.mine && !message.deleted && (
                            <button className="underline" onClick={() => setRemoving(message)}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="pt-3">
              <TextArea
                aria-label={`Message ${selected.display_name}`}
                className="min-h-20"
                maxLength={1000}
                value={draft}
                placeholder="Write a message…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{draft.length}/1,000</span>
                <Button
                  variant="primary"
                  busy={sending}
                  disabled={!!validateMessage(draft)}
                  onClick={() => void send()}
                >
                  <Send className="size-4" /> Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>
      <section aria-label="Chat security" className="md:col-span-2">
        <Group as="ul">
          <li className="flex items-start gap-3.5 p-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Honest security</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Messages are limited to you and the other accepted connection by database policy.
                They are encrypted in transit and by the hosting provider at rest, but this version
                is not end-to-end encrypted. Do not use it for passwords, financial details, medical
                records or emergencies.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3.5 p-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              <Lock className="size-5" />
            </span>
            <p className="self-center text-sm text-muted-foreground">
              Blocking in Circle immediately closes the thread in both directions.
            </p>
          </li>
        </Group>
      </section>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this message?"
        body="It will be replaced with “Message removed” for both people."
        confirmLabel="Remove message"
        tone="danger"
        onConfirm={() => {
          if (!removing || !selectedId) return;
          const messageId = removing.id;
          setRemoving(null);
          void chatApi
            .delete(messageId)
            .then(() => loadMessages(selectedId, true))
            .catch((cause) => toast.error(circleMessage(cause)));
        }}
      />
    </div>
  );
}

function Avatar({ thread }: { thread: ChatThread }) {
  const initials = thread.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"
    >
      {initials || thread.username.slice(0, 2).toUpperCase()}
    </span>
  );
}

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
