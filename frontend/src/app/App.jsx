import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { ConverterPage } from '../components/converter/ConverterPage.jsx';
import { ConversionProgress } from '../components/converter/ConversionProgress.jsx';
import { ErrorReport } from '../components/converter/ErrorReport.jsx';
import { UserHistory } from '../components/history/UserHistory.jsx';
import { AdminDashboard } from '../components/admin/AdminDashboard.jsx';
import { HeroSection } from '../components/home/HeroSection.jsx';
import { SecondarySection } from '../components/home/SecondarySection.jsx';
import { HistorySection } from '../components/home/HistorySection.jsx';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col justify-between">
        {/* Navbar */}
        <Navbar />

        {/* Main Container */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
          <Routes>
            <Route path="/" element={
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-text-primary mb-3">
                  Secure Excel & JSON Converter
                </h1>
                <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
                  Convert Excel (.xlsx, .xls) to Normal Data JSON or Workbook JSON with metadata,
                  and JSON to Excel. Static JS extraction & BSON supported.
                </p>
                <div className="flex justify-center gap-3 mt-8">
                  <GetStartedButton />
                </div>
              </div>
            } />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/" element={
  <div className="min-h-screen flex flex-col">
    <HeroSection />
    <SecondarySection />
    <HistorySection />
  </div>
} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/converter/progress/:jobId" element={<ConversionProgress />} />
            <Route path="/converter/error/:jobId" element={<ErrorReport />} />
            <Route path="/history" element={<UserHistory />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

function GetStartedButton() {
  return (
    <a
      href="https://fazaldataconverter.com"
      target="_blank"
      rel="noopener noreferrer"
      className="px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-brand hover:bg-gradient-brand-hover shadow-sm transition-all duration-150"
    >
      Get Started
    </a>
  );
}
