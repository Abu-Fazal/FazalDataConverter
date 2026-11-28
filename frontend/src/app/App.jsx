import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { ConverterPage } from '../components/converter/ConverterPage.jsx';
import { ConversionProgress } from '../components/converter/ConversionProgress.jsx';
import { ErrorReport } from '../components/converter/ErrorReport.jsx';
import { UserHistory } from '../components/history/UserHistory.jsx';
import { AdminDashboard } from '../components/admin/AdminDashboard.jsx';
import { AdminUsersPage } from '../components/admin/AdminUsersPage.jsx';
import { AdminConversionsPage } from '../components/admin/AdminConversionsPage.jsx';
import { AdminSecurityPage } from '../components/admin/AdminSecurityPage.jsx';
import { AdminSettingsPage } from '../components/admin/AdminSettingsPage.jsx';
import { AdminLockoutPage } from '../components/admin/AdminLockoutPage.jsx';
import { AdminLayout } from '../components/admin/AdminLayout.jsx';
import { AdminGuard } from '../components/admin/AdminGuard.jsx';
import { LoginPage } from '../components/auth/LoginPage.jsx';
import { AuthGuard } from '../components/auth/AuthGuard.jsx';
import { AboutPage } from '../components/about/AboutPage.jsx';
import { AccountPage } from '../components/account/AccountPage.jsx';
import { HeroSection } from '../components/home/HeroSection.jsx';
import { SecondarySection } from '../components/home/SecondarySection.jsx';
import { AnswerSection } from '../components/home/AnswerSection.jsx';
import { ConversionMatrixSection } from '../components/home/ConversionMatrixSection.jsx';
import { FaqSection } from '../components/home/FaqSection.jsx';
import { HistorySection } from '../components/home/HistorySection.jsx';
import { Toaster } from '../components/ui/toaster.jsx';
import { TooltipProvider } from '../components/ui/tooltip.jsx';
import { SeoManager } from '../seo/SeoManager.jsx';

function HomePage() {
  return (
    <>
      <HeroSection />
      <SecondarySection />
      <AnswerSection />
      <ConversionMatrixSection />
      <FaqSection />
      <HistorySection />
    </>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  // Figma sign_in uses shell-type=web_blank — no navbar/footer, full-bleed canvas.
  // The admin console also owns its 100%-height sidebar shell on /admin/*.
  const isBlank = pathname === '/login' || pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <SeoManager />
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
          <Route path="/admin/lockout" element={<AdminLockoutPage />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="conversions" element={<AdminConversionsPage />} />
            <Route path="security" element={<AdminSecurityPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </main>

      {!isBlank && <Footer />}
      <Toaster />
    </div>
  );
}

export function AppProviders({ children }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}

export default function App() {
  return (
    <Router>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </Router>
  );
}