import { useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ArrowRight, RefreshCw } from 'lucide-react';

/**
 * Home Hero Section (Phase 5).
 * Main hero screen with headline, subtext, and CTA.
 * Per PRD §1.1, §1.2, §3.1 design specifications.
 */
export function HeroSection() {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  return (
    <div className="bg-surface-primary py-12 px-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-3">
          Secure Excel & JSON Converter
        </h1>
        <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed mb-6">
          Convert Excel (.xlsx, .xls) to Normal Data JSON or Workbook JSON with metadata,
          and JSON to Excel. Static JS extraction & BSON supported.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="large"
            variant="default"
            onClick={handleClick}
            className="px-8 py-3 text-lg font-medium rounded-lg text-white bg-gradient-brand hover:bg-gradient-brand-shadow"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Get Started
          </Button>
          <Button
            size="large"
            variant="outline"
            onClick={() => window.location.href = '/converter'}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Docs
          </Button>
        </div>
      </div>
    </div>
  );
}