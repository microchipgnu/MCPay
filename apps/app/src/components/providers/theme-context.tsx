"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state based on what the blocking script set
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Sync state with what was set by the blocking script
    const savedTheme = localStorage.getItem("mcp-browser-theme");
    let initialIsDark: boolean;

    if (savedTheme === "dark" || savedTheme === "light") {
      // Use saved preference
      initialIsDark = savedTheme === "dark";
    } else {
      // Use system preference if no saved preference
      initialIsDark = getSystemPreference();
    }

    // Only update if different (to avoid unnecessary re-renders)
    if (initialIsDark !== isDark) {
      setIsDark(initialIsDark);
    }
    
    // Ensure class is set (should already be set by blocking script, but ensure consistency)
    if (initialIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system preference changes (only if no manual override)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      if (!localStorage.getItem("mcp-browser-theme")) {
        const systemIsDark = e.matches;
        setIsDark(systemIsDark);
        if (systemIsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    setIsDark(prevIsDark => {
      const newIsDark = !prevIsDark;
      localStorage.setItem("mcp-browser-theme", newIsDark ? "dark" : "light");
      if (newIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newIsDark;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 