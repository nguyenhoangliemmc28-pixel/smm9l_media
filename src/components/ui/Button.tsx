import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg' | 'icon';
interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean; }
const variantClasses: Record<Variant, string> = { primary:'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-glow hover:shadow-[0_0_40px_-5px_rgba(109,91,255,.55)] hover:brightness-110', secondary:'glass text-white hover:bg-white/5', outline:'border border-border-strong text-white hover:bg-white/5', ghost:'text-white/70 hover:text-white hover:bg-white/5', danger:'bg-danger text-white hover:brightness-110', success:'bg-success text-white hover:brightness-110', warning:'bg-warning text-black hover:brightness-110' };
const sizeClasses: Record<Size, string> = { sm:'h-9 px-3 text-sm gap-1.5', md:'h-11 px-5 text-sm gap-2', lg:'h-12 px-6 text-base gap-2', icon:'h-10 w-10' };
export const Button = forwardRef<HTMLButtonElement, IButtonProps>(function Button({ variant='primary', size='md', loading=false, leftIcon, rightIcon, fullWidth, className='', children, disabled, ...rest }, ref) {
  return <motion.button ref={ref} whileHover={{ scale: disabled || loading ? 1 : 1.02 }} whileTap={{ scale: disabled || loading ? 1 : 0.98 }} transition={{ duration: 0.2 }} disabled={disabled || loading} className={`inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`} {...rest}>
    {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /> : leftIcon}{children}{!loading && rightIcon}
  </motion.button>;
});
