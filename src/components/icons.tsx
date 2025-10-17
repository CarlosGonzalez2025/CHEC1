import { SVGProps } from 'react';

export function ChecLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="hsl(var(--primary))" />
      <path d="M7 12h8" stroke="hsl(var(--primary-foreground))" />
      <path d="M7 8h10" stroke="hsl(var(--primary-foreground))" />
      <path d="M7 16h6" stroke="hsl(var(--primary-foreground))" />
    </svg>
  );
}
