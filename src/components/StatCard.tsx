import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  trend?: number
  icon?: LucideIcon
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  subValue?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  iconColor = 'primary',
  subValue,
  className = '',
}) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'var(--color-primary-bg)', text: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-bg)', text: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' },
    danger: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
    info: { bg: 'var(--color-info-bg)', text: 'var(--color-info)' },
  }
  
  const colors = colorMap[iconColor]
  
  return (
    <div className={`bg-white rounded-md border border-[var(--color-border)] p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[var(--color-text-tertiary)] mb-1">{title}</div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)]">{value}</div>
          {(trend !== undefined || subValue) && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              {trend !== undefined && (
                <span className={trend >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
              )}
              {subValue && <span className="text-[var(--color-text-muted)]">{subValue}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: colors.bg }}
          >
            <Icon size={20} style={{ color: colors.text }} />
          </div>
        )}
      </div>
    </div>
  )
}
