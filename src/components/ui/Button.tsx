import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
>;

interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-white',
  secondary: 'bg-surface border border-border text-gray-200 hover:border-gray-500',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
  ghost: 'bg-transparent text-gray-400 hover:text-gray-200',
  danger: 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25',
};

/** Shared button primitive — consistent sizing/typography + a subtle press
 * animation everywhere, instead of one-off `<button className="...">`s. */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  icon,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      whileHover={isDisabled ? undefined : { scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={isDisabled}
      className={`${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${fullWidth ? 'w-full' : ''} rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none`}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
}
