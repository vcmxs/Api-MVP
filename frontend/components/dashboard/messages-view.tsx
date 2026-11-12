"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Send, MessageCircle, Users, Loader2, RefreshCw } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"

// ── API types ─────────────────────────────────────────────────────────────

interface ApiFriend {
  id: number
  name: string
  username?: string
  profile_pic_url?: string
  isOnline?: boolean
  role?: string
}

interface ApiConversation {
  id: number | string
  friend: ApiFriend
  lastMessage: string
  lastMessageDate: string
  unreadCount: number
  isRead: boolean
}

interface ApiContact {
  id: number
  name: string
  role?: string
  profile_pic_url?: string
  lastMessage?: string | null
  lastMessageDate?: string | null
  unreadCount: number
  hasConversation: boolean
}

interface ApiMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
  pending?: boolean
}

type MessagesTab = "chats" | "contacts"

// ── Helpers ───────────────────────────────────────────────────────────────

function initials(name: string) {
  const clean = (name || "").trim()
  const letters = clean.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  return letters || "?"
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

  const [tab, setTab] = useState<MessagesTab>("chats")

  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState("")

  const [contacts, setContacts] = useState<ApiContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState("")

  const [selectedFriend, setSelectedFriend] = useState<ApiFriend | null>(null)
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Prevents re-opening the same target on every render (profile "Chat" button,
  // message notification, toast…)
  const handledTargetRef = useRef<number | null>(null)

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

  // ── Fetch linked contacts (coach/trainee + accepted friends) ─────────────

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true)
    setContactsError("")
    try {
      const data = await apiFetch<{ contacts: ApiContact[] }>("/social/contacts")
      setContacts((data.contacts ?? []).map((c) => ({ ...c, unreadCount: c.unreadCount ?? 0 })))
    } catch (e) {
      setContactsError(e instanceof Error ? e.message : "Failed to load contacts")
    } finally {
      setContactsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    fetchContacts()
  }, [fetchConversations, fetchContacts])

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

  // Opens a chat with any linked user, even before the first message exists
  const openChat = useCallback((friend: ApiFriend) => {
    setSelectedFriend(friend)
    fetchMessages(friend.id)
    // Mark as read locally
    setConversations((prev) =>
      prev.map((c) => c.friend.id === friend.id ? { ...c, unreadCount: 0, isRead: true } : c)
    )
    setContacts((prev) =>
      prev.map((c) => c.id === friend.id ? { ...c, unreadCount: 0 } : c)
    )
  }, [fetchMessages])

  const handleSelectConversation = (conv: ApiConversation) => {
    openChat(conv.friend)
  }

  // Auto-select when coming from a trainee profile, a notification or a toast.
  // Resolution order: existing conversation → linked contact → plain profile fetch
  useEffect(() => {
    if (!defaultTraineeId) {
      handledTargetRef.current = null
      return
    }
    if (handledTargetRef.current === defaultTraineeId) return
    if (convLoading) return

    const conv = conversations.find((c) => c.friend.id === defaultTraineeId)
    if (conv) {
      handledTargetRef.current = defaultTraineeId
      openChat(conv.friend)
      return
    }

    const contact = contacts.find((c) => c.id === defaultTraineeId)
    if (contact) {
      handledTargetRef.current = defaultTraineeId
      openChat(contact)
      return
    }

    // Contacts still loading: wait for the next run
    if (contactsLoading) return

    // Not linked (edge case): open the thread anyway so the button never fails
    handledTargetRef.current = defaultTraineeId
    openChat({ id: defaultTraineeId, name: "" })
    apiFetch<{ id: number; name: string; role?: string }>(`/users/${defaultTraineeId}`)
      .then((profile) => {
        if (profile?.name) {
          setSelectedFriend({ id: defaultTraineeId, name: profile.name, role: profile.role })
        }
      })
      .catch(() => { /* keep the placeholder name */ })
  }, [defaultTraineeId, convLoading, conversations, contacts, contactsLoading, openChat])

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
      const response = await apiFetch<{ message?: ApiMessage }>("/social/messages", {
        method: "POST",
        body: JSON.stringify({ friendId: selectedFriend.id, content, type: "text" }),
      })

      // Swap the optimistic row for the one the server just stored: it carries
      // the real id and, most importantly, the real `created_at` (the naive DB
      // timestamp comes back as an ISO string in UTC), so the bubble keeps the
      // correct time once the thread is refreshed.
      const saved = response?.message
      const sentAt = saved?.created_at ? new Date(saved.created_at).toISOString() : new Date().toISOString()

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== tempMsg.id) return m
          if (!saved) return { ...m, created_at: sentAt, pending: false }
          return {
            ...saved,
            sender_id: saved.sender_id ?? tempMsg.sender_id,
            content: saved.content ?? content,
            created_at: sentAt,
            pending: false,
          }
        })
      )

      // Update the conversation list preview, creating the thread if this was
      // the first message with a contact
      setConversations((prev) => {
        const exists = prev.some((c) => c.friend.id === selectedFriend.id)
        if (exists) {
          return prev.map((c) =>
            c.friend.id === selectedFriend.id
              ? { ...c, lastMessage: content, lastMessageDate: sentAt, unreadCount: 0, isRead: true }
              : c
          )
        }
        return [
          {
            id: String(selectedFriend.id),
            friend: selectedFriend,
            lastMessage: content,
            lastMessageDate: sentAt,
            unreadCount: 0,
            isRead: true,
          },
          ...prev,
        ]
      })

      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedFriend.id
            ? { ...c, lastMessage: content, lastMessageDate: sentAt, hasConversation: true }
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

  // ── Filtered lists ────────────────────────────────────────────────────────

  const query = searchQuery.toLowerCase()
  const filteredConversations = conversations.filter((c) =>
    c.friend.name.toLowerCase().includes(query)
  )
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(query)
  )

  const listLoading = tab === "chats" ? convLoading : contactsLoading
  const listError = tab === "chats" ? convError : contactsError
  const isEmptyList = tab === "chats"
    ? filteredConversations.length === 0
    : filteredContacts.length === 0

  const roleLabel = (role?: string) => {
    const value = (role ?? "").toLowerCase()
    if (value === "coach") return t.messages.roleCoach
    if (value === "trainee") return t.messages.roleTrainee
    return ""
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border border-white/[0.08]">

      {/* Left — chats / contacts */}
      <div className="flex w-[32%] min-w-[280px] flex-col border-r border-white/[0.08] bg-[#161b22]">

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 border-b border-white/[0.08] p-2">
          <button
            onClick={() => { setTab("chats"); setSearchQuery("") }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "chats" ? "bg-[#00ffff] text-black" : "text-[#888888] hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {t.messages.chatsTab}
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${tab === "chats" ? "bg-black/10" : "bg-white/[0.06] text-[#888888]"}`}>
              {conversations.length}
            </span>
          </button>
          <button
            onClick={() => { setTab("contacts"); setSearchQuery("") }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "contacts" ? "bg-[#00ffff] text-black" : "text-[#888888] hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            {t.messages.contactsTab}
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${tab === "contacts" ? "bg-black/10" : "bg-white/[0.06] text-[#888888]"}`}>
              {contacts.length}
            </span>
          </button>
        </div>

        {/* Search + refresh */}
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
            <input
              type="text"
              placeholder={tab === "chats" ? t.messages.searchConversations : t.messages.searchContacts}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] pl-10 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
            />
          </div>
          <button
            onClick={() => { fetchConversations(); fetchContacts() }}
            disabled={listLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0a0a0f] text-[#888888] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
            </div>
          ) : listError ? (
            <div className="px-4 py-8 text-center text-sm text-[#ff4444]">{listError}</div>
          ) : isEmptyList ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-white">
                {searchQuery
                  ? t.messages.noConversationsFound
                  : tab === "chats" ? t.messages.noChats : t.messages.noContacts}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-xs text-[#555555]">
                  {tab === "chats" ? t.messages.noChatsHint : t.messages.noContactsHint}
                </p>
              )}
            </div>
          ) : tab === "chats" ? (
            filteredConversations.map((conv) => {
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
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedFriend?.id === contact.id
              return (
                <button
                  key={contact.id}
                  onClick={() => openChat({ id: contact.id, name: contact.name, role: contact.role, profile_pic_url: contact.profile_pic_url })}
                  className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02] ${isSelected ? "bg-white/[0.04]" : ""}`}
                  style={isSelected ? { borderLeft: "3px solid #00ffff" } : { borderLeft: "3px solid transparent" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]">
                    <span className="text-sm font-bold text-black">{initials(contact.name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-white">{contact.name}</p>
                      {contact.lastMessageDate && (
                        <span className="shrink-0 text-xs text-[#555555]">{timeAgo(contact.lastMessageDate)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-[#888888]">
                        {contact.lastMessage || t.messages.sendFirstMessage}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#00ffff] px-1 text-xs font-bold text-black">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    {roleLabel(contact.role) && (
                      <span className="text-[11px] uppercase tracking-wide text-[#555555]">{roleLabel(contact.role)}</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right — chat area */}
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
                <p className="font-semibold text-white">{selectedFriend.name || "…"}</p>
                {roleLabel(selectedFriend.role) ? (
                  <span className="text-xs uppercase tracking-wide text-[#888888]">{roleLabel(selectedFriend.role)}</span>
                ) : selectedFriend.isOnline ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#00ff88]" />
                    <span className="text-xs text-[#00ff88]">{t.messages.active}</span>
                  </div>
                ) : null}
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



