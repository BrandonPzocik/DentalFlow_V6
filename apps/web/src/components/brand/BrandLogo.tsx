import { cn } from '@/lib/utils';
import { BRAND, LOGO_PATH } from '@/lib/documentBrand';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const IMG_HEIGHT = { sm: 'h-8', md: 'h-10', lg: 'h-12' } as const;

export function BrandLogo({
  className,
  imgClassName,
  showText = true,
  variant = 'light',
  size = 'md',
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <img
        src={LOGO_PATH}
        alt={BRAND.name}
        className={cn('w-auto object-contain shrink-0', IMG_HEIGHT[size], imgClassName)}
      />
      {showText && (
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold leading-tight truncate',
              size === 'lg' ? 'text-lg' : 'text-base',
              variant === 'light' ? 'text-white' : 'text-slate-800',
            )}
          >
            {BRAND.name}
          </p>
          <p
            className={cn(
              'text-sm truncate',
              variant === 'light' ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {BRAND.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
