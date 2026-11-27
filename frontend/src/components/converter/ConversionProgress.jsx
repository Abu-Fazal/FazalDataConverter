import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Download, ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Progress, StatusBadge } from '../ui/progress.jsx';

const API_BASE = '/api';

export function ConversionProgress() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
    const interval = setInterval(fetchJob, 2000);
    setPollInterval(interval);
    return () => clearInterval(interval);
  }, [jobId]);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  async function fetchJob() {
    try {
      const res = await fetch(`${API_BASE}/jobs/status/${jobId}`);
      if (!res.ok) {
        setError('Unable to load job status.');
        return;
      }
      const data = await res.json();
      setJob(data.job);
      setError(null);
    } catch (err) {
      setError('Network error while polling job status.');
    }
  }

  async function cancelJob() {
    if (!jobId) return;
    try {
      await fetch(`${API_BASE}/jobs/cancel/${jobId}`, { method: 'POST' });
      setError('Job cancelled by user.');
    } catch (err) {
      setError('Failed to cancel job.');
    }
  }

  function goBack() {
    navigate('/converter');
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#B91C1C]" />
        <h2 className="text-lg font-semibold text-text-primary">Unable to load job</h2>
        <p className="text-text-secondary text-sm">{error}</p>
        <Button variant="outline" size="small" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Converter
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-[#6366F1] animate-spin" />
        <h2 className="text-lg font-semibold text-text-primary">Loading job...</h2>
        <p className="text-text-secondary text-sm">Please wait while we fetch the job status.</p>
      </div>
    );
  }

  const isTerminal =
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
  const progressPct = job.progress ?? 0;

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="small" onClick={goBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-text-primary">Conversion Progress</h1>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={job.status} />
          <span className="ml-auto text-xs text-text-muted">
            {job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : ''}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{job.stage || 'Initializing'}</span>
            <span className="text-text-primary font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
          <Clock className="w-4 h-4" />
          <span>
            {isTerminal ? 'Finished' : 'Estimated time remaining: --:--'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isTerminal ? (
            <>
              {job.status === 'completed' && job.result && (
                <Button size="small" onClick={() => navigate('/converter')}>
                  <Download className="w-4 h-4 mr-2" />
                  View Output
                </Button>
              )}
              {(job.status === 'failed' || job.status === 'cancelled') && (
                <Button variant="outline" size="small" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Converter
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" size="small" onClick={cancelJob}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {job.status === 'completed' && (
        <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-6 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-[#047857] mb-3" />
          <h3 className="font-semibold text-[#047857] mb-1">Conversion completed</h3>
          <p className="text-xs text-[#047857]/80">Your file has been converted successfully.</p>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-[#B91C1C]" />
          <h3 className="font-semibold text-[#B91C1C] mb-1">Conversion failed</h3>
          <p className="text-xs text-[#B91C1C]/80">
            {job.error || 'An unknown error occurred during conversion.'}
          </p>
        </div>
      )}
    </div>
  );
}