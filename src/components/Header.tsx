import React, { useState } from 'react';
import { ActiveTab } from '../types/claim';
import {
  Menu,
  X,
  Search,
  ArrowRight,
  GitBranch,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLaunchDemo?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onLaunchDemo,
  theme,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home' },
    { id: 'architecture' as ActiveTab, label: 'Forensic Architecture' },
    { id: 'history' as ActiveTab, label: 'Investigation History' },
    { id: 'how-it-works' as ActiveTab, label: 'How It Works' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group transition-transform hover:scale-[1.01]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F46E5] text-white shadow-sm shadow-indigo-500/25 group-hover:bg-[#4338CA] transition-colors">
              <GitBranch className="h-5 w-5 rotate-90" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-[#111827] dark:text-white">
                  EchoTrace
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                  Forensics
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#6B7280] dark:text-gray-400 leading-none mt-0.5 hidden sm:block">
                Claim Intelligence & Lineage System
              </p>
            </div>
          </button>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'architecture' && activeTab === 'architecture');

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#4F46E5] dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/70 font-bold'
                      : 'text-[#4B5563] dark:text-gray-300 hover:text-[#111827] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Action: Theme Toggle & Analyze Claim Primary Button */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111622] text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer shadow-2xs"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
            aria-label="Toggle light and dark theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analyze')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 hover:bg-[#4338CA] transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Analyze Claim</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile Buttons */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111622] text-gray-700 dark:text-gray-200"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('analyze')}
            className="px-3 py-1.5 rounded-lg bg-[#4F46E5] text-xs font-bold text-white shadow-2xs"
          >
            Analyze
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                activeTab === item.id
                  ? 'text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-500">Theme</span>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono"
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5 text-indigo-600" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setActiveTab('analyze');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4F46E5] text-xs font-bold text-white"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Launch Claim Analysis</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
