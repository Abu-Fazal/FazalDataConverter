import { useState } from 'react';
import { CheckCircle2, Copy, Download, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';

/**
 * Converted output review panel (Figma: converter output review).
 */
export function OutputReview({
  title = 'Converted Output Review',
  subtitle,
  preview,
  filename,
  onDownload,
  downloading = false,
  verified = true,
  meta = [],
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      toast.success('Output copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Clipboard access is not available in this browser.');
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-primary shadow-card">
      <div className="flex flex-col gap-3 border-b border-border-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-bg text-success-text">
            <FileJson className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-headline-sm text-text-primary">{title}</h2>
              {verified && (
                <Badge variant="success" className="px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Verified
                </Badge>
              )}
            </div>
            {subtitle && <p className="text-body-sm text-text-secondary">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="small" onClick={copy} disabled={!preview}>
            <Copy className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            type="button"
            size="small"
            onClick={onDownload}
            disabled={!onDownload || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            )}
            {downloading ? 'Preparing…' : 'Download Output'}
          </Button>
        </div>
      </div>

      <pre className="max-h-80 overflow-auto bg-surface-inverse p-5 font-mono text-[12px] leading-relaxed text-text-inverse">
        <code>{preview || '// The converted output preview will appear here.'}</code>
      </pre>

      {(filename || meta.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-subtle px-5 py-3 text-body-sm text-text-secondary">
          {filename && <span className="font-medium text-text-primary">{filename}</span>}
          {meta.map((item) => (
            <span key={item.label}>
              {item.label}: <span className="text-text-primary">{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}