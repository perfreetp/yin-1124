import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: React.ReactNode
  extra?: React.ReactNode
  className?: string
  bodyClassName?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  extra,
  className = '',
  bodyClassName = '',
  padding = 'md',
}) => {
  const paddingStyles: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }
  
  return (
    <div className={`bg-white rounded-md border border-[var(--color-border)] shadow-sm ${className}`}>
      {(title || extra) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          {title && (
            <div className="font-semibold text-[var(--color-text-primary)] text-[15px]">{title}</div>
          )}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className={`${paddingStyles[padding]} ${bodyClassName}`}>{children}</div>
    </div>
  )
}
