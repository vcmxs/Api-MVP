"use client";

import React, { useState } from "react";
import { 
  LayoutDashboard, Users, BookOpen, DollarSign, Settings, 
  Bell, Search, TrendingUp, TrendingDown, MoreVertical, 
  Download, ArrowUpRight, GraduationCap, Clock
} from "lucide-react";

export default function AdminDashboardMockup() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  const chartDataMap = {
    week: { data: [40, 65, 45, 80, 55, 90, 70], labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], total: "$24,590.00", multiplier: 120 },
    month: { data: [30, 50, 40, 60, 45, 75, 55, 85, 70, 95], labels: ["1-3", "4-6", "7-9", "10-12", "13-15", "16-18", "19-21", "22-24", "25-27", "28-30"], total: "$98,450.00", multiplier: 300 },
    year: { data: [45, 60, 50, 80, 70, 95, 85, 65, 90, 75, 100, 85], labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"], total: "$845,200.00", multiplier: 1500 },
  };

  // Mock Data
  const stats = [
    { title: "Ingresos Totales", value: chartDataMap[timeRange].total, change: "+12.5%", positive: true, icon: <DollarSign className="w-6 h-6 text-emerald-600" />, bg: "bg-emerald-100" },
    { title: "Nuevos Estudiantes", value: "1,249", change: "+8.2%", positive: true, icon: <Users className="w-6 h-6 text-blue-600" />, bg: "bg-blue-100" },
    { title: "Certificados Emitidos", value: "854", change: "+15.3%", positive: true, icon: <GraduationCap className="w-6 h-6 text-purple-600" />, bg: "bg-purple-100" },
    { title: "Tasa de Abandono", value: "4.2%", change: "-1.1%", positive: true, icon: <TrendingDown className="w-6 h-6 text-red-600" />, bg: "bg-red-100" },
  ];

  const recentStudents = [
    { id: 1, name: "Carlos Sánchez", email: "carlos.s@example.com", course: "Biomecánica del Squat", date: "Hoy, 10:24 AM", status: "Completado", amount: "$99.00" },
    { id: 2, name: "Laura Gómez", email: "laura.g@example.com", course: "Pase Anual Premium", date: "Hoy, 09:15 AM", status: "Activo", amount: "$299.00" },
    { id: 3, name: "Miguel Herrera", email: "miguel.h@example.com", course: "Nutrición Deportiva", date: "Ayer, 18:45 PM", status: "En progreso", amount: "$149.00" },
    { id: 4, name: "Ana Silva", email: "ana.s@example.com", course: "Especialización en Glúteos", date: "Ayer, 14:20 PM", status: "En progreso", amount: "$119.00" },
    { id: 5, name: "Roberto Díaz", email: "roberto.d@example.com", course: "Master en Programación", date: "13 Jun 2026", status: "Completado", amount: "$299.00" },
  ];

  const topCourses = [
    { name: "Biomecánica del Squat", students: 450, revenue: "$44,550", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop" },
    { name: "Master en Programación", students: 320, revenue: "$95,680", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop" },
    { name: "Pase Anual Premium", students: 280, revenue: "$83,720", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completado": return "bg-emerald-100 text-emerald-800";
      case "Activo": return "bg-blue-100 text-blue-800";
      case "En progreso": return "bg-amber-100 text-amber-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <img src="/icon.png" alt="Dupla Logo" className="w-8 h-8 object-contain" />
          <span className="font-extrabold text-slate-900 text-xl tracking-tight">Dupla Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
            { id: "students", icon: <Users className="w-5 h-5" />, label: "Estudiantes" },
            { id: "courses", icon: <BookOpen className="w-5 h-5" />, label: "Cursos" },
            { id: "finances", icon: <DollarSign className="w-5 h-5" />, label: "Finanzas" },
            { id: "settings", icon: <Settings className="w-5 h-5" />, label: "Configuración" },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.icon}
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="Admin" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Admin Principal</p>
              <p className="text-xs text-slate-500">admin@dupla.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-slate-900 capitalize">Resumen General</h1>
          <div className="flex items-center space-x-6">
            <div className="relative hidden lg:block">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar estudiantes, transacciones..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-80 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8 pb-20">
          
          {/* ACTION BAR */}
          <div className="flex justify-between items-center">
            <p className="text-slate-600">Bienvenido de vuelta, aquí está el rendimiento de tu academia hoy.</p>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 shadow-sm flex items-center">
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </button>
              <button className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 shadow-md">
                + Crear Curso
              </button>
            </div>
          </div>

          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    {stat.icon}
                  </div>
                  <span className={`flex items-center text-sm font-bold ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stat.positive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
                <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* REVENUE CHART MOCKUP */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Ingresos ({timeRange === "week" ? "Últimos 7 días" : timeRange === "month" ? "Este mes" : "Este año"})</h3>
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "year")}
                  className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="year">Este año</option>
                </select>
              </div>
              
              {/* Dynamic Line Chart */}
              <div className="h-64 flex flex-col justify-end mt-4">
                <div className="flex-1 relative w-full h-full border-b border-slate-100 pb-2">
                  <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <polygon 
                      points={`0,300 ${chartDataMap[timeRange].data.map((val, i) => `${i * (1000 / (chartDataMap[timeRange].data.length - 1))},${300 - (val * 2.8)}`).join(" ")} 1000,300`} 
                      fill="url(#colorGradient)" 
                      className="transition-all duration-700 ease-in-out" 
                    />
                    <polyline 
                      points={chartDataMap[timeRange].data.map((val, i) => `${i * (1000 / (chartDataMap[timeRange].data.length - 1))},${300 - (val * 2.8)}`).join(" ")} 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="transition-all duration-700 ease-in-out drop-shadow-sm" 
                    />
                  </svg>
                  
                  {/* HTML Overlay for Tooltips and Dots */}
                  <div className="absolute inset-0 pb-2">
                    {chartDataMap[timeRange].data.map((val, i) => {
                      const leftPercent = (i / (chartDataMap[timeRange].data.length - 1)) * 100;
                      const bottomPercent = (val * 2.8 / 300) * 100;
                      return (
                        <div 
                          key={i} 
                          className="absolute w-3 h-3 -ml-1.5 -mb-1.5 rounded-full border-2 border-emerald-500 bg-white shadow-sm cursor-pointer hover:scale-[1.5] transition-transform group z-10"
                          style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20">
                            ${(val * chartDataMap[timeRange].multiplier).toLocaleString('en-US')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* X Axis Labels */}
                <div className="flex justify-between pt-3 relative px-1">
                  {chartDataMap[timeRange].labels.map((label, i) => (
                    <div key={i} className="text-center w-0 flex justify-center">
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TOP COURSES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Cursos Top</h3>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold">Ver todos</button>
              </div>
              <div className="space-y-5">
                {topCourses.map((course, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <img src={course.image} alt={course.name} className="w-16 h-12 object-cover rounded-lg shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{course.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{course.students} estudiantes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{course.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between border border-emerald-100">
                  <div>
                    <p className="text-emerald-800 font-bold text-sm">Crecimiento MRR</p>
                    <p className="text-emerald-600 text-xs mt-0.5">Estás en buen camino</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 text-white">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT TRANSACTIONS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-slate-900">Transacciones Recientes</h3>
              <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Estudiante</th>
                    <th className="p-4 font-semibold">Curso / Producto</th>
                    <th className="p-4 font-semibold">Fecha</th>
                    <th className="p-4 font-semibold">Monto</th>
                    <th className="p-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition cursor-pointer">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700 font-medium">{student.course}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="w-3.5 h-3.5 mr-1.5" /> {student.date}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-slate-900">{student.amount}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Ver todas las transacciones
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
