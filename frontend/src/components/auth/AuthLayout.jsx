import { Navbar } from '../layout/Navbar.jsx';
import { Footer } from '../layout/Footer.jsx';

/**
 * Auth layout (Chunk C).
 * Common layout for auth pages (Login, Register, etc).
 */
export function AuthLayout({ children }) {
  return (
    <div>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-primary mb-3">
            FazalDataConverter
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Convert Excel (.xlsx, .xls) to Normal Data JSON or Workbook JSON with metadata,
            and JSON to Excel. Static JS extraction & BSON supported.
          </p>
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}