import { Toaster as SonnerToaster } from 'sonner';

export function Toaster(props) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border-border-subtle shadow-dropdown font-sans text-body-md',
          title: 'text-label-lg',
          description: 'text-body-sm text-text-secondary',
        },
      }}
      {...props}
    />
  );
}