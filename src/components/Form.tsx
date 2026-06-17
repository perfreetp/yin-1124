import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({ prefix, suffix, className = '', ...props }) => {
  return (
    <div className={`inline-flex items-center bg-white border border-[var(--color-border)] rounded transition-colors focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary-border)] ${className}`}>
      {prefix && <span className="px-2 text-[var(--color-text-muted)]">{prefix}</span>}
      <input
        className="flex-1 px-3 py-2 bg-transparent outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        {...props}
      />
      {suffix && <span className="px-2 text-[var(--color-text-muted)]">{suffix}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

export const Select: React.FC<SelectProps> = ({ options, className = '', ...props }) => {
  return (
    <select
      className={`px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)] cursor-pointer ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea: React.FC<TextAreaProps> = ({ className = '', ...props }) => {
  return (
    <textarea
      className={`w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)] resize-none ${className}`}
      {...props}
    />
  )
}
