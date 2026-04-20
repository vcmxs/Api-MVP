"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { 
  Dumbbell, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Clock, 
  Award,
  ChevronRight,
  AlertTriangle
} from "lucide-react"

// --- Helper Functions ---
function calculateExpiry(endDate?: string) {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function calculateStreak(workouts: any[]) {
  // Simple streak calculation for now
  return 0 // Placeholder, could be enhanced based on completed workouts
}

function calculateTotalWorkouts(workouts: any[]) {
  return workouts.filter(w => w.status === 'completed').length
}

export function TraineeOverview({ onChangeTab }: { onChangeTab: (tab: string, opts?: { keep?: boolean }) => void }) {
  const { t } = useT()
  const user = getUserInfo()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [nutrition, setNutrition] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  
  const expiryDays = calculateExpiry(user?.coachSubscriptionEndDate ?? user?.coach_subscription_end_date)
  const isExpired = expiryDays !== null && expiryDays < 0

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    const dateStr = new Date().toISOString().split("T")[0]

    try {
      // Fetch workouts
      const wRes = await apiFetch<any>(`/trainees/${user.id}/workout-plans`)
      if (wRes && wRes.workoutPlans) {
        setWorkouts(wRes.workoutPlans)
      }
    } catch (e) { console.error("Failed to fetch workouts") }

    try {
      // Fetch nutrition
      const nRes = await apiFetch<any>(`/nutrition/summary/${dateStr}`)
      if (nRes && nRes.summary) setNutrition(nRes.summary)
    } catch (e) {}

    try {
      // Fetch weight history
      const whRes = await apiFetch<any>(`/users/${user.id}/weight-history`)
      if (whRes && Array.isArray(whRes)) setWeightHistory(whRes)
    } catch (e) {}

    try {
      // Fetch profile
      const pRes = await apiFetch<any>(`/users/${user.id}/profile`)
      if (pRes) setProfile(pRes)
    } catch (e) {}

  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Process data for UI
  const stats = {
    workoutsCompleted: calculateTotalWorkouts(workouts),
    streak: calculateStreak(workouts)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todaysWorkout = workouts.find(w => w.scheduledDate?.startsWith(todayStr) && w.status !== 'completed') || 
                        workouts.filter(w => new Date(w.scheduledDate) >= new Date() && w.status !== 'completed')
                                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0]

  const currentWeight = weightHistory.length > 0 ? parseFloat(weightHistory[weightHistory.length - 1].weight) : (user?.weight ?? '--')
  let weightTrend = 0
  if (weightHistory.length >= 2) {
    const prev = parseFloat(weightHistory[0].weight)
    const cw = currentWeight as number
    if (Math.abs(cw - prev) >= 0.01 && prev !== 0) {
      weightTrend = ((cw - prev) / prev) * 100
    }
  }

  const handleLockedPress = () => {
    alert((t as any).dashboard?.contactCoach || 'Your subscription has expired. Please contact your coach to resume your training.')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Expiry Warning Banner */}
      {expiryDays !== null && expiryDays <= 5 && expiryDays > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-yellow-500">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Your subscription expires in {expiryDays} days. Please renew to avoid losing access.</p>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-red-500">
          <Lock className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Your subscription has EXPIRED. Please contact your coach to renew.</p>
        </div>
      )}

      {/* Plan Status Card */}
      <div className="flex items-center justify-between rounded-2xl border border-[#00ffff]/20 bg-gradient-to-r from-[#00ffff]/10 to-[#00ffff]/5 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00ffff]/20">
            <Award className="h-6 w-6 text-[#00ffff]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{profile?.subscriptionTier || 'Standard Plan'}</h3>
            <p className="text-sm text-[#888888]">Coach: <span className="text-[#00ffff]">{profile?.assigned_coach || 'None'}</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#666]">{isExpired ? 'STATUS' : 'EXPIRES IN'}</p>
          <p className={`text-lg font-bold ${isExpired ? 'text-red-500' : 'text-[#00ffff]'}`}>
             {expiryDays !== null ? (isExpired ? 'EXPIRED' : `${expiryDays} Days`) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00ffff]/10">
            <Dumbbell className="h-6 w-6 text-[#00ffff]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none mb-1">{stats.workoutsCompleted}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Workouts</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00ffff]/10">
            <Flame className="h-6 w-6 text-[#00ffff]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none mb-1">{stats.streak}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Featured Workout */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Up Next</h2>
          <button onClick={() => onChangeTab('workouts')} className="text-xs font-semibold text-[#00ffff] hover:text-[#00ffff]/80">View All</button>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22]">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00ffff]/10 to-transparent opacity-50" />
          
          <div className="relative p-6">
            {!todaysWorkout ? (
               <div className="flex h-24 items-center justify-center">
                 <p className="text-sm italic text-[#888888]">No upcoming workouts scheduled.</p>
               </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-1.5">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ffff]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Today's Session</span>
                  </div>
                  <h3 className="mb-1 text-2xl font-bold text-white">{todaysWorkout.name}</h3>
                  <p className="mb-4 text-sm text-[#888888]">{todaysWorkout.focus || 'Strength & Hypertrophy'}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#ccc]">
                      <Clock className="h-4 w-4" />
                      <span>{todaysWorkout.duration || '60m'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#ccc]">
                      <Dumbbell className="h-4 w-4" />
                      <span>{todaysWorkout.intensity || 'High'}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={isExpired ? handleLockedPress : () => onChangeTab('workouts')}
                  className={`mt-4 flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold transition-transform hover:scale-105 sm:mt-0 ${
                    isExpired ? 'bg-red-500 text-white' : 'bg-[#00ffff] text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                  }`}
                >
                  <span>{isExpired ? 'LOCKED' : 'START'}</span>
                  {isExpired ? <Lock className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Overlay if expired */}
          {isExpired && todaysWorkout && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <Lock className="h-12 w-12 text-white/80" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Nutrition Card */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nutrition</h2>
            <button onClick={() => onChangeTab('nutrition')} className="text-xs font-semibold text-[#00ffff] hover:text-[#00ffff]/80">Details</button>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
            <div className="flex items-center gap-6">
              {/* Circular Progress Placeholder */}
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white/[0.05]">
                <div className="absolute inset-0 rounded-full border-4 border-[#00ffff] border-l-transparent border-b-transparent transform rotate-45"></div>
                <div className="text-center">
                  <p className="text-lg font-bold leading-none text-white">{Math.round(nutrition?.total_calories || 0)}</p>
                  <p className="text-[9px] uppercase text-[#888888]">kcal</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <MacroBar label="Protein" current={nutrition?.total_proteins} target={nutrition?.protein_goal || 150} color="#00ffff" />
                <MacroBar label="Carbs" current={nutrition?.total_carbs} target={nutrition?.carb_goal || 250} color="#a3e635" />
                <MacroBar label="Fat" current={nutrition?.total_fats} target={nutrition?.fat_goal || 70} color="#c084fc" />
              </div>
            </div>
          </div>
        </div>

        {/* Body Stats Card */}
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => onChangeTab('progression')}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Body Stats</h2>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5 h-[130px] flex flex-col justify-between relative overflow-hidden">
             <div className="flex items-start justify-between relative z-10">
               <div>
                 <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#888888]">Current Weight</p>
                 <div className="flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-white">{currentWeight}</span>
                   <span className="text-sm font-semibold text-[#666]">kg</span>
                 </div>
               </div>
               {weightTrend !== 0 && (
                 <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${weightTrend > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   {weightTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                   <span className="text-xs font-bold">{Math.abs(weightTrend).toFixed(1)}%</span>
                 </div>
               )}
             </div>
             {/* Decorative chart line */}
             <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
               <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full stroke-[#00ffff] fill-transparent stroke-2">
                 <path d="M0,20 Q25,5 50,20 T100,10" />
               </svg>
             </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function MacroBar({ label, current = 0, target = 1, color }: { label: string, current?: number, target?: number, color: string }) {
  const percent = Math.min(100, Math.max(0, (current / target) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#888888]">{label}</span>
        <span className="font-bold text-white">{Math.round(current)}g <span className="font-normal text-[#555]">/ {target}g</span></span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#333]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
