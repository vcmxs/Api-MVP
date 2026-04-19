"use client"

import { useState } from "react"
import { Megaphone, X, Info, Bell, MessageCircle, Check, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// Mock trainee data
const trainees = [
  { id: "1", name: "Sarah Johnson", email: "sarah@example.com" },
  { id: "2", name: "Mike Chen", email: "mike@example.com" },
  { id: "3", name: "Emily Davis", email: "emily@example.com" },
  { id: "4", name: "Jake Wilson", email: "jake@example.com" },
  { id: "5", name: "Lisa Park", email: "lisa@example.com" },
  { id: "6", name: "Tom Anderson", email: "tom@example.com" },
]

type SendMode = "notification" | "chat" | "both"

interface BlastMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BlastMessageModal({ open, onOpenChange }: BlastMessageModalProps) {
  const [message, setMessage] = useState("")
  const [sendMode, setSendMode] = useState<SendMode>("both")
  const [selectAll, setSelectAll] = useState(true)
  const [selectedTrainees, setSelectedTrainees] = useState<Set<string>>(
    new Set(trainees.map(t => t.id))
  )

  const maxChars = 300

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedTrainees(new Set(trainees.map(t => t.id)))
    } else {
      setSelectedTrainees(new Set())
    }
  }

  const handleTraineeToggle = (traineeId: string) => {
    const newSelected = new Set(selectedTrainees)
    if (newSelected.has(traineeId)) {
      newSelected.delete(traineeId)
    } else {
      newSelected.add(traineeId)
    }
    setSelectedTrainees(newSelected)
    setSelectAll(newSelected.size === trainees.length)
  }

  const handleSend = () => {
    console.log("Sending blast message:", {
      message,
      sendMode,
      recipients: Array.from(selectedTrainees),
    })
    // Reset and close
    setMessage("")
    onOpenChange(false)
  }

  const recipientCount = selectedTrainees.size
  const sendButtonLabel = selectAll
    ? `Send to all ${trainees.length} trainees`
    : `Send to ${recipientCount} trainee${recipientCount !== 1 ? "s" : ""}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-2xl rounded-t-2xl border-t border-[#ffd700]/30 bg-[#0a0a0f] p-0"
      >
        {/* Custom Header */}
        <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,215,0,0.15)" }}
            >
              <Megaphone className="h-5 w-5 text-[#ffd700]" />
            </div>
            <SheetTitle className="text-lg font-bold text-white">
              Blast Message
            </SheetTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="space-y-5">
            {/* Info Box */}
            <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#161b22] p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00ffff]/10">
                <Info className="h-4 w-4 text-[#00ffff]" />
              </div>
              <p className="text-sm leading-relaxed text-[#888888]">
                Send a broadcast to one or more of your trainees. They will
                receive it as a chat message, an in-app notification, or both.
              </p>
            </div>

            {/* Message Textarea */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
                  placeholder="Write your message..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#ffd700]/50 focus:outline-none"
                />
                <span className="absolute bottom-3 right-3 text-xs text-[#555555]">
                  {message.length}/{maxChars}
                </span>
              </div>
            </div>

            {/* Send As Toggle */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                Send As
              </label>
              <div className="flex gap-2">
                <SendModeButton
                  icon={<Bell className="h-4 w-4" />}
                  label="Notification"
                  active={sendMode === "notification"}
                  onClick={() => setSendMode("notification")}
                />
                <SendModeButton
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Chat Message"
                  active={sendMode === "chat"}
                  onClick={() => setSendMode("chat")}
                />
                <SendModeButton
                  icon={<Megaphone className="h-4 w-4" />}
                  label="Both"
                  active={sendMode === "both"}
                  onClick={() => setSendMode("both")}
                />
              </div>
              {/* Push notification note */}
              {(sendMode === "notification" || sendMode === "both") && (
                <p className="text-xs italic text-[#555555]">
                  Push notification requires the server to be up to date.
                </p>
              )}
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                Recipients
              </label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#161b22]">
                {/* All Trainees Row */}
                <label className="flex cursor-pointer items-center gap-3 border-b border-white/[0.08] px-4 py-3 transition-colors hover:bg-white/[0.02]">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    color="gold"
                  />
                  <span className="font-medium text-white">
                    All Trainees ({trainees.length})
                  </span>
                </label>

                {/* Individual Trainees */}
                {trainees.map((trainee) => (
                  <label
                    key={trainee.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-b-0 transition-colors hover:bg-white/[0.02]"
                  >
                    <Checkbox
                      checked={selectedTrainees.has(trainee.id)}
                      onChange={() => handleTraineeToggle(trainee.id)}
                      color="cyan"
                    />
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-black"
                        style={{
                          background: "linear-gradient(135deg, #00ffff, #00ff88)",
                        }}
                      >
                        {trainee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {trainee.name}
                        </p>
                        <p className="text-xs text-[#555555]">{trainee.email}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Send Button */}
        <div className="border-t border-white/[0.08] p-4">
          <button
            onClick={handleSend}
            disabled={message.trim().length === 0 || recipientCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd700] px-6 py-3 font-bold text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>{sendButtonLabel}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Custom Checkbox Component
function Checkbox({
  checked,
  onChange,
  color,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  color: "gold" | "cyan"
}) {
  const accentColor = color === "gold" ? "#ffd700" : "#00ffff"

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
        checked
          ? "border-transparent"
          : "border-[#555555] bg-transparent hover:border-[#888888]"
      )}
      style={
        checked
          ? { backgroundColor: accentColor }
          : undefined
      }
    >
      {checked && <Check className="h-3 w-3 text-black" />}
    </button>
  )
}

// Send Mode Button
function SendModeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-[#ffd700] text-black"
          : "border border-white/[0.08] bg-[#161b22] text-[#888888] hover:text-white"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
