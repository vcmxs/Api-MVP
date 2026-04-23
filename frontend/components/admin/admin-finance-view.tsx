"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Loader2, DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react"
import { KPICard } from "@/components/dashboard/kpi-card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface RecentPayment {
  id: number
  coachId: number
  coachName: string
  coachEmail: string
  amount: number
  tier: string
  status: string
  createdAt: string
}

interface FinanceData {
  mrr: number
  arr: number
  churn_rate: string
  net_profit: number
  revenue_by_tier: { tier: string; amount: number }[]
  historical_revenue: { month: string; amount: number }[]
  recent_payments: RecentPayment[]
  month_total: number
}

const COLORS = ["#888888", "#cd7f32", "#c0c0c0", "#ffd700", "#85a9f7"]

const emptyData: FinanceData = {
  mrr: 0,
  arr: 0,
  churn_rate: "0.0%",
  net_profit: 0,
  revenue_by_tier: [],
  historical_revenue: [],
  recent_payments: [],
  month_total: 0,
}

export function AdminFinanceView() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const res = await apiFetch<{ finance: FinanceData }>("/admin/finance")
        if (res?.finance) {
          setData(res.finance)
          setIsLive(true)
        } else {
          setData(emptyData)
        }
      } catch (err) {
        console.warn("Failed to fetch finance data from API:", err)
        setData(emptyData)
      } finally {
        setLoading(false)
      }
    }
    fetchFinanceData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Financials & Growth</h2>
          <p className="text-sm text-[#888888]">Track Monthly Recurring Revenue (MRR) and subscriptions</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${isLive ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff4444]/10 text-[#ff4444]"}`}>
          {isLive ? "● Live Data" : "● API Offline"}
        </span>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="MRR"
          value={`$${data.mrr.toLocaleString()}`}
          change={{ value: "+8.2%", trend: "up" }}
          accentColor="#00ff88"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <KPICard
          title="ARR (Projected)"
          value={`$${data.arr.toLocaleString()}`}
          change={{ value: "+12.5%", trend: "up" }}
          accentColor="#00ffff"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <KPICard
          title="Churn Rate"
          value={data.churn_rate}
          change={{ value: "-0.5%", trend: "up" }}
          accentColor="#ff4444"
          icon={<Users className="h-6 w-6" />}
        />
        <KPICard
          title="Net Profit (30d)"
          value={`$${data.net_profit.toLocaleString()}`}
          change={{ value: "+4.1%", trend: "up" }}
          accentColor="#ffd700"
          icon={<DollarSign className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MRR Growth Chart */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 lg:col-span-2">
          <h3 className="mb-6 text-lg font-bold text-white">MRR Growth (Payment History)</h3>
          <div className="h-[300px] w-full">
            {data.historical_revenue.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-4xl">📊</p>
                <p className="font-bold text-white">No payment history yet</p>
                <p className="text-sm text-[#888888]">Chart will populate as coach subscriptions are activated</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.historical_revenue} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#161b22", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ color: "#00ff88" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#00ff88"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#00ff88", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#00ffff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by Tier */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 lg:col-span-1">
          <h3 className="mb-6 text-lg font-bold text-white">Revenue by Tier</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.revenue_by_tier}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="tier"
                  stroke="none"
                >
                  {data.revenue_by_tier.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#161b22", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => `$${value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {data.revenue_by_tier.map((entry, index) => (
              <div key={entry.tier} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[#888888]">{entry.tier}</span>
                </div>
                <span className="font-bold text-white">${entry.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* This Month's Payment Ledger */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-lg font-bold text-white">This Month's Payments</h3>
            <p className="text-sm text-[#888888]">
              {data.recent_payments.length} payment{data.recent_payments.length !== 1 ? "s" : ""} recorded this month
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888888] uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-bold text-[#00ff88]">
              ${data.month_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#0a0a0f]">
                <th className="px-6 py-3 text-xs font-bold text-[#888888] uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-bold text-[#888888] uppercase tracking-wider">Coach</th>
                <th className="px-6 py-3 text-xs font-bold text-[#888888] uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-xs font-bold text-[#888888] uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {data.recent_payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[#555555]">
                    No payments recorded this month yet. Activate a coach subscription to start tracking.
                  </td>
                </tr>
              ) : (
                data.recent_payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{p.coachName}</div>
                      <div className="text-xs text-[#555555]">{p.coachEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold uppercase text-[#aaa]">
                        {p.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#00ff88]">
                      ${p.amount.toFixed(2)}
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
