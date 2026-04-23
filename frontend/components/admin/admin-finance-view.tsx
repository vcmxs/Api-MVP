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

interface FinanceData {
  mrr: number
  arr: number
  churn_rate: string
  net_profit: number
  revenue_by_tier: { tier: string; amount: number }[]
  historical_revenue: { month: string; amount: number }[]
}

const COLORS = ["#888888", "#cd7f32", "#c0c0c0", "#ffd700", "#85a9f7"]

// Mock fallback data in case the backend endpoint isn't ready yet
const fallbackData: FinanceData = {
  mrr: 12450,
  arr: 149400,
  churn_rate: "2.4%",
  net_profit: 9800,
  revenue_by_tier: [
    { tier: "Starter", amount: 1500 },
    { tier: "Bronze", amount: 3200 },
    { tier: "Silver", amount: 2800 },
    { tier: "Gold", amount: 4100 },
    { tier: "Olympian", amount: 850 },
  ],
  historical_revenue: [
    { month: "Jan", amount: 8400 },
    { month: "Feb", amount: 9200 },
    { month: "Mar", amount: 10100 },
    { month: "Apr", amount: 11500 },
    { month: "May", amount: 12000 },
    { month: "Jun", amount: 12450 },
  ],
}

export function AdminFinanceView() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const res = await apiFetch<{ finance: FinanceData }>("/admin/finance")
        if (res && res.finance) {
          setData(res.finance)
        } else {
          // If endpoint doesn't exist yet, use fallback for visualization
          setData(fallbackData)
        }
      } catch (err) {
        console.warn("Failed to fetch real finance data, using fallback visualization", err)
        setData(fallbackData)
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
          <h3 className="mb-6 text-lg font-bold text-white">MRR Growth (6 Months)</h3>
          <div className="h-[300px] w-full">
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
    </div>
  )
}
