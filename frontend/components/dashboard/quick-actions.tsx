import { UserPlus, Dumbbell, ClipboardPlus, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  variant?: "primary" | "secondary" | "gold"
  onClick?: () => void
}

function QuickAction({ icon, label, variant = "secondary", onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all",
        variant === "primary" && "bg-[#00ffff] text-black hover:opacity-90",
        variant === "secondary" && "border border-white/[0.12] bg-[#161b22] text-white hover:border-white/20 hover:bg-[#1c222b]",
        variant === "gold" && "border border-white/[0.12] bg-[#161b22] text-[#ffd700] hover:border-[#ffd700]/30 hover:bg-[#1c222b]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

interface QuickActionsProps {
  onAddTrainee?: () => void
  onNewWorkout?: () => void
  onCreateProgram?: () => void
  onBlastMessage?: () => void
}

export function QuickActions({ onAddTrainee, onNewWorkout, onCreateProgram, onBlastMessage }: QuickActionsProps) {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#888888]">
        {t.quickActions.title}
      </h3>
      <div className="flex flex-wrap gap-3">
        <QuickAction
          icon={<UserPlus className="h-4 w-4" />}
          label={t.quickActions.addTrainee}
          variant="primary"
          onClick={onAddTrainee}
        />
        <QuickAction
          icon={<Dumbbell className="h-4 w-4 text-[#00ff88]" />}
          label={t.quickActions.newWorkout}
          variant="secondary"
          onClick={onNewWorkout}
        />
        <QuickAction
          icon={<ClipboardPlus className="h-4 w-4 text-[#a78bfa]" />}
          label={t.quickActions.createProgram}
          variant="secondary"
          onClick={onCreateProgram}
        />
        <QuickAction
          icon={<Megaphone className="h-4 w-4" />}
          label={t.quickActions.blastMessage}
          variant="gold"
          onClick={onBlastMessage}
        />
      </div>
    </div>
  )
}
