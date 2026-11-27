import { useState } from 'react';
import { FileText, Layout, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Dropzone } from '../ui/dropzone.jsx';
import { SheetSelectorModal } from './SheetSelectorModal.jsx';

/**
 * Main Converter screen (Chunk 5.2).
 * - Dropzone for file upload
 * - Mode toggle: Normal Data JSON vs Workbook JSON
 * - Sheet selector modal (Workbook JSON mode)
 * Presentational UI only; API wiring handled in later chunks.
 */
export function ConverterPage() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('normal'); // 'normal' | 'workbook'
  const [targetFormat, setTargetFormat] = useState('json'); // 'json' | 'xlsx'
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [isConverting, setIsConverting] = useState(false);

  const sheets = [
    { name: 'Sheet1', rows: 142 },
    { name: 'Sheet2', rows: 87 },
    { name: 'Sheet3', rows: 0 },
  ];

  const handleConvert = () => {
    if (!file) return;
    setIsConverting(true);
    setTimeout(() => setIsConverting(false), 1500);
  };

  const modeLabel = mode === 'normal' ? 'Normal Data JSON' : 'Workbook JSON';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Converter</h1>
          <p className="text-text-muted text-sm">
            Convert Excel to JSON or JSON to Excel. Max file size: 50 MB.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="small" variant="outline" disabled={!file || isConverting}>
            <Download className="w-4 h-4 mr-2" />
            Download Output
          </Button>
          <Button size="small" onClick={handleConvert} disabled={!file || isConverting}>
            {isConverting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Converting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Convert
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Mode + Target toggle */}
      <div className="grid grid-cols-2 gap-4 lg:max-w-md">
        <div className="border border-border-subtle rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layout className="w-5 h-5 text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">Output Mode</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="small"
              variant={mode === 'normal' ? 'default' : 'outline'}
              onClick={() => setMode('normal')}
            >
              Normal Data JSON
            </Button>
            <Button
              size="small"
              variant={mode === 'workbook' ? 'default' : 'outline'}
              onClick={() => setMode('workbook')}
            >
              Workbook JSON
            </Button>
          </div>
        </div>

        <div className="border border-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">Target Format</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="small"
              variant={targetFormat === 'json' ? 'default' : 'outline'}
              onClick={() => setTargetFormat('json')}
            >
              JSON
            </Button>
            <Button
              size="small"
              variant={targetFormat === 'xlsx' ? 'default' : 'outline'}
              onClick={() => setTargetFormat('xlsx')}
            >
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <Dropzone onFileChange={setFile} disabled={isConverting} />

      {file && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border-subtle bg-surface-secondary max-w-sm">
          <FileText className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-primary truncate">{file.name}</span>
          <span className="ml-auto text-xs text-text-muted">{file.size} bytes</span>
          <Button
            size="small"
            variant="ghost"
            className="p-1 -mr-1"
            onClick={() => setFile(null)}
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
          </Button>
        </div>
      )}

      {/* Sheet selector modal trigger (Workbook JSON only) */}
      {mode === 'workbook' && file && (
        <Button
          size="small"
          variant="outline"
          className="max-w-sm mx-auto"
          onClick={() => setSheetModalOpen(true)}
        >
          <Sheet className="w-4 h-4 mr-2" />
          Select Sheets ({selectedSheets.length} of {sheets.length})
        </Button>
      )}

      <SheetSelectorModal
        open={sheetModalOpen}
        onOpenChange={setSheetModalOpen}
        sheets={sheets}
        onConfirm={(names) => setSelectedSheets(names)}
      />
    </div>
  );
}
