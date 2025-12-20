import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now safe to show UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
        aria-label="Toggle theme"
        disabled
      >
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span className="d-none d-md-inline">Loading...</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <>
          <i className="bi bi-sun-fill"></i>
          <span className="d-none d-md-inline">Light</span>
        </>
      ) : (
        <>
          <i className="bi bi-moon-fill"></i>
          <span className="d-none d-md-inline">Dark</span>
        </>
      )}
    </button>
  );
}
