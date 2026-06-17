import React from 'react'
import { useWorkbenchStore } from '@/store/workbench'
import {
  Upload,
  Clock,
  ShieldAlert,
  ClipboardList,
  FileCheck,
  LayoutDashboard,
  FileText,
} from 'lucide-react'

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  badge?: string | number
}

const navItems: NavItem[] = [
  { key: 'batch-import', label: '批量导入', icon: <Upload size={18} /> },
  { key: 'due-queue', label: '到期队列', icon: <Clock size={18} />, badge: 12 },
  { key: 'risk-profile', label: '风险画像', icon: <ShieldAlert size={18} />, badge: 3 },
  { key: 'follow-panel', label: '跟单面板', icon: <ClipboardList size={18} /> },
  { key: 'disposal-records', label: '处置记录', icon: <FileCheck size={18} /> },
  { key: 'management-board', label: '管理看板', icon: <LayoutDashboard size={18} /> },
]

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule } = useWorkbenchStore()

  return (
    <aside className="w-52 shrink-0 bg-[#0f172a] flex flex-col h-full">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">票据运营工作台</div>
            <div className="text-white/50 text-[11px]">保理业务管理系统</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeModule === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-danger)] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-white text-sm font-medium">
            运
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm truncate">运营岗-张明远</div>
            <div className="text-white/50 text-[11px]">运营一部</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
