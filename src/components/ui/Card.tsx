import type { HTMLAttributes, ReactNode } from 'react';

interface ICardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

export function Card({ children, hover, gradient, glow, className = '', ...rest }: ICardProps) {
  return (
    <div
      className={`relative rounded-card ${gradient ? 'gradient-border' : 'glass'} ${glow ? 'shadow-glow' : 'shadow-card'} ${hover ? 'hover:border-border-strong cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pb-0 ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold tracking-tight ${className}`} {...props} />;
}
