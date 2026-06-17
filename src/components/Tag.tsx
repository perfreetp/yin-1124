import React from 'react'

interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

export const Tag: React.FC<TagProps> = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
    primary: 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border-[var(--color-primary-border)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
  }
  
  const sizeStyles: Record<string, string> = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  }
  
  return (
    <span className={`inline-flex items-center rounded border font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  )
}

import type { BillStatus, RiskLevel, AcceptancePerformance } from '@/types'
import { getStatusLabel, getRiskLabel, getPerformanceLabel } from '@/store/workbench'

export const StatusTag: React.FC<{ status: BillStatus }> = ({ status }) => {
  const map: Record<BillStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    holding: 'default',
    endorsed: 'info',
    pending_payment: 'warning',
    paid: 'success',
    dishonored: 'danger',
    recourse: 'danger',
    closed: 'default',
  }
  return <Tag variant={map[status]}>{getStatusLabel(status)}</Tag>
}

export const RiskTag: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const map: Record<RiskLevel, 'default' | 'success' | 'warning' | 'danger'> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  return <Tag variant={map[level]}>{getRiskLabel(level)}</Tag>
}

export const PerformanceTag: React.FC<{ level: AcceptancePerformance }> = ({ level }) => {
  const map: Record<AcceptancePerformance, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    excellent: 'success',
    good: 'success',
    normal: 'default',
    warning: 'warning',
    poor: 'danger',
  }
  return <Tag variant={map[level]}>{getPerformanceLabel(level)}</Tag>
}
