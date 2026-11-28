import { Button } from '../ui/button.jsx';
import { ArrowRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Home Hero Section (Phase 5).
 * Main hero screen with headline, subtext, and CTA.
 * Per PRD §1.1, §1.2, §3.1 design specifications.
 */
export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface-primary py-12 px-4">
      <div className="text-center max-w-2xl mx-auto">
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
            onClick={() => navigate('/converter')}
            className="px-8 py-3 text-lg font-medium rounded-lg text-white bg-gradient-brand hover:bg-gradient-brand-shadow"
          >
            <ArrowRight className="w-5 h-5 mr-2" aria-hidden="true" />
            Get Started
          </Button>
          <Button size="large" variant="outline" onClick={() => navigate('/history')}>
            <History className="w-5 h-5 mr-2" aria-hidden="true" />
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}