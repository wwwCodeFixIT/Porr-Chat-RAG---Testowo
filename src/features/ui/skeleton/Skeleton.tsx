import './Skeleton.css';

type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'block' | 'circle';
};

export function Skeleton({ className = '', variant = 'block' }: SkeletonProps) {
  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`}
      aria-hidden="true"
    />
  );
}