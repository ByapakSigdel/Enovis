"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Channel, ChannelMessage } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { MessageSquare, Star, User } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const typeBadge: Record<
  Channel["type"],
  { label: string; variant: "default" | "info" | "warning" }
> = {
  public: { label: "Public", variant: "default" },
  private: { label: "Private", variant: "warning" },
  direct_message: { label: "DM", variant: "info" },
};

const typeIcon: Record<Channel["type"], React.ReactNode> = {
  public: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  ),
  private: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  direct_message: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function ChannelsPage() {
  const { user } = useAuth();

  /* ---- Channel list state ------------------------------------------ */
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  /* ---- Messages state ---------------------------------------------- */
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  /* ---- Compose state ----------------------------------------------- */
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---- Create channel modal state ---------------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<Channel["type"]>("public");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Channel search ---------------------------------------------- */
  const [channelSearch, setChannelSearch] = useState("");

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;

  /* ---- Fetch channels ---------------------------------------------- */

  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const res = await api.channels.list();
      if (res.success && res.data) {
        setChannels(res.data as unknown as Channel[]);
      } else {
        setChannelsError(res.error || "Failed to load channels");
      }
    } catch {
      setChannelsError("Network error loading channels");
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  /* ---- Fetch messages when channel changes ------------------------- */

  const fetchMessages = useCallback(async (channelId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const res = await api.channels.messages.list(channelId);
      if (res.success && res.data) {
        setMessages(res.data as unknown as ChannelMessage[]);
      } else {
        setMessagesError(res.error || "Failed to load messages");
      }
    } catch {
      setMessagesError("Network error loading messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages(selectedChannelId);
    } else {
      setMessages([]);
    }
  }, [selectedChannelId, fetchMessages]);

  /* ---- Auto-scroll to bottom on new messages ----------------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---- Send message ------------------------------------------------ */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !selectedChannelId) return;

    setSending(true);
    try {
      const res = await api.channels.messages.create(selectedChannelId, {
        content: draft.trim(),
      });
      if (res.success) {
        setDraft("");
        await fetchMessages(selectedChannelId);
      }
    } finally {
      setSending(false);
    }
  };

  /* ---- Create channel ---------------------------------------------- */

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await api.channels.create({
        name: createName.trim(),
        type: createType,
        description: createDescription.trim() || null,
      });
      if (res.success && res.data) {
        const newChannel = res.data as unknown as Channel;
        resetCreateModal();
        await fetchChannels();
        setSelectedChannelId(newChannel.id);
      } else {
        setCreateError(res.error || "Failed to create channel");
      }
    } catch {
      setCreateError("Network error creating channel");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateName("");
    setCreateType("public");
    setCreateDescription("");
    setCreateError(null);
  };

  /* ---- Filtered channels ------------------------------------------- */

  const filteredChannels = channelSearch.trim()
    ? channels.filter((c) =>
        c.name.toLowerCase().includes(channelSearch.toLowerCase())
      )
    : channels;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#fafdf7]">
      {/* ============================================================ */}
      {/*  LEFT PANEL — Channel List                                   */}
      {/* ============================================================ */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-sage-200 bg-white">
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-sage-100 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Enterprise
            </p>
            <h2 className="text-lg font-bold text-neutral-800">Channels</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600"
            aria-label="New channel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search channels..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full rounded-lg border border-sage-200 bg-sage-50 py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Channel list */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {channelsLoading ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <svg className="h-6 w-6 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-neutral-500">Loading channels...</p>
            </div>
          ) : channelsError ? (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-red-500">{channelsError}</p>
              <button
                onClick={fetchChannels}
                className="mt-2 text-xs font-medium text-primary-500 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">
                <MessageSquare className="w-8 h-8 text-primary-500" />
              </div>
              <p className="text-sm font-semibold text-neutral-700">
                {channelSearch ? "No matching channels" : "No channels yet"}
              </p>
              {!channelSearch && (
                <p className="mt-1 text-xs text-neutral-400">
                  Create a channel to bring your team together
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filteredChannels.map((channel) => {
                const isActive = channel.id === selectedChannelId;
                const badge = typeBadge[channel.type];
                return (
                  <li key={channel.id}>
                    <button
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-neutral-700 hover:bg-sage-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isActive
                            ? "bg-primary-100 text-primary-600"
                            : "bg-sage-100 text-neutral-500"
                        )}
                      >
                        {typeIcon[channel.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              isActive ? "text-primary-700" : "text-neutral-800"
                            )}
                          >
                            {channel.name}
                          </span>
                          {channel.archived && (
                            <Badge variant="warning" className="shrink-0 text-[10px] px-1.5 py-0">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                            {badge.label}
                          </Badge>
                          <span>{channel.members?.length ?? 0} members</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      {/* ============================================================ */}
      {/*  RIGHT PANEL — Messages                                      */}
      {/* ============================================================ */}
      <main className="flex flex-1 flex-col">
        {!selectedChannel ? (
          /* ---- No channel selected ----------------------------------- */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
              <MessageSquare className="w-8 h-8 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-700">
                Your team&apos;s communication hub
              </h3>
              <p className="mt-1 max-w-xs text-sm text-neutral-500">
                Select a channel from the sidebar to read messages, or create a new one to kick off a conversation.
              </p>
            </div>
            {/* Mock message previews */}
            <div className="w-full max-w-sm space-y-2 text-left">
              {[
                { avatar: <User className="w-4 h-4 text-primary-500" />, name: "Alex Chen", msg: "Just pushed the latest design updates to staging", time: "2m ago" },
                { avatar: <User className="w-4 h-4 text-primary-500" />, name: "Sarah Kim", msg: "Great work everyone! The Q3 report is ready for review", time: "15m ago" },
                { avatar: <User className="w-4 h-4 text-primary-500" />, name: "James Lee", msg: "Standup in 10 minutes — don't forget!", time: "1h ago" },
              ].map((m, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-sage-50 p-3 opacity-60">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm">{m.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-800">{m.name}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0">{m.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-500">{m.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ---- Channel header ------------------------------------ */}
            <header className="flex items-center gap-3 border-b border-sage-200 bg-white px-6 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                {typeIcon[selectedChannel.type]}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-neutral-800">
                  {selectedChannel.name}
                </h2>
                {selectedChannel.description && (
                  <p className="truncate text-xs text-neutral-500">
                    {selectedChannel.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={typeBadge[selectedChannel.type].variant}>
                  {typeBadge[selectedChannel.type].label}
                </Badge>
                <span className="text-xs text-neutral-500">
                  {selectedChannel.members?.length ?? 0} members
                </span>
              </div>
            </header>

            {/* ---- Messages list ------------------------------------- */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messagesLoading ? (
                <div className="flex flex-col items-center gap-2 py-16">
                  <svg className="h-7 w-7 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-neutral-500">Loading messages...</p>
                </div>
              ) : messagesError ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-red-500">{messagesError}</p>
                  <button
                    onClick={() => fetchMessages(selectedChannelId!)}
                    className="mt-2 text-xs font-medium text-primary-500 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">
                    <Star className="w-8 h-8 text-primary-500" />
                  </div>
                  <p className="font-semibold text-neutral-700">No messages yet</p>
                  <p className="text-sm text-neutral-400">
                    Be the first to start the conversation in #{selectedChannel.name}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const isGrouped =
                      prevMsg?.senderId === msg.senderId &&
                      msg.createdAt &&
                      prevMsg?.createdAt &&
                      new Date(msg.createdAt).getTime() -
                        new Date(prevMsg.createdAt).getTime() <
                        5 * 60 * 1000;

                    const isOwn = user?.id === msg.senderId;

                    return (
                      <li
                        key={msg.id}
                        className={cn(
                          "group flex gap-3 rounded-lg px-3 py-1 transition-colors hover:bg-sage-50",
                          !isGrouped && idx > 0 && "mt-3"
                        )}
                      >
                        {/* Avatar column */}
                        <div className="w-8 shrink-0 pt-0.5">
                          {!isGrouped && (
                            <Avatar name={msg.senderName} size="sm" />
                          )}
                        </div>

                        {/* Content column */}
                        <div className="min-w-0 flex-1">
                          {!isGrouped && (
                            <div className="mb-0.5 flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  isOwn
                                    ? "text-primary-600"
                                    : "text-neutral-800"
                                )}
                              >
                                {msg.senderName}
                              </span>
                              <span className="text-xs text-neutral-400">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              {msg.edited && (
                                <Badge
                                  variant="custom"
                                  className="bg-sage-100 text-neutral-500 text-[10px] px-1.5 py-0"
                                >
                                  edited
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-700">
                            {msg.content}
                          </p>
                        </div>

                        {/* Hover timestamp for grouped messages */}
                        {isGrouped && (
                          <span className="shrink-0 self-center text-[10px] text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </ul>
              )}
            </div>

            {/* ---- Message input ------------------------------------- */}
            <div className="border-t border-sage-200 bg-white px-6 py-3">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message #${selectedChannel.name}...`}
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    disabled={sending}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!draft.trim() || sending}
                  loading={sending}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send
                </Button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* ============================================================ */}
      {/*  CREATE CHANNEL MODAL                                        */}
      {/* ============================================================ */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetCreateModal}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <h2 className="mb-1 text-lg font-bold text-neutral-800">
              New Channel
            </h2>
            <p className="mb-5 text-sm text-neutral-500">
              Create a channel for your team to communicate.
            </p>

            <form
              onSubmit={handleCreateChannel}
              className="flex flex-col gap-4"
            >
              <Input
                label="Channel Name"
                placeholder="e.g. general, design-team"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Type
                </label>
                <select
                  value={createType}
                  onChange={(e) =>
                    setCreateType(e.target.value as Channel["type"])
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="direct_message">Direct Message</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {createError && (
                <p className="text-xs text-red-500">{createError}</p>
              )}

              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={resetCreateModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={creating}
                  disabled={!createName.trim()}
                >
                  Create Channel
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
