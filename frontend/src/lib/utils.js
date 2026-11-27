import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui `cn` utility.
 * Merges Tailwind classes safely, resolving conflicts via `tailwind-merge`.
 * Used across all project components for consistent class composition.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
