import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { ConverterPage } from '../components/converter/ConverterPage.jsx';
import { ConversionProgress } from '../components/converter/ConversionProgress.jsx';
import { ErrorReport } from '../components/converter/ErrorReport.jsx';
import { UserHistory } from '../components/history/UserHistory.jsx';
import { AdminDashboard } from '../components/admin/AdminDashboard.jsx';
import { LoginPage } from '../components/auth/LoginPage.jsx';
import { AuthGuard } from '../components/auth/AuthGuard.jsx';
import { AboutPage } from '../components/about/AboutPage.jsx';
import { AccountPage } from '../components/account/AccountPage.jsx';
import { HeroSection } from '../components/home/HeroSection.jsx';
import { SecondarySection } from '../components/home/SecondarySection.jsx';
import { HistorySection } from '../components/home/HistorySection.jsx';
import { Toaster } from '../components/ui/toaster.jsx';
import { TooltipProvider } from '../components/ui/tooltip.jsx';

function HomePage() {
  return (
    <>
      <HeroSection />
      <SecondarySection />
      <HistorySection />
    </>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  // Figma sign_in uses shell-type=web_blank — no navbar/footer, full-bleed canvas.
  const isBlank = pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-text-inverse"
      >
        Skip to main content
      </a>
      {!isBlank && <Navbar />}

      <main
        id="main-content"
        className={isBlank ? 'flex-1 w-full' : 'flex-1 max-w-7xl mx-auto w-full px-6 py-12'}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />
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
          <Route
            path="/account"
            element={
              <AuthGuard>
                <AccountPage />
              </AuthGuard>
            }
          />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      {!isBlank && <Footer />}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <TooltipProvider delayDuration={200}>
        <AppShell />
      </TooltipProvider>
    </Router>
  );
}