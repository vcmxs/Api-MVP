"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Send, MessageCircle, Loader2, RefreshCw } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"

// ── API types ─────────────────────────────────────────────────────────────

interface ApiFriend {
  id: number
  name: string
  username?: string
  profile_pic_url?: string
  isOnline?: boolean
}

interface ApiConversation {
  id: number
  friend: ApiFriend
  lastMessage: string
  lastMessageDate: string
  unreadCount: number
  isRead: boolean
}

interface ApiMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
  pending?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function bubbleTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

// ── Component ─────────────────────────────────────────────────────────────

export function MessagesView({ defaultTraineeId }: { defaultTraineeId?: number | null } = {}) {
  const { t } = useT()
  const user = getUserInfo()

  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState("")

  const [selectedFriend, setSelectedFriend] = useState<ApiFriend | null>(null)
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Fetch conversations ──────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setConvLoading(true)
    setConvError("")
    try {
      const data = await apiFetch<{ conversations: ApiConversation[] }>("/social/conversations")
      setConversations(data.conversations ?? [])
    } catch (e) {
      setConvError(e instanceof Error ? e.message : "Failed to load conversations")
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Auto-select conversation when coming from trainee profile
  useEffect(() => {
    if (!defaultTraineeId || convLoading || conversations.length === 0) return
    const conv = conversations.find(c => c.friend.id === defaultTraineeId)
    if (conv && !selectedFriend) handleSelectConversation(conv)
  }, [defaultTraineeId, convLoading, conversations]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch messages for selected conversation ─────────────────────────────

  const fetchMessages = useCallback(async (friendId: number) => {
    setMessagesLoading(true)
    try {
      const data = await apiFetch<{ messages: ApiMessage[] }>(`/social/messages/${friendId}`)
      // API returns newest-first (inverted like mobile FlatList), reverse for display
      const sorted = (data.messages ?? []).slice().sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setMessages(sorted)
    } catch {
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  const handleSelectConversation = (conv: ApiConversation) => {
    setSelectedFriend(conv.friend)
    fetchMessages(conv.friend.id)
    // Mark as read locally
    setConversations((prev) =>
      prev.map((c) => c.friend.id === conv.friend.id ? { ...c, unreadCount: 0, isRead: true } : c)
    )
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedFriend || sending) return
    const content = messageInput.trim()
    setMessageInput("")

    // Optimistic
    const tempMsg: ApiMessage = {
      id: Date.now(),
      sender_id: user?.id ?? 0,
      receiver_id: selectedFriend.id,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      setSending(true)
      await apiFetch("/social/messages", {
        method: "POST",
        body: JSON.stringify({ friendId: selectedFriend.id, content, type: "text" }),
      })
      // Update conversation list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.friend.id === selectedFriend.id
            ? { ...c, lastMessage: content, lastMessageDate: new Date().toISOString() }
            : c
        )
      )
    } catch {
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
      setMessageInput(content)
    } finally {
      setSending(false)
    }
  }

  // ── Filtered conversations ────────────────────────────────────────────────

  const filtered = conversations.filter((c) =>
    c.friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!convLoading && conversations.length === 0 && !convError) {
    return (
      <div className="flex h-[calc(100vh-9rem)] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ffff]/10">
            <MessageCircle className="h-8 w-8 text-[#00ffff]" />
          </div>
          <p className="text-lg font-medium text-white">{t.messages.noMessages}</p>
          <p className="mt-1 text-sm text-[#888888]">{t.messages.noMessagesHint}</p>
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border border-white/[0.08]">

      {/* Left — conversation list */}
      <div className="flex w-[30%] min-w-[260px] flex-col border-r border-white/[0.08] bg-[#161b22]">

        {/* Search + refresh */}
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
            <input
              type="text"
              placeholder={t.messages.searchConversations}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] pl-10 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchConversations}
            disabled={convLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0a0a0f] text-[#888888] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${convLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
            </div>
          ) : convError ? (
            <div className="px-4 py-8 text-center text-sm text-[#ff4444]">{convError}</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-[#555555]">{t.messages.noConversationsFound}</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedFriend?.id === conv.friend.id
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02] ${isSelected ? "bg-white/[0.04]" : ""}`}
                  style={isSelected ? { borderLeft: "3px solid #00ffff" } : { borderLeft: "3px solid transparent" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]">
                    <span className="text-sm font-bold text-black">{initials(conv.friend.name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-white">{conv.friend.name}</p>
                      <span className="shrink-0 text-xs text-[#555555]">{timeAgo(conv.lastMessageDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-[#888888]">{conv.lastMessage}</p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#00ffff] px-1 text-xs font-bold text-black">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right — chat window */}
      <div className="flex flex-1 flex-col bg-[#0a0a0f]">
        {!selectedFriend ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ffff]/10">
                <MessageCircle className="h-8 w-8 text-[#00ffff]" />
              </div>
              <p className="text-lg font-medium text-white">{t.messages.selectConversation}</p>
              <p className="mt-1 text-sm text-[#888888]">{t.messages.selectConversationHint}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]">
                <span className="text-sm font-bold text-black">{initials(selectedFriend.name)}</span>
              </div>
              <div>
                <p className="font-semibold text-white">{selectedFriend.name}</p>
                {selectedFriend.isOnline && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#00ff88]" />
                    <span className="text-xs text-[#00ff88]">{t.messages.active}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => fetchMessages(selectedFriend.id)}
                disabled={messagesLoading}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${messagesLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#555555]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#555555]">{t.messages.sayHello}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = String(msg.sender_id) === String(user?.id)
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] px-4 py-3 ${
                            isMe
                              ? "rounded-2xl rounded-br-md bg-[#00ffff] text-black"
                              : "rounded-2xl rounded-bl-md bg-[#161b22] text-white"
                          } ${msg.pending ? "opacity-60" : ""}`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className={`mt-1 text-right text-[10px] ${isMe ? "text-black/50" : "text-[#555555]"}`}>
                            {bubbleTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.08] p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder={t.messages.typeMessage}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  className="h-12 flex-1 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sending}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00ffff] text-black transition-opacity disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
