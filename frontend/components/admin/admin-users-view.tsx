"use client"

import { useState, useEffect } from "react"
import { apiFetch, API_URL } from "@/lib/api"
import { Loader2, Search, Eye, Lock, Unlock, Trash2, ShieldAlert, ArrowLeft, Crown } from "lucide-react"
import { format } from "date-fns"

interface ApiUser {
  id: number
  name: string
  email: string
  role: string
  status: string
  subscriptionTier?: string
  createdAt: string
}

interface UserDetails extends ApiUser {
  age?: number
  sex?: string
  phone?: string
  gym?: string
  profile_pic_url?: string
  notes?: string
  subscriptionStartDate?: string
  traineeCount?: number
  trainees?: { id: number; name: string; email: string }[]
  assignedCoach?: { name: string; email: string }
}

const planColors: Record<string, { bg: string; color: string }> = {
  starter: { bg: "rgba(136,136,136,0.15)", color: "#888888" },
  bronze: { bg: "rgba(205,127,50,0.15)", color: "#cd7f32" },
  silver: { bg: "rgba(192,192,192,0.15)", color: "#c0c0c0" },
  gold: { bg: "rgba(255,215,0,0.15)", color: "#ffd700" },
  olympian: { bg: "rgba(133,169,247,0.15)", color: "#85a9f7" },
}

export function AdminUsersView() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Detail View State
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  // Edit Plan State
  const [editingPlan, setEditingPlan] = useState(false)
  const [newPlan, setNewPlan] = useState("starter")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<{ users: ApiUser[] }>("/admin/users")
      setUsers(data.users || [])
    } catch (err) {
      console.error("Failed to fetch users", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleViewDetails = async (userId: number) => {
    setSelectedUser(userId)
    setDetailsLoading(true)
    setEditingPlan(false)
    try {
      const data = await apiFetch<{ user: UserDetails }>(`/admin/users/${userId}/details`)
      setDetails(data.user)
      setNewPlan(data.user.subscriptionTier?.toLowerCase() || "starter")
    } catch (err: any) {
      alert(err.message || "Failed to load user details")
      setSelectedUser(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleBlockToggle = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "blocked" ? "active" : "blocked"
    const action = currentStatus === "blocked" ? "Unblock" : "Block"
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return

    setActionLoading(true)
    try {
      await apiFetch(`/admin/users/${userId}/block`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchUsers()
      if (selectedUser === userId && details) {
        setDetails({ ...details, status: newStatus })
      }
    } catch (err: any) {
      alert(err.message || `Failed to ${action.toLowerCase()} user`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("WARNING: Are you sure you want to completely DELETE this user? This cannot be undone!")) return

    setActionLoading(true)
    try {
      await apiFetch(`/admin/users/${userId}`, { method: "DELETE" })
      await fetchUsers()
      if (selectedUser === userId) {
        setSelectedUser(null)
        setDetails(null)
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete user")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdatePlan = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await apiFetch(`/admin/users/${selectedUser}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newPlan, status: "active" }),
      })
      alert("Subscription updated successfully!")
      setEditingPlan(false)
      handleViewDetails(selectedUser) // Refresh details
      fetchUsers() // Refresh main list
    } catch (err: any) {
      alert(err.message || "Failed to update plan")
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  // --- DETAIL VIEW ---
  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setSelectedUser(null); setDetails(null) }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">User Details</h2>
            <p className="text-sm text-[#888888]">Manage account information and subscriptions</p>
          </div>
        </div>

        {detailsLoading || !details ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22]">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Profile Card */}
            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#0a0a0f] bg-[#00ff88]/10 text-3xl font-bold text-[#00ff88]">
                  {details.profile_pic_url ? (
                    <img src={`${API_URL.replace("/api/v1", "")}${details.profile_pic_url}`} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    details.name.charAt(0).toUpperCase()
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">{details.name}</h3>
                <p className="text-sm text-[#888888]">{details.email}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-[#00ffff]/10 px-3 py-1 text-xs font-bold uppercase text-[#00ffff]">
                    {details.role}
                  </span>
                  <span className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase",
                    details.status === "active" ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff4444]/10 text-[#ff4444]"
                  )}>
                    {details.status}
                  </span>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-[#ff4444]/20 bg-[#ff4444]/5 p-6">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-[#ff4444]">
                  <ShieldAlert className="h-5 w-5" /> Danger Zone
                </h4>
                <div className="space-y-3">
                  <button
                    onClick={() => handleBlockToggle(details.id, details.status)}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff4444]/30 bg-transparent px-4 py-2 text-sm font-bold text-[#ff4444] transition-colors hover:bg-[#ff4444]/10 disabled:opacity-50"
                  >
                    {details.status === "blocked" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {details.status === "blocked" ? "Unblock User" : "Block User"}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(details.id)}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff4444] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-[#ff4444]/90 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Details & Plan */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
                <h4 className="mb-4 text-lg font-bold text-white">Personal Information</h4>
                <div className="grid gap-y-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">Age</p>
                    <p className="font-medium text-white">{details.age || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">Sex</p>
                    <p className="font-medium text-white capitalize">{details.sex || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">Phone</p>
                    <p className="font-medium text-white">{details.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">Gym</p>
                    <p className="font-medium text-white">{details.gym || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">Joined</p>
                    <p className="font-medium text-white">{format(new Date(details.createdAt), "MMM d, yyyy")}</p>
                  </div>
                </div>
                {details.notes && (
                  <div className="mt-4 rounded-xl bg-[#0a0a0f] p-4">
                    <p className="text-xs font-medium text-[#555555] uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-white">{details.notes}</p>
                  </div>
                )}
              </div>

              {/* Coach Specific: Subscription & Trainees */}
              {details.role.toLowerCase() === "coach" && (
                <>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Crown className="h-5 w-5 text-[#ffd700]" /> Subscription
                      </h4>
                      {!editingPlan ? (
                        <button
                          onClick={() => setEditingPlan(true)}
                          className="text-sm font-medium text-[#00ffff] hover:underline"
                        >
                          Edit Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingPlan(false)}
                          className="text-sm font-medium text-[#888888] hover:text-white"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {editingPlan ? (
                        <div className="flex w-full items-center gap-3">
                          <select
                            value={newPlan}
                            onChange={(e) => setNewPlan(e.target.value)}
                            className="flex-1 rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2 text-white focus:border-[#00ffff]/50 focus:outline-none"
                          >
                            <option value="starter">STARTER</option>
                            <option value="bronze">BRONZE</option>
                            <option value="silver">SILVER</option>
                            <option value="gold">GOLD</option>
                            <option value="olympian">OLYMPIAN</option>
                          </select>
                          <button
                            onClick={handleUpdatePlan}
                            disabled={actionLoading}
                            className="rounded-xl bg-[#00ff88] px-4 py-2 font-bold text-black transition-colors hover:bg-[#00e57a] disabled:opacity-50"
                          >
                            {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-xl bg-[#0a0a0f] px-4 py-3">
                          <span
                            className="rounded px-2 py-1 text-sm font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: planColors[details.subscriptionTier?.toLowerCase() || "starter"]?.bg,
                              color: planColors[details.subscriptionTier?.toLowerCase() || "starter"]?.color,
                            }}
                          >
                            {details.subscriptionTier || "Starter"}
                          </span>
                          <span className="text-sm text-[#888888]">
                            Activated: {details.subscriptionStartDate ? format(new Date(details.subscriptionStartDate), "MMM d, yyyy") : "N/A"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
                    <h4 className="mb-4 text-lg font-bold text-white">Assigned Trainees ({details.traineeCount || 0})</h4>
                    <div className="space-y-2">
                      {details.trainees && details.trainees.length > 0 ? (
                        details.trainees.map(tr => (
                          <div key={tr.id} className="flex items-center justify-between rounded-xl bg-[#0a0a0f] px-4 py-3">
                            <span className="font-medium text-white">{tr.name}</span>
                            <span className="text-sm text-[#888888]">{tr.email}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-[#555555] py-4">No trainees assigned</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Trainee Specific: Coach */}
              {details.role.toLowerCase() === "trainee" && details.assignedCoach && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
                  <h4 className="mb-4 text-lg font-bold text-white">Assigned Coach</h4>
                  <div className="flex items-center justify-between rounded-xl bg-[#0a0a0f] px-4 py-3">
                    <span className="font-medium text-white">{details.assignedCoach.name}</span>
                    <span className="text-sm text-[#888888]">{details.assignedCoach.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">All Users ({users.length})</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-2 pl-9 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0a0a0f]">
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">ID</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">User</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Plan</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Created</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#555555]">
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[#555555]">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-[#888888]">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-white/5 px-2 py-1 text-xs font-bold uppercase text-[#aaa]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full", user.status === "active" ? "bg-[#00ff88]" : "bg-[#ff4444]")} />
                        <span className="text-sm capitalize text-[#aaa]">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role.toLowerCase() === "coach" ? (
                        <span
                          className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: planColors[user.subscriptionTier?.toLowerCase() || "starter"]?.bg,
                            color: planColors[user.subscriptionTier?.toLowerCase() || "starter"]?.color,
                          }}
                        >
                          {user.subscriptionTier || "Starter"}
                        </span>
                      ) : (
                        <span className="text-[#555555]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#888888]">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(user.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffff]/10 text-[#00ffff] transition-colors hover:bg-[#00ffff]/20"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleBlockToggle(user.id, user.status)}
                          disabled={actionLoading}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                          title={user.status === "blocked" ? "Unblock" : "Block"}
                        >
                          {user.status === "blocked" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionLoading}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4444]/10 text-[#ff4444] transition-colors hover:bg-[#ff4444]/20 disabled:opacity-50"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
