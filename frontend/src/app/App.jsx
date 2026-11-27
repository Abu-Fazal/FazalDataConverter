import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface-primary px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
            FD
          </div>
          <span className="font-semibold text-lg text-text-primary tracking-tight">
            FazalDataConverter
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-brand-primary-soft text-brand-primary border border-brand-primary-border">
            v1.0.0
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-primary mb-3">
            Secure Excel & JSON Converter
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Convert Excel (.xlsx, .xls) to Normal Data JSON or Workbook JSON with metadata,
            and JSON to Excel. Static JS extraction & BSON supported.
          </p>
        </div>

        {/* Feature Baseline Card */}
        <div className="bg-surface-primary rounded-xl border border-border-subtle p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center p-3 bg-brand-primary-soft text-brand-primary rounded-xl mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Frontend Base Configured
          </h3>
          <p className="text-xs text-text-muted mb-6">
            React 19 + Vite + Tailwind CSS + Inter Font Only + Approved Design Tokens.
          </p>
          <div className="flex justify-center gap-3">
            <button className="px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-brand hover:bg-gradient-brand-hover shadow-sm transition-all duration-150">
              Get Started
            </button>
            <button className="px-5 py-2.5 text-sm font-medium rounded-lg text-brand-primary-deep bg-surface-primary border border-border-subtle hover:bg-surface-secondary transition-all duration-150">
              Documentation
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface-primary py-4 px-6 text-center text-xs text-text-muted">
        FazalDataConverter &copy; 2026. Data Only Mode. Max file size: 50 MB.
      </footer>
    </div>
  );
}
