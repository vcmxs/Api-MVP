"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Loader2, Search, Activity, ShieldAlert, UserCog, DollarSign, Database } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface AuditLog {
  id: number
  adminName: string
  adminEmail: string
  actionType: "security" | "user_management" | "financial" | "system"
  actionName: string
  details: string
  ipAddress?: string
  createdAt: string
}

export function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const fetchLogs = async () => {
    try {
      // Endpoint for fetching audit logs (may not exist yet, will fallback)
      const res = await apiFetch<{ logs: AuditLog[] }>("/admin/audit-logs")
      if (res && res.logs) {
        setLogs(res.logs)
      } else {
        throw new Error("No data returned")
      }
    } catch (err) {
      console.warn("Using mock data for audit logs as endpoint isn't ready.")
      setLogs([
        { id: 104, adminName: "Super Admin", adminEmail: "admin@gymtrainer.com", actionType: "financial", actionName: "Payout Issued", details: "Marked $45.00 commission as PAID for Coach Mike (ID 101)", ipAddress: "192.168.1.1", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 103, adminName: "Super Admin", adminEmail: "admin@gymtrainer.com", actionType: "security", actionName: "User Blocked", details: "Blocked access for John Doe (ID 45) due to TOS violation", ipAddress: "192.168.1.1", createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 102, adminName: "Super Admin", adminEmail: "admin@gymtrainer.com", actionType: "user_management", actionName: "Subscription Override", details: "Upgraded Coach Sarah (ID 105) from Starter to Olympian", ipAddress: "192.168.1.1", createdAt: new Date(Date.now() - 1000 * 3600 * 3).toISOString() },
        { id: 101, adminName: "System", adminEmail: "system@dupla.com", actionType: "system", actionName: "Database Migration", details: "Applied migration 005_add_payments_ledger successfully", ipAddress: "127.0.0.1", createdAt: new Date(Date.now() - 1000 * 3600 * 24).toISOString() },
        { id: 100, adminName: "Super Admin", adminEmail: "admin@gymtrainer.com", actionType: "security", actionName: "Admin Login", details: "Successful login via Web Panel", ipAddress: "192.168.1.1", createdAt: new Date(Date.now() - 1000 * 3600 * 25).toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const getIconForType = (type: string) => {
    switch (type) {
      case "security": return <ShieldAlert className="h-4 w-4 text-[#ff4444]" />
      case "user_management": return <UserCog className="h-4 w-4 text-[#00ffff]" />
      case "financial": return <DollarSign className="h-4 w-4 text-[#ffd700]" />
      case "system": return <Database className="h-4 w-4 text-[#a78bfa]" />
      default: return <Activity className="h-4 w-4 text-[#888888]" />
    }
  }

  const getColorForType = (type: string) => {
    switch (type) {
      case "security": return "bg-[#ff4444]/10 text-[#ff4444]"
      case "user_management": return "bg-[#00ffff]/10 text-[#00ffff]"
      case "financial": return "bg-[#ffd700]/10 text-[#ffd700]"
      case "system": return "bg-[#a78bfa]/10 text-[#a78bfa]"
      default: return "bg-white/10 text-[#888888]"
    }
  }

  const filteredLogs = logs.filter(
    (log) =>
      (filterType === "all" || log.actionType === filterType) &&
      (log.adminName.toLowerCase().includes(search.toLowerCase()) ||
       log.actionName.toLowerCase().includes(search.toLowerCase()) ||
       log.details.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Audit Logs</h2>
          <p className="text-sm text-[#888888]">Track all administrative and critical system actions</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-colors", filterType === "all" ? "bg-white text-black" : "bg-[#161b22] text-[#888888] hover:text-white")}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilterType("security")}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2", filterType === "security" ? "bg-[#ff4444] text-black" : "bg-[#161b22] text-[#888888] hover:text-[#ff4444]")}
          >
            <ShieldAlert className="h-4 w-4" /> Security
          </button>
          <button
            onClick={() => setFilterType("user_management")}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2", filterType === "user_management" ? "bg-[#00ffff] text-black" : "bg-[#161b22] text-[#888888] hover:text-[#00ffff]")}
          >
            <UserCog className="h-4 w-4" /> Management
          </button>
          <button
            onClick={() => setFilterType("financial")}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2", filterType === "financial" ? "bg-[#ffd700] text-black" : "bg-[#161b22] text-[#888888] hover:text-[#ffd700]")}
          >
            <DollarSign className="h-4 w-4" /> Financial
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search logs..."
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
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Timestamp</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Admin</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Action</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Details</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#555555]">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{log.adminName}</div>
                      <div className="text-xs text-[#555555]">{log.adminEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", getColorForType(log.actionType))}>
                          {getIconForType(log.actionType)}
                        </div>
                        <span className="font-bold text-white">{log.actionName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#aaaaaa]">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-[#555555]">
                      {log.ipAddress || "—"}
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
