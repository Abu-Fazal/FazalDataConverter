import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Braces,
  CheckCircle2,
  Code2,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  Monitor,
  Pencil,
  RotateCcw,
  Server,
  ShieldCheck,
  Table2,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Progress } from '../ui/progress.jsx';
import { Select } from '../ui/select.jsx';
import { Dropzone } from '../ui/dropzone.jsx';
import { ConsentModal } from './ConsentModal.jsx';
import { BrowserFallbackConsent } from './BrowserFallbackConsent.jsx';
import { SheetSelectorModal } from './SheetSelectorModal.jsx';
import { OutputReview } from './OutputReview.jsx';
import {
  createJob,
  discardUpload,
  inspectWorkbook,
  saveBlob,
  uploadFile,
} from '../../services/converter.api.js';
import {
  convertXlsxInBrowser,
  getBrowserFallbackEligibility,
  inspectXlsxInBrowser,
} from '../../lib/browserFallback.js';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const CONSENT_KEY = 'fdc-consent';
const CONSENT_VERSION = '1.0';

const DIRECTIONS = [
  {
    id: 'excel-json',
    label: 'Excel → JSON',
    description: 'Normal or Workbook JSON',
    icon: Table2,
    extensions: ['xlsx', 'xls', 'xlsm'],
    accept: '.xlsx,.xls,.xlsm',
  },
  {
    id: 'json-excel',
    label: 'JSON → Excel',
    description: 'Normal or Workbook JSON input',
    icon: Database,
    extensions: ['json'],
    accept: '.json',
  },
  {
    id: 'excel-bson',
    label: 'Excel / BSON',
    description: 'Binary BSON documents',
    icon: FileSpreadsheet,
    extensions: ['xlsx', 'xls', 'xlsm'],
    accept: '.xlsx,.xls,.xlsm',
  },
  {
    id: 'js-extract',
    label: 'Static JS Extraction',
    description: 'Data only, no code execution',
    icon: Code2,
    extensions: ['js'],
    accept: '.js',
  },
];

function readStoredConsent() {
  if (typeof window === 'undefined') return false;
  try {
    const stored = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
    return stored?.version === CONSENT_VERSION && Boolean(stored?.acceptedAt);
  } catch {
    return false;
  }
}

function formatSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extensionOf(name = '') {
  return name.split('.').pop()?.toLowerCase() || '';
}

function overrideKey(sheet, address) {
  return `${sheet}!${address}`;
}

function cellSignal(header, value, type) {
  if (type === 'error') return 'error';
  if (value === null || value === '' || value === 'NaN') return 'empty';
  if (/^_?id$/i.test(String(header)) && !/^[0-9a-fA-F]{24}$/.test(String(value))) return 'warning';
  return null;
}

function StepHeading({ step, title, badge }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-brand-primary-soft px-1.5 text-label-md font-semibold text-brand-primary-deep">
        {step}
      </span>
      <h2 className="text-headline-sm text-text-primary">{title}</h2>
      <span className="text-label-md text-text-muted">Step {step}</span>
      {badge}
    </div>
  );
}

export function ConverterPage() {
  const navigate = useNavigate();
  const previewPanelRef = useRef(null);

  const [direction, setDirection] = useState('excel-json');
  const [mode, setMode] = useState('normal');
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [inspected, setInspected] = useState(null);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [sheetMode, setSheetMode] = useState('all');
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [previewSheet, setPreviewSheet] = useState('');
  const [overrides, setOverrides] = useState({});
  const [engine, setEngine] = useState('server');
  const [processing, setProcessing] = useState(false);
  const [hasConsent, setHasConsent] = useState(readStoredConsent);
  const [consentOpen, setConsentOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const activeDirection = DIRECTIONS.find((item) => item.id === direction) || DIRECTIONS[0];
  const fallbackEligibility = useMemo(
    () => getBrowserFallbackEligibility(file, { direction, mode }),
    [file, direction, mode],
  );

  const overrideList = useMemo(
    () => Object.entries(overrides).map(([key, value]) => {
      const separator = key.indexOf('!');
      return { sheet: key.slice(0, separator), address: key.slice(separator + 1), value };
    }),
    [overrides],
  );

  const sheetOptions = inspected?.sheets || [];
  const activePreview = inspected?.previews?.[previewSheet] || null;
  const canSelectSheets = Boolean(inspected) && sheetOptions.length > 0;
  const specificSelectionInvalid = sheetMode === 'specific' && selectedSheets.length === 0;

  useEffect(() => {
    if (!file || engine !== 'browser' || fallbackEligibility.eligible) return;
    setEngine('server');
    toast.info('This file is not eligible for browser fallback. Server processing selected.');
  }, [file, engine, fallbackEligibility.eligible]);

  async function runInspectionLocally(selectedFile) {
    setUploading(true);
    setUploadPct(0);
    try {
      const data = await inspectXlsxInBrowser(selectedFile, { onProgress: setUploadPct });
      setInspected({ ...data, origin: 'browser' });
      setSelectedSheets(data.sheets.map((sheet) => sheet.name));
      setPreviewSheet(data.sheets[0]?.name || '');
      setUploaded(null);
    } catch (error) {
      toast.error(error.message || 'The workbook could not be inspected locally.');
      setInspected(null);
      setEngine('server');
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  async function uploadAndInspect(selectedFile) {
    setUploading(true);
    setUploadPct(0);
    try {
      const info = await uploadFile(selectedFile, setUploadPct);
      setUploaded(info);

      if (['xlsx', 'xls', 'xlsm'].includes(extensionOf(selectedFile.name))) {
        const data = await inspectWorkbook(info.tempId, selectedFile.name);
        setInspected({ ...data, origin: 'server' });
        setSelectedSheets(data.sheets.map((sheet) => sheet.name));
        setPreviewSheet(data.sheets[0]?.name || '');
      } else {
        setInspected(null);
        setSelectedSheets([]);
        setPreviewSheet('');
      }

      toast.success(`${selectedFile.name} validated.`);
    } catch (error) {
      toast.error(error.message || 'The file could not be uploaded.');
      setUploaded(null);
      setInspected(null);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  async function handleFileChange(selectedFile) {
    if (!selectedFile) return;

    if (!activeDirection.extensions.includes(extensionOf(selectedFile.name))) {
      toast.error(`${activeDirection.label} accepts ${activeDirection.accept}.`);
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      toast.error('The file exceeds the strict 50 MB maximum file size limit.');
      return;
    }

    setErrorMessage('');
    setLocalResult(null);
    setOverrides({});
    setInspected(null);
    setSelectedSheets([]);
    setPreviewSheet('');
    setSheetMode('all');
    setFile(selectedFile);

    const localEligibility = getBrowserFallbackEligibility(selectedFile, { direction, mode });
    if (engine === 'browser' && localEligibility.eligible) await runInspectionLocally(selectedFile);
    else await uploadAndInspect(selectedFile);
  }

  async function clearFile() {
    if (uploaded?.tempId) {
      discardUpload(uploaded.tempId).catch(() => {});
    }
    setFile(null);
    setUploaded(null);
    setInspected(null);
    setSelectedSheets([]);
    setPreviewSheet('');
    setOverrides({});
    setLocalResult(null);
    setErrorMessage('');
    setUploadPct(0);
  }

  async function handleDirectionChange(nextDirection) {
    if (nextDirection === direction) return;
    setDirection(nextDirection);
    setMode('normal');
    setLocalResult(null);
    setOverrides({});
    setErrorMessage('');

    if (engine === 'browser') {
      setEngine('server');
    }

    if (file && !nextDirection.extensions.includes(extensionOf(file.name))) {
      await clearFile();
      toast.info(`Select a ${nextDirection.accept} file for ${nextDirection.label}.`);
    }
  }

  async function chooseEngine(nextEngine) {
    if (nextEngine === engine) return;

    if (nextEngine === 'browser') {
      if (!file) {
        setEngine('browser');
        toast.info('Browser fallback selected. Choose an eligible .xlsx file for Normal Data JSON.');
        return;
      }
      if (!fallbackEligibility.eligible) {
        toast.error(fallbackEligibility.reason || 'This file is not eligible for browser fallback.');
        return;
      }

      if (uploaded?.tempId) {
        try {
          await discardUpload(uploaded.tempId);
        } catch {
          toast.error('The server copy could not be removed. Server processing remains selected.');
          return;
        }
        setUploaded(null);
      }

      setEngine('browser');
      if (file && inspected?.origin !== 'browser') {
        await runInspectionLocally(file);
      }
      return;
    }

    setEngine('server');
  }

  function updateOverride(sheet, address, value) {
    setOverrides((current) => ({ ...current, [overrideKey(sheet, address)]: value }));
  }

  function resetOverrides() {
    setOverrides({});
    toast.info('Inline corrections were reset.');
  }

  function acceptConsent() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ version: CONSENT_VERSION, acceptedAt: new Date().toISOString() }),
      );
    }
    setHasConsent(true);
    setConsentOpen(false);
    runChecked().catch(() => {});
  }

  async function executeRun() {
    if (!hasConsent) {
      setConsentOpen(true);
      return;
    }
    await runChecked();
  }

  async function runChecked() {
    setErrorMessage('');

    if (!file) {
      toast.error('Select a source file first.');
      return;
    }
    if (specificSelectionInvalid) {
      toast.error('Select at least one worksheet or use the entire workbook.');
      return;
    }

    if (engine === 'browser') {
      if (!fallbackEligibility.eligible) {
        toast.error(fallbackEligibility.reason || 'Browser fallback is not available for this file.');
        return;
      }
      setFallbackOpen(true);
      return;
    }

    await runServerJob();
  }

  async function ensureUploaded() {
    if (uploaded?.tempId) return uploaded;

    setUploading(true);
    setUploadPct(0);
    try {
      const info = await uploadFile(file, setUploadPct);
      setUploaded(info);
      return info;
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  async function runServerJob() {
    setProcessing(true);
    setLocalResult(null);

    try {
      const info = await ensureUploaded();
      const response = await createJob({
        tempId: info.tempId,
        originalName: file.name,
        direction,
        mode: direction === 'excel-json' ? mode : 'normal',
        sheets: sheetMode === 'specific' ? selectedSheets : null,
        overrides: overrideList,
        consentAccepted: true,
        consentVersion: CONSENT_VERSION,
      });

      navigate(`/converter/progress/${response.jobId}`);
    } catch (error) {
      setErrorMessage(error.message || 'The conversion could not be started.');
      toast.error(error.message || 'The conversion could not be started.');
    } finally {
      setProcessing(false);
    }
  }

  async function runLocalConversion() {
    setFallbackOpen(false);
    setProcessing(true);
    setLocalResult(null);
    setErrorMessage('');

    try {
      const result = await convertXlsxInBrowser(file, {
        selectedSheets: sheetMode === 'specific' ? selectedSheets : null,
        overrides: overrideList,
        onProgress: setUploadPct,
      });

      const payload = JSON.stringify(
        {
          mode: 'normal',
          data: result.data,
          sheetCount: result.sheetCount,
          sheets: result.sheets,
        },
        null,
        2,
      );

      setLocalResult({
        payload,
        preview: result.preview,
        filename: `${file.name.replace(/\.xlsx$/i, '')}-normal.json`,
        stats: result.stats,
      });
      toast.success('Browser conversion completed.');
      window.setTimeout(() => {
        document.getElementById('converter-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (error) {
      setErrorMessage(error.message || 'Browser conversion failed.');
      toast.error(error.message || 'Browser conversion failed.');
    } finally {
      setProcessing(false);
      setUploadPct(0);
    }
  }

  function downloadLocalResult() {
    if (!localResult) return;
    saveBlob(new Blob([localResult.payload], { type: 'application/json' }), localResult.filename);
  }

  const runDisabled = !file || uploading || processing || specificSelectionInvalid;
  const runLabel = engine === 'browser' ? 'Run Browser Conversion' : 'Run Precision Conversion';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label-md uppercase tracking-[0.12em] text-brand-primary">
            Precision Conversion Workspace
          </p>
          <h1 className="mt-1 text-display-lg-mobile text-text-primary lg:text-display-lg">
            Converter
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-text-secondary">
            Convert Excel, JSON, BSON and static JavaScript data with deterministic validation.
            Maximum input size is 50 MB per file.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="processing" dot>50 MB max</Badge>
          <Badge variant="success" dot>Data only mode</Badge>
          <Badge variant="neutral">No macros executed</Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Conversion direction">
        {DIRECTIONS.map((item) => {
          const selected = item.id === direction;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleDirectionChange(item.id)}
              disabled={processing}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                selected
                  ? 'border-brand-primary bg-brand-primary-soft shadow-brand-ambient'
                  : 'border-border-subtle bg-surface-primary hover:border-brand-primary-border hover:bg-surface-secondary'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  selected ? 'bg-brand-primary text-text-inverse' : 'bg-surface-secondary text-text-secondary'
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`text-label-lg ${selected ? 'text-brand-primary-deep' : 'text-text-primary'}`}>
                {item.label}
              </span>
              <span className="text-body-sm text-text-muted">{item.description}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <StepHeading step="01" title="Source File Upload" />
        {!file ? (
          <Dropzone
            onFileChange={handleFileChange}
            accept={activeDirection.accept}
            disabled={uploading || processing}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-secondary p-4 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-primary text-brand-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-label-lg text-text-primary">{file.name}</p>
                  {uploading ? (
                    <Badge variant="processing" dot pulse>Uploading</Badge>
                  ) : (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {inspected?.origin === 'browser' ? 'Local copy' : 'Validated'}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-body-sm text-text-muted">
                  {formatSize(file.size)} •{' '}
                  {inspected ? `${inspected.file.sheetCount} sheets • ` : ''}
                  {inspected?.origin === 'browser' ? 'processed locally' : 'server validated'}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => document.getElementById('converter-file-input')?.click()}
                  disabled={uploading || processing}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={clearFile}
                  disabled={uploading || processing}
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <input
              id="converter-file-input"
              type="file"
              accept={activeDirection.accept}
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />

            {(uploading || uploadPct > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-body-sm text-text-secondary">
                  <span>{engine === 'browser' ? 'Reading workbook locally' : 'Uploading and inspecting'}</span>
                  <span className="font-medium text-text-primary">{uploadPct}%</span>
                </div>
                <Progress value={uploadPct} aria-label="Upload and inspection progress" />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <StepHeading step="02" title="Conversion Options" />

        <div className="grid gap-5 lg:grid-cols-2">
          {direction === 'excel-json' && (
            <div>
              <p className="mb-2 text-label-md uppercase tracking-wide text-text-muted">JSON mode selector</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: 'normal',
                    icon: Database,
                    title: 'Normal Data JSON',
                    detail: 'Clean key-value records for standard APIs',
                  },
                  {
                    id: 'workbook',
                    icon: Braces,
                    title: 'Workbook JSON',
                    detail: 'Preserves formulas, cell coordinates and styles',
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={mode === option.id}
                    onClick={() => setMode(option.id)}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                      mode === option.id
                        ? 'border-brand-primary bg-brand-primary-soft'
                        : 'border-border-subtle bg-surface-primary hover:bg-surface-secondary'
                    }`}
                  >
                    <option.icon
                      className={`h-5 w-5 ${mode === option.id ? 'text-brand-primary' : 'text-text-muted'}`}
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-label-lg text-text-primary">{option.title}</p>
                    <p className="text-body-sm text-text-muted">{option.detail}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-label-md uppercase tracking-wide text-text-muted">Sheet selector</p>
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="small"
                  variant={sheetMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setSheetMode('all')}
                  disabled={!canSelectSheets}
                >
                  Entire workbook
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant={sheetMode === 'specific' ? 'default' : 'outline'}
                  onClick={() => setSheetMode('specific')}
                  disabled={!canSelectSheets}
                >
                  Specific sheets
                </Button>
              </div>
              <p className="mt-2 text-body-sm text-text-muted">
                {canSelectSheets
                  ? `${sheetOptions.length} worksheet${sheetOptions.length === 1 ? '' : 's'} detected.`
                  : 'Worksheet selection is available for Excel inputs.'}
              </p>
              {sheetMode === 'specific' && canSelectSheets && (
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  className="mt-3"
                  onClick={() => setSheetModalOpen(true)}
                >
                  <Table2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Select sheets ({selectedSheets.length} of {sheetOptions.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-label-md uppercase tracking-wide text-text-muted">Processing engine</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={engine === 'server'}
              onClick={() => chooseEngine('server')}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                engine === 'server'
                  ? 'border-brand-primary bg-brand-primary-soft'
                  : 'border-border-subtle bg-surface-primary hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                <span className="text-label-lg text-text-primary">Server processing</span>
                <Badge variant="processing" className="ml-auto px-2 py-0 text-[10px]">Default</Badge>
              </div>
              <p className="mt-1 text-body-sm text-text-muted">
                Asynchronous job with progress, validation diagnostics and verified output.
              </p>
            </button>

            <button
              type="button"
              aria-pressed={engine === 'browser'}
              onClick={() => chooseEngine('browser')}
              disabled={Boolean(file) && !fallbackEligibility.eligible}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                engine === 'browser'
                  ? 'border-brand-primary bg-brand-primary-soft'
                  : 'border-border-subtle bg-surface-primary hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                <span className="text-label-lg text-text-primary">Browser fallback</span>
                {fallbackEligibility.eligible && (
                  <Badge variant="success" className="ml-auto px-2 py-0 text-[10px]">100% private</Badge>
                )}
              </div>
              <p className="mt-1 text-body-sm text-text-muted">
                {fallbackEligibility.eligible
                  ? 'Runs locally after explicit consent. Nothing is uploaded for this conversion.'
                  : fallbackEligibility.reason || 'Requires an eligible .xlsx file and Normal Data JSON mode.'}
              </p>
            </button>
          </div>
        </fieldset>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-secondary p-4 sm:flex-row sm:items-center">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success-dot" aria-hidden="true" />
          <p className="flex-1 text-body-sm text-text-secondary">
            Conversion starts only after consent. Read the{' '}
            <a className="font-medium text-text-link underline-offset-4 hover:underline" href="/about#trust">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a className="font-medium text-text-link underline-offset-4 hover:underline" href="/about#trust">
              Terms of Use
            </a>
            .{' '}
            {hasConsent ? (
              <span className="font-medium text-success-text">Consent recorded for this session.</span>
            ) : (
              <span className="font-medium text-warning-text">First-conversion consent is required.</span>
            )}
          </p>
          {hasConsent && <Badge variant="success">Consent on file</Badge>}
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-body-sm text-text-muted">
            {overrideList.length > 0 && (
              <span className="mr-3 inline-flex items-center gap-1 font-medium text-brand-primary">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {overrideList.length} inline correction{overrideList.length === 1 ? '' : 's'}
              </span>
            )}
            {direction === 'excel-json' ? `${mode === 'normal' ? 'Normal data' : 'Workbook'} JSON` : activeDirection.label}
            {' • '}
            {engine === 'browser' ? 'Browser engine' : 'Server engine'}
          </div>
          <Button
            type="button"
            size="large"
            className="w-full bg-gradient-brand hover:bg-gradient-brand-hover sm:w-auto"
            onClick={executeRun}
            disabled={runDisabled}
          >
            {processing || uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {processing ? 'Starting conversion…' : runLabel}
          </Button>
        </div>

        {errorMessage && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-error-border bg-error-bg p-3 text-body-sm text-error-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {activePreview && (
        <section ref={previewPanelRef} className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-headline-sm text-text-primary">
                  Pre-conversion Data Review &amp; Inline Editor
                </h2>
                <Badge variant="info">PRD §6.5</Badge>
              </div>
              <p className="mt-1 text-body-sm text-text-secondary">
                Click any cell to edit values before conversion. Validation highlights update live.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sheetOptions.length > 1 && (
                <Select
                  aria-label="Preview worksheet"
                  value={previewSheet}
                  onChange={(event) => setPreviewSheet(event.target.value)}
                  className="h-9 w-40 py-1.5"
                >
                  {sheetOptions.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                  ))}
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={resetOverrides}
                disabled={overrideList.length === 0}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Reset edits
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">
                Editable preview of worksheet {previewSheet}
              </caption>
              <thead className="bg-surface-secondary">
                <tr>
                  {activePreview.headers.map((header) => {
                    const key = overrideKey(previewSheet, header.address);
                    const value = Object.prototype.hasOwnProperty.call(overrides, key)
                      ? overrides[key]
                      : header.value;

                    return (
                      <th
                        key={header.address}
                        scope="col"
                        className="whitespace-nowrap border-b border-border-subtle px-2 py-1.5"
                      >
                        <input
                          type="text"
                          value={value}
                          aria-label={`Header ${header.column}`}
                          onChange={(event) => updateOverride(previewSheet, header.address, event.target.value)}
                          className={`w-full min-w-24 rounded-md border bg-surface-primary px-2 py-1.5 text-label-md uppercase tracking-wide text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                            Object.prototype.hasOwnProperty.call(overrides, key)
                              ? 'border-brand-primary-border ring-1 ring-brand-primary-border'
                              : 'border-border-subtle'
                          }`}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activePreview.rows.map((row) => (
                  <tr key={row.index} className="border-b border-border-faint last:border-0">
                    {row.cells.map((cell, columnIndex) => {
                      const header = activePreview.headers[columnIndex]?.value || cell.column;
                      const key = overrideKey(previewSheet, cell.address);
                      const value = Object.prototype.hasOwnProperty.call(overrides, key)
                        ? overrides[key]
                        : cell.value == null ? '' : String(cell.value);
                      const signal = cellSignal(header, value, cell.type);
                      const edited = Object.prototype.hasOwnProperty.call(overrides, key);

                      return (
                        <td key={cell.address} className="px-2 py-1.5">
                          <input
                            type="text"
                            value={value}
                            aria-label={`${header}, cell ${cell.address}`}
                            onChange={(event) => updateOverride(previewSheet, cell.address, event.target.value)}
                            className={`w-full rounded-md border bg-surface-primary px-2 py-1.5 font-mono text-[12px] text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                              signal === 'error'
                                ? 'border-error-border bg-error-bg'
                                : signal === 'warning'
                                  ? 'border-warning-border bg-warning-bg'
                                  : signal === 'empty'
                                    ? 'border-border-subtle'
                                    : 'border-border-subtle'
                            } ${edited ? 'ring-1 ring-brand-primary-border' : ''}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-body-sm text-text-muted">
            Showing up to 8 rows from {previewSheet}. Changes are applied to the converted output.
            {overrides && Object.keys(overrides).length > 0
              ? ' Empty and NaN cells are highlighted for review.'
              : ''}
          </p>
        </section>
      )}

      {localResult && (
        <div id="converter-output" className="scroll-mt-24">
          <OutputReview
            subtitle="Processed locally in this browser. Nothing was uploaded for this conversion."
            preview={localResult.preview}
            filename={localResult.filename}
            onDownload={downloadLocalResult}
            meta={[
              { label: 'Sheets', value: localResult.stats.sheetCount },
              { label: 'Rows', value: localResult.stats.rowCount },
              { label: 'Cells', value: localResult.stats.cellCount },
              { label: 'Time', value: `${localResult.stats.durationMs} ms` },
              { label: 'Integrity', value: '100%' },
            ]}
          />
        </div>
      )}

      <SheetSelectorModal
        open={sheetModalOpen}
        onOpenChange={setSheetModalOpen}
        file={file}
        sheets={sheetOptions}
        selectedSheets={selectedSheets}
        onConfirm={(names) => {
          setSelectedSheets(names);
          setSheetMode('specific');
        }}
      />

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={acceptConsent}
      />

      <BrowserFallbackConsent
        open={fallbackOpen}
        onOpenChange={setFallbackOpen}
        file={file}
        eligibility={fallbackEligibility}
        busy={processing}
        onGrant={runLocalConversion}
        onDeny={() => {
          setFallbackOpen(false);
          setEngine('server');
          toast.info('Browser fallback denied. Server processing selected.');
        }}
      />
    </div>
  );
}