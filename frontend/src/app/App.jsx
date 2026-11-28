import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { ConverterPage } from '../components/converter/ConverterPage.jsx';
import { ConversionProgress } from '../components/converter/ConversionProgress.jsx';
import { ErrorReport } from '../components/converter/ErrorReport.jsx';
import { UserHistory } from '../components/history/UserHistory.jsx';
import { AdminDashboard } from '../components/admin/AdminDashboard.jsx';
import { LoginPage } from '../components/auth/LoginPage.jsx';
import { AuthGuard } from '../components/auth/AuthGuard.jsx';
import { HeroSection } from '../components/home/HeroSection.jsx';
import { SecondarySection } from '../components/home/SecondarySection.jsx';
import { HistorySection } from '../components/home/HistorySection.jsx';

function HomePage() {
  return (
    <>
      <HeroSection />
      <SecondarySection />
      <HistorySection />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/converter/progress/:jobId" element={<ConversionProgress />} />
            <Route path="/converter/error/:jobId" element={<ErrorReport />} />
            <Route
              path="/history"
              element={
                <AuthGuard>
                  <UserHistory />
                </AuthGuard>
              }
            />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}