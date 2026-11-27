import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropzone file upload component (PRD §10.5 F).
 * Accepts .xlsx, .xls, .json, .js files. Emits selected file via onFileChange.
 */
export function Dropzone({ onFileChange, accept = '.xlsx,.xls,.json,.js', disabled = false }) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => setIsDragActive(false);

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileChange(file);
  };

  const dropzoneClasses = cn(
    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-150 cursor-pointer',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : isDragActive
        ? 'bg-[#E0E7FF] border-[#5145E5] text-[#5145E5]'
        : 'bg-[#F6F5FF] border-[#C7D2FE] text-[#3730A3] hover:bg-[#EEF2FF] hover:border-[#818CF8]',
  );

  return (
    <section
      className={dropzoneClasses}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
      />
      <div
        className="flex flex-col items-center justify-center w-full"
        onClick={() => !disabled && document.querySelector('input[type=file]').click()}
        role="button"
        tabIndex={0}
      >
        <Upload className={cn('w-10 h-10 mx-auto mb-4', disabled ? 'text-text-muted' : 'text-[#6366F1]')} />
        <p className={cn('text-sm font-medium', disabled ? 'text-text-muted' : 'font-semibold')}>
          {disabled ? 'Upload disabled' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-text-muted mt-1">
          Supported: .xlsx, .xls, .json, .js (max 50 MB)
        </p>
      </div>
    </section>
  );
}
