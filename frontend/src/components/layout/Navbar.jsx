import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { authApi } from '@/services/auth.api';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(window.sessionStorage.getItem('fdc-user') || 'null');
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Converter', href: '/converter' },
    { name: 'History', href: '/history' },
    { name: 'Admin', href: '/admin' },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    setIsMenuOpen(false);
    try {
      setUser(JSON.parse(window.sessionStorage.getItem('fdc-user') || 'null'));
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) setIsMobile(newIsMobile);
      if (newIsMobile && isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen, isMobile]);

  async function handleSignOut() {
    await authApi.logout();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  }

  function isActive(href) {
    return href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-primary/95 backdrop-blur supports-[backdrop-filter]:bg-surface-primary/80">
      <div className="px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3" aria-label="FazalDataConverter home">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-sm" aria-hidden="true">
            FD
          </div>
          <span className="font-semibold text-lg text-text-primary tracking-tight">
            FazalDataConverter
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-1" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive(link.href)
                  ? 'text-brand-primary'
                  : 'text-text-secondary hover:text-brand-primary',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center space-x-3">
          <Button asChild size="small" variant="ghost">
            <Link to="/" className="flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Help</span>
            </Link>
          </Button>
          {user ? (
            <div className="flex items-center space-x-2">
              <Button asChild size="small" variant="outline" className="hidden sm:flex">
                <Link to="/history">
                  <User className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  {user.name || user.email}
                </Link>
              </Button>
              <Button
                size="small"
                variant="ghost"
                onClick={handleSignOut}
                className="hidden sm:flex"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
              <div className="relative">
                <Button size="small" variant="ghost" onClick={toggleMenu} aria-label="Notifications">
                  <Bell className={cn('w-5 h-5', isMenuOpen ? 'text-brand-primary' : 'text-text-muted')} aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="small"
              variant="default"
              className="hidden sm:flex"
              onClick={() => navigate('/login')}
            >
              Sign in
            </Button>
          )}
          <Button
            size="small"
            variant="ghost"
            className={cn('md:hidden', isMenuOpen ? 'text-brand-primary' : 'text-text-muted')}
            aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {isMenuOpen && isMobile && (
        <div id="mobile-menu" className="md:hidden border-t border-border-subtle bg-surface-primary">
          <nav className="px-6 pb-4 pt-2 space-y-2" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive(link.href)
                    ? 'bg-brand-soft text-brand-primary'
                    : 'text-text-primary hover:bg-surface-secondary hover:text-brand-primary',
                )}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-border-subtle pt-3 mt-2 space-y-2">
              {user ? (
                <Button variant="ghost" onClick={handleSignOut} className="w-full text-left">
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <Button variant="default" className="w-full" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}