import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button.jsx';

const API_BASE = '/api';

/**
 * Error report screen (Chunk 5.3).
 * Shows conversion error details and offers retry or back actions.
 */
export function ErrorReport() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  function goBack() {
    navigate('/converter');
  }

  async function retry() {
    if (!jobId) return;
    setRetrying(true);
    try {
      // Retry triggers a new conversion by navigating back to converter page.
      // Full API retry wiring is handled in later chunks.
      navigate('/converter');
    } catch (err) {
      // noop
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="small" onClick={goBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-text-primary">Error Report</h1>
      </div>

      {/* Error card */}
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-[#B91C1C]" />
          <h2 className="font-semibold text-[#B91C1C]">Conversion failed</h2>
          <p className="text-sm text-[#B91C1C]/80">
            {jobId ? `Job ID: ${jobId}` : 'No job ID available.'}
          </p>
        </div>

        <div className="mt-4 border-t border-[#FECACA]/50 pt-4">
          <h3 className="text-xs font-semibold text-[#B91C1C] mb-2 uppercase tracking-wider">
            What went wrong
          </h3>
          <p className="text-sm text-[#B91C1C]/70 leading-relaxed">
            The conversion could not be completed. This may be due to an unsupported file
            structure, a corrupted file, or a server-side error. Please verify your file and
            try again.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="small"
          disabled={retrying}
          onClick={retry}
          className={retrying ? 'opacity-70' : ''}
        >
          {retrying ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Retrying...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </div>
          )}
        </Button>
        <Button variant="outline" size="small" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Converter
        </Button>
      </div>
    </div>
  );
}
