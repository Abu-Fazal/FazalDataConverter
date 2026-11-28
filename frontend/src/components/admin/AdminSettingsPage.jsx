import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Switch } from '../ui/switch.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Label } from '../ui/label.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes, formatDateTime } from './format.js';

const NUMERIC_FIELDS = [
  'maxFileSizeMb',
  'smallFileSlaSeconds',
  'largeFileSlaSeconds',
  'memoryLimitMb',
  'maxNestingDepth',
  'quarantineHours',
];

const LIMITS = {
  maxFileSizeMb: { min: 5, max: 50, label: 'Maximum upload size', unit: 'MB', hint: 'Hard cap enforced before processing begins.' },
  smallFileSlaSeconds: { min: 1, max: 300, label: 'Small-file SLA', unit: 'seconds', hint: 'Applies to uploads up to 10 MB.' },
  largeFileSlaSeconds: { min: 5, max: 900, label: 'Large-file SLA', unit: 'seconds', hint: 'Applies to uploads above 10 MB.' },
  memoryLimitMb: { min: 32, max: 4096, label: 'Engine memory ceiling', unit: 'MB', hint: 'Soft alert threshold for the conversion worker.' },
  maxNestingDepth: { min: 1, max: 64, label: 'Maximum JSON nesting depth', unit: 'levels', hint: 'Deeper structures are rejected during validation.' },
  quarantineHours: { min: 1, max: 720, label: 'Failed-file quarantine', unit: 'hours', hint: 'How long failed originals are kept for retry.' },
};

const ICONS = {
  maxFileSizeMb: HardDrive,
  smallFileSlaSeconds: Timer,
  largeFileSlaSeconds: Clock,
  memoryLimitMb: Cpu,
  maxNestingDepth: Layers,
  quarantineHours: ShieldAlert,
};

function emptyForm() {
  return NUMERIC_FIELDS.reduce((accumulator, field) => ({ ...accumulator, [field]: 0 }), {});
}

function validate(form) {
  const issues = [];
  NUMERIC_FIELDS.forEach((field) => {
    const value = Number(form[field]);
    const limits = LIMITS[field];
    if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
      issues.push(`${limits.label} must be a whole number between ${limits.min} and ${limits.max}.`);
    }
  });
  return issues;
}

/**
 * System settings, maintenance control, and audit summary (PRD §3.4, §3.7).
 */
export function AdminSettingsPage() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [applyingMaintenance, setApplyingMaintenance] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceConsent, setMaintenanceConsent] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConsent, setResetConsent] = useState(false);
  const [issues, setIssues] = useState([]);

  async function loadConfig() {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getConfig();
      setConfig(data);
      setForm(NUMERIC_FIELDS.reduce((accumulator, field) => ({ ...accumulator, [field]: data.settings[field] }), {}));
      setMessageDraft(data.settings.maintenanceMessage || '');
      setIssues([]);
    } catch (loadError) {
      setError(loadError.message || 'Could not load system configuration.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const settings = config?.settings;
  const system = config?.system;
  const maintenance = Boolean(settings?.maintenanceMode);
  const maintenanceDirty = Boolean(
    settings && messageDraft.trim() !== (settings.maintenanceMessage || '').trim(),
  );

  const dirty = useMemo(() => {
    if (!settings) return false;
    return NUMERIC_FIELDS.some((field) => Number(form[field]) !== settings[field]);
  }, [form, settings]);

  function updateField(field, raw) {
    const next = raw === '' ? '' : Number(raw);
    setForm((current) => ({ ...current, [field]: next }));
  }

  async function handleSave() {
    const found = validate(form);
    setIssues(found);
    if (found.length > 0) {
      toast.error('Fix configuration issues', { description: found[0] });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...NUMERIC_FIELDS.reduce((accumulator, field) => ({ ...accumulator, [field]: Number(form[field]) }), {}),
        maintenanceMode: maintenance,
        maintenanceMessage: settings?.maintenanceMessage || messageDraft.trim(),
      };
      const data = await adminApi.saveConfig(payload);
      setConfig((current) => ({ ...current, ...data }));
      setForm(NUMERIC_FIELDS.reduce((accumulator, field) => ({ ...accumulator, [field]: data.settings[field] }), {}));
      toast.success('System configuration saved', {
        description: 'New limits apply to the next conversion job.',
      });
    } catch (saveError) {
      toast.error('Could not save configuration', { description: saveError.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleMaintenanceApply() {
    setApplyingMaintenance(true);
    try {
      const data = await adminApi.setMaintenance(
        !maintenance,
        messageDraft.trim() || settings?.maintenanceMessage,
      );
      setConfig((current) => ({ ...current, ...data }));
      setMessageDraft(data.settings.maintenanceMessage || '');
      toast.success(!maintenance ? 'Maintenance mode enabled' : 'Maintenance mode disabled', {
        description: !maintenance
          ? 'Guests and registered users now receive 503; admins keep full access.'
          : 'Service restored for all users.',
      });
      setMaintenanceOpen(false);
      setMaintenanceConsent(false);
    } catch (maintenanceError) {
      toast.error('Could not change maintenance mode', { description: maintenanceError.message });
    } finally {
      setApplyingMaintenance(false);
    }
  }

  async function handleMessageApply() {
    setApplyingMaintenance(true);
    try {
      const data = await adminApi.setMaintenance(maintenance, messageDraft.trim());
      setConfig((current) => ({ ...current, ...data }));
      setMessageDraft(data.settings.maintenanceMessage || '');
      toast.success('Maintenance message updated', {
        description: maintenance
          ? 'The active maintenance notice now shows the new copy.'
          : 'Stored for the next time maintenance mode is enabled.',
      });
    } catch (messageError) {
      toast.error('Could not update the message', { description: messageError.message });
    } finally {
      setApplyingMaintenance(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const data = await adminApi.resetConfig();
      setConfig((current) => ({ ...current, ...data }));
      setForm(NUMERIC_FIELDS.reduce((accumulator, field) => ({ ...accumulator, [field]: data.settings[field] }), {}));
      setMessageDraft(data.settings.maintenanceMessage || '');
      toast.success('Configuration restored to defaults', {
        description: 'All engine limits and maintenance settings were reset.',
      });
      setResetOpen(false);
      setResetConsent(false);
      setIssues([]);
    } catch (resetError) {
      toast.error('Reset failed', { description: resetError.message });
    } finally {
      setResetting(false);
    }
  }

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
        <span className="sr-only">Loading system configuration</span>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-error-border bg-error-bg px-4 py-10 text-center">
        <p className="text-body-md font-medium text-error-text">{error}</p>
        <Button size="small" variant="outline" onClick={loadConfig}>
          Retry
        </Button>
      </div>
    );
  }

  const configAge = settings?.updatedAt ? formatDateTime(settings.updatedAt) : 'Factory defaults';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={maintenance ? 'warning' : 'success'} dot>
                {maintenance ? 'Maintenance mode active' : 'Operational'}
              </Badge>
              <Badge variant="neutral">PRD §3.4 · PRD §3.7</Badge>
            </div>
            <h2 className="mt-3 text-headline-lg text-text-primary">System Configuration &amp; Maintenance</h2>
            <p className="mt-1 max-w-3xl text-body-sm text-text-secondary">
              Tune engine thresholds and control platform availability. Every configuration change and
              maintenance toggle is written to the immutable security ledger.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setResetOpen(true)} disabled={saving || resetting}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reset defaults
            </Button>
            <Button size="small" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Save configuration
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <h3 className="text-label-lg font-semibold text-text-primary">Engine limits</h3>
            {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          </div>
          <p className="mt-1 text-body-sm text-text-secondary">
            Range limits are enforced server-side and re-validated on every save.
          </p>

          <div className="mt-5 space-y-6">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="max-file-size">Maximum upload size</Label>
                <span className="text-label-lg font-semibold tabular-nums text-brand-primary">
                  {Number(form.maxFileSizeMb) || 0} MB
                </span>
              </div>
              <input
                id="max-file-size"
                type="range"
                min={LIMITS.maxFileSizeMb.min}
                max={LIMITS.maxFileSizeMb.max}
                step={1}
                value={Number(form.maxFileSizeMb) || LIMITS.maxFileSizeMb.min}
                onChange={(event) => updateField('maxFileSizeMb', event.target.value)}
                aria-valuetext={`${Number(form.maxFileSizeMb) || 0} megabytes`}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-secondary accent-brand-primary"
              />
              <div className="mt-1 flex justify-between text-[11px] text-text-muted">
                <span>{LIMITS.maxFileSizeMb.min} MB</span>
                <span>{LIMITS.maxFileSizeMb.max} MB hard cap</span>
              </div>
              <p className="mt-1 text-[11px] text-text-muted">{LIMITS.maxFileSizeMb.hint}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {NUMERIC_FIELDS.filter((field) => field !== 'maxFileSizeMb').map((field) => {
                const limits = LIMITS[field];
                const Icon = ICONS[field];
                return (
                  <div key={field}>
                    <Label htmlFor={`field-${field}`} className="flex items-center gap-1.5">
                      <Icon size={14} className="text-text-muted" aria-hidden="true" />
                      {limits.label}
                    </Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        id={`field-${field}`}
                        type="number"
                        inputMode="numeric"
                        min={limits.min}
                        max={limits.max}
                        step={1}
                        value={form[field]}
                        onChange={(event) => updateField(field, event.target.value)}
                        aria-describedby={`hint-${field}`}
                      />
                      <span className="shrink-0 text-body-sm text-text-muted">{limits.unit}</span>
                    </div>
                    <p id={`hint-${field}`} className="mt-1 text-[11px] text-text-muted">
                      {limits.hint} Allowed {limits.min}–{limits.max}.
                    </p>
                  </div>
                );
              })}
            </div>

            {issues.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className={`p-5 ${maintenance ? 'border-warning-border' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                <h3 className="text-label-lg font-semibold text-text-primary">Maintenance mode</h3>
              </div>
              <Switch
                checked={maintenance}
                onCheckedChange={() => setMaintenanceOpen(true)}
                aria-label="Toggle maintenance mode"
              />
            </div>
            <p className="mt-2 text-body-sm text-text-secondary">
              When enabled, guests and registered users receive a 503 maintenance response. Admins
              retain full console access. Requires explicit confirmation.
            </p>

            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-app px-3 py-2 text-[11px] leading-5 text-text-secondary">
              <p>
                Status: <span className="font-semibold text-text-primary">{maintenance ? 'Maintenance' : 'Operational'}</span>
              </p>
              <p>
                Last updated:{' '}
                <span className="font-medium text-text-primary">{configAge}</span>
                {settings?.updatedBy ? ` by ${settings.updatedBy}` : ''}
              </p>
            </div>

            <div className="mt-4">
              <Label htmlFor="maintenance-message">Public maintenance message</Label>
              <Textarea
                id="maintenance-message"
                className="mt-1.5"
                rows={3}
                maxLength={500}
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Shown to users while maintenance mode is active"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
                <span>{maintenanceDirty ? 'Message changed — apply to publish.' : 'Matches the active message.'}</span>
                <span className="tabular-nums">{messageDraft.length}/500</span>
              </div>
              {maintenanceDirty ? (
                <Button
                  size="small"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={handleMessageApply}
                  disabled={applyingMaintenance || !messageDraft.trim()}
                >
                  {applyingMaintenance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Save message only
                </Button>
              ) : null}
            </div>

            <Button
              size="small"
              variant={maintenance ? 'secondary' : 'danger'}
              className="mt-4 w-full"
              onClick={() => setMaintenanceOpen(true)}
              disabled={applyingMaintenance}
            >
              {maintenance ? 'Disable maintenance mode' : 'Enable maintenance mode'}
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              <h3 className="text-label-lg font-semibold text-text-primary">Live engine snapshot</h3>
            </div>
            <dl className="mt-3 space-y-2 text-body-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Service status</dt>
                <dd>
                  <Badge variant={maintenance ? 'warning' : 'success'} dot>
                    {maintenance ? 'Maintenance' : 'Operational'}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Storage used</dt>
                <dd className="tabular-nums text-text-primary">{formatBytes(system?.storage?.usedBytes)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Memory (RSS)</dt>
                <dd className="tabular-nums text-text-primary">
                  {system?.memory?.usedMb ?? 0} MB / {system?.memory?.limitMb ?? 0} MB
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Active jobs</dt>
                <dd className="tabular-nums text-text-primary">{system?.activeJobs ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Last mutation</dt>
                <dd className="text-text-primary">
                  {system?.lastConfigMutation?.at
                    ? `${formatDateTime(system.lastConfigMutation.at)} · ${system.lastConfigMutation.by || 'system'}`
                    : 'None this session'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-[11px] leading-5 text-info-text">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Configuration state {configAge === 'Factory defaults' ? 'uses factory defaults' : `was last updated ${configAge}`}
        {settings?.updatedBy ? ` by ${settings.updatedBy}` : ''}. Limits are validated against the schema on the
        server before they apply.
      </p>

      <Dialog
        open={maintenanceOpen}
        onOpenChange={(open) => {
          setMaintenanceOpen(open);
          if (!open) setMaintenanceConsent(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{maintenance ? 'Disable maintenance mode?' : 'Enable maintenance mode?'}</DialogTitle>
            <DialogDescription>
              {maintenance
                ? 'All users will immediately regain access to conversion, history, and account features.'
                : 'Guests and registered users will receive a 503 maintenance response. The admin console stays reachable.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border-subtle bg-surface-app px-3 py-2.5 text-body-sm text-text-secondary">
              <p className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Message preview</p>
              <p className="mt-1 text-text-primary">
                {messageDraft.trim() || 'No message set — the default notice will be shown.'}
              </p>
            </div>
            <Checkbox
              id="maintenance-consent"
              checked={maintenanceConsent}
              onChange={(event) => setMaintenanceConsent(event.target.checked)}
              label="I understand the availability impact and want to apply this change."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMaintenanceOpen(false);
                setMaintenanceConsent(false);
              }}
              disabled={applyingMaintenance}
            >
              Cancel
            </Button>
            <Button
              variant={maintenance ? 'default' : 'danger'}
              onClick={handleMaintenanceApply}
              disabled={!maintenanceConsent || applyingMaintenance}
            >
              {applyingMaintenance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {maintenance ? 'Disable maintenance' : 'Enable maintenance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setResetConsent(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore factory defaults?</DialogTitle>
            <DialogDescription>
              All engine limits, the maintenance message, and the maintenance state return to defaults.
              Active jobs are unaffected, and the reset is recorded in the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border-subtle bg-surface-app px-3 py-2.5 text-[11px] leading-5 text-text-secondary">
              <p>
                Defaults: {config?.defaults?.maxFileSizeMb} MB cap · {config?.defaults?.smallFileSlaSeconds}s /{' '}
                {config?.defaults?.largeFileSlaSeconds}s SLA · {config?.defaults?.memoryLimitMb} MB memory ·{' '}
                {config?.defaults?.maxNestingDepth} nesting · {config?.defaults?.quarantineHours}h quarantine.
              </p>
            </div>
            <Checkbox
              id="reset-consent"
              checked={resetConsent}
              onChange={(event) => setResetConsent(event.target.checked)}
              label="I understand this overwrites the current configuration."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetOpen(false);
                setResetConsent(false);
              }}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset} disabled={!resetConsent || resetting}>
              {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Restore defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}