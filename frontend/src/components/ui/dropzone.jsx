import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropzone file upload component (PRD §10.5 F).
 * Accepts the supported conversion formats and emits the selected file.
 */
export function Dropzone({ onFileChange, accept = '.xlsx,.xls,.xlsm,.json,.js,.bson', disabled = false }) {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) onFileChange(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = () => setIsDragActive(false);

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) onFileChange(file);
    event.target.value = '';
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const dropzoneClasses = cn(
    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-150',
    disabled
      ? 'cursor-not-allowed opacity-50'
      : isDragActive
        ? 'cursor-pointer border-brand-primary bg-brand-primary-surface text-brand-primary-deep'
        : 'cursor-pointer border-brand-primary-border bg-surface-secondary text-brand-primary-deep hover:border-brand-primary-light hover:bg-brand-primary-soft',
  );

  return (
    <section
      className={dropzoneClasses}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
        tabIndex={-1}
      />
      <Upload className={cn('mb-4 h-10 w-10', disabled ? 'text-text-muted' : 'text-brand-primary')} aria-hidden="true" />
      <p className={cn('text-body-md', disabled ? 'text-text-muted' : 'font-semibold text-text-primary')}>
        {disabled ? 'Upload disabled' : 'Click to upload or drag and drop'}
      </p>
      <p className="mt-1 text-body-sm text-text-muted">
        Supported: .xlsx, .xls, .xlsm, .json, .js, .bson (max 50 MB)
      </p>
    </section>
  );
}