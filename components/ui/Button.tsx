import * as React from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-brand-blue text-white shadow-sm hover:from-primary-700 hover:to-primary-700 hover:shadow-md active:scale-[0.98] disabled:from-primary-300 disabled:to-primary-300 disabled:shadow-none',
  secondary:
    'bg-secondary-900 text-white shadow-sm hover:bg-secondary-800 hover:shadow-md active:scale-[0.98] disabled:bg-secondary-400',
  outline:
    'border border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900 active:scale-[0.98] disabled:opacity-50',
  ghost:
    'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 active:scale-[0.98] disabled:opacity-50',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:bg-red-300',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:bg-emerald-300',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-sm font-semibold gap-2.5 rounded-xl',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export default Button
