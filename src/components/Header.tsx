import React from 'react'
import { Bell, Search, Settings, HelpCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Form'
import dayjs from 'dayjs'

export const Header: React.FC = () => {
  return (
    <header className="h-12 shrink-0 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          票据运营工作台
        </h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          {dayjs().format('YYYY年MM月DD日 dddd')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索票据号、承兑人..."
          prefix={<Search size={14} />}
          className="w-72"
        />
        <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />}>
          刷新
        </Button>
        <Button variant="ghost" size="sm" icon={<HelpCircle size={16} />} />
        <Button variant="ghost" size="sm" icon={<Bell size={16} />}>
          <span className="relative">
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger)] text-white text-[10px] flex items-center justify-center">
              8
            </span>
          </span>
        </Button>
        <Button variant="ghost" size="sm" icon={<Settings size={16} />} />
      </div>
    </header>
  )
}
