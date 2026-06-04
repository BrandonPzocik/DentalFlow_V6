import { cn } from '@/lib/utils';
import { BRAND, LOGO_PATH } from '@/lib/documentBrand';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  /** dark = sidebar/fondo oscuro; light = fondos claros */
  surface?: 'dark' | 'light';
  size?: 'sidebar' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
  sidebar: 'h-12 w-full max-w-[210px]',
  md: 'h-12 w-auto max-w-[200px]',
  lg: 'h-16 w-auto max-w-[280px]',
  xl: 'h-20 w-auto max-w-[320px]',
} as const;

export function BrandLogo({
  className,
  imgClassName,
  showText = true,
  surface = 'dark',
  size = 'md',
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <img
        src={LOGO_PATH}
        alt={BRAND.name}
        className={cn(
          'object-contain object-left shrink-0',
          SIZE_CLASSES[size],
          imgClassName,
        )}
      />
      {showText && (
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold leading-tight truncate',
              size === 'lg' || size === 'xl' ? 'text-lg' : 'text-base',
              surface === 'dark' ? 'text-white' : 'text-slate-800',
            )}
          >
            {BRAND.name}
          </p>
          <p
            className={cn(
              'text-sm truncate',
              surface === 'dark' ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {BRAND.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
