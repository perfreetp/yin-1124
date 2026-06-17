import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles: Record<string, string> = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[#1e3a8a] active:bg-[#1e3a8a]',
    secondary: 'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]',
    danger: 'bg-[var(--color-danger)] text-white hover:bg-[#991b1b] active:bg-[#991b1b]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]',
    outline: 'bg-transparent text-[var(--color-primary)] border border-[var(--color-primary-border)] hover:bg-[var(--color-primary-bg)]',
  }
  
  const sizeStyles: Record<string, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
