import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getRemainingMs} from '../../engines/session-engine/SessionEngine';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {AppRoute} from '../../types';
import {formatDurationHMS} from '../../utils/time';
import {OfflineNoticeBanner} from '../common/PWAInstallButton';

interface AppShellProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 288;

const NAV_ITEMS: Array<{route: AppRoute; label: string}> = [
  {route: 'home', label: 'Sanctuary'},
  {route: 'setup', label: 'New Session'},
  {route: 'presets', label: 'Rituals'},
  {route: 'sounds', label: 'Acoustics'},
  {route: 'history', label: 'Journal'},
  {route: 'settings', label: 'Preferences'},
];

function renderNavIcon(route: AppRoute) {
  switch (route) {
    case 'home':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'setup':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'presets':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'sounds':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'history':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export const AppShell: React.FC<AppShellProps> = ({children}) => {
  const route = useIntervalBellStore((s) => s.route);
  const setRoute = useIntervalBellStore((s) => s.setRoute);
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const lastCompletedRecord = useIntervalBellStore((s) => s.lastCompletedRecord);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragTranslateX, setDragTranslateX] = useState<number | null>(null);

  const gestureRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    axis: 'pending' | 'horizontal' | 'vertical';
    wasOpenAtStart: boolean;
    lastDx: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    axis: 'pending',
    wasOpenAtStart: false,
    lastDx: 0,
  });

  const isFullscreenFocus = route === 'active' && Boolean(activeSession);

  const navigateTo = useCallback(
    (target: AppRoute) => {
      setRoute(target);
      setDrawerOpen(false);
      setDragTranslateX(null);
    },
    [setRoute]
  );

  // Close drawer on Escape or resize to desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
        setDragTranslateX(null);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setDrawerOpen(false);
        setDragTranslateX(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [drawerOpen]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const shouldIgnoreSwipeTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('input, textarea, select, option, [data-no-swipe="true"]')
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    if (isFullscreenFocus) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (shouldIgnoreSwipeTarget(e.target)) return;

    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      axis: 'pending',
      wasOpenAtStart: drawerOpen,
      lastDx: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.lastDx = dx;

    if (g.axis === 'pending') {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dy) >= Math.abs(dx) * 0.9) {
        g.axis = 'vertical';
        g.active = false;
        return;
      }
      // Require stronger intentional rightward drag when using mouse
      if (e.pointerType === 'mouse' && Math.abs(dx) < 18) return;

      if (!g.wasOpenAtStart && dx <= 0) {
        g.axis = 'vertical';
        g.active = false;
        return;
      }
      if (g.wasOpenAtStart && dx >= 0) {
        g.axis = 'vertical';
        g.active = false;
        return;
      }
      g.axis = 'horizontal';
    }

    if (g.axis === 'horizontal') {
      if (!g.wasOpenAtStart) {
        const clamped = Math.min(0, Math.max(-DRAWER_WIDTH, -DRAWER_WIDTH + Math.max(0, dx)));
        setDragTranslateX(clamped);
      } else {
        const clamped = Math.min(0, Math.max(-DRAWER_WIDTH, Math.min(0, dx)));
        setDragTranslateX(clamped);
      }
    }
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const elapsedMs = Math.max(1, Date.now() - g.startTime);
    const velocity = Math.abs(dx) / elapsedMs;

    if (g.axis === 'horizontal') {
      if (!g.wasOpenAtStart) {
        const shouldOpen = dx > 68 || (dx > 32 && velocity > 0.35);
        setDrawerOpen(shouldOpen);
      } else {
        const shouldClose = dx < -60 || (dx < -28 && velocity > 0.35);
        setDrawerOpen(!shouldClose);
      }
    }

    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    setDragTranslateX(null);
  };

  const remainingLabel = activeSession
    ? formatDurationHMS(Math.ceil(getRemainingMs(activeSession) / 1000))
    : null;

  const isDragging = dragTranslateX !== null;
  const drawerVisible = drawerOpen || isDragging;
  const computedTranslateX = isDragging ? dragTranslateX : drawerOpen ? 0 : -DRAWER_WIDTH;
  const backdropOpacity = isDragging
    ? Math.max(0, Math.min(1, 1 + dragTranslateX / DRAWER_WIDTH))
    : drawerOpen
    ? 1
    : 0;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      className={`min-h-screen w-full flex flex-col touch-pan-y ${
        isDragging ? 'select-none' : ''
      }`}
    >
      {/* Top Sanctuary Navigation */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-paper-50/85 dark:bg-night-950/85 border-b border-paper-200/70 dark:border-night-800/80 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              className="md:hidden p-2 -ml-1.5 rounded-full text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-night-800 transition-colors shrink-0"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
              >
                <path d="M4 7h16M4 12h12M4 17h16" />
              </svg>
            </button>

            {/* Bespoke Architectural Brand Identity */}
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="flex items-center gap-3 text-left group focus:outline-none shrink-0"
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-moss-700 to-moss-800 dark:from-moss-800 dark:to-night-900 text-paper-50 flex items-center justify-center shadow-soft border border-moss-700/20 dark:border-paper-100/10 group-hover:scale-[1.03] transition-all duration-300 shrink-0">
                <div className="absolute inset-[2px] rounded-[14px] border border-paper-50/15 pointer-events-none" />
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9.5 7.5C12.2 5.4 15.8 5.4 18.5 7.5"
                    stroke="#E4ECE8"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                  <path
                    d="M11.5 10C13.1 8.8 14.9 8.8 16.5 10"
                    stroke="#C46D4E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5.5 13.5H22.5C22.5 18.4 18.7 21.8 14 21.8C9.3 21.8 5.5 18.4 5.5 13.5Z"
                    fill="#FAF8F5"
                    fillOpacity="0.12"
                    stroke="#FAF8F5"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 11.2L23.5 8.5"
                    stroke="#C46D4E"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="18.2" cy="11.4" r="1.3" fill="#FAF8F5" />
                  <path
                    d="M10.5 23.5H17.5"
                    stroke="#FAF8F5"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="opacity-80"
                  />
                </svg>
              </div>

              <div className="flex flex-col justify-center">
                <span className="font-brand text-[21px] sm:text-[24px] font-semibold tracking-[-0.015em] text-ink-900 dark:text-paper-50 leading-none whitespace-nowrap">
                  Interval{' '}
                  <span className="italic font-medium text-moss-700 dark:text-emerald-400">
                    Bell
                  </span>
                </span>
                <span className="text-[8.5px] sm:text-[9px] uppercase tracking-[0.18em] text-ink-400 dark:text-paper-300/60 font-medium mt-1 sm:mt-1.5 whitespace-nowrap">
                  Pause &middot; Refocus &middot; Continue
                </span>
              </div>
            </button>
          </div>

          {/* Floating Pill Navigation (Desktop / Tablet >= 768px) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center bg-paper-100/90 dark:bg-night-900 p-1.5 rounded-full border border-paper-200/80 dark:border-night-800 shadow-soft shrink-0"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigateTo(item.route)}
                  className={`px-3 lg:px-4 py-1.5 rounded-full text-xs lg:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-paper-50 dark:bg-night-800 text-ink-900 dark:text-paper-50 shadow-soft'
                      : 'text-ink-600 dark:text-paper-300/70 hover:text-ink-900 dark:hover:text-paper-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Active Session Quick Return Pill (when active/completed) */}
          {(activeSession || lastCompletedRecord) && (
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => navigateTo('active')}
                className="px-3 py-1.5 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 font-mono text-xs tabular-nums whitespace-nowrap transition-colors shadow-soft"
                title="Return to Focus Sanctuary"
              >
                {remainingLabel ?? 'Summary'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Left Slide-Out Navigation Drawer (< 768px) */}
      <div
        className={`md:hidden fixed inset-0 z-50 ${
          drawerVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => {
            setDrawerOpen(false);
            setDragTranslateX(null);
          }}
          style={{opacity: backdropOpacity}}
          className={`fixed inset-0 bg-night-950/35 dark:bg-black/60 backdrop-blur-[2px] ${
            isDragging ? '' : 'transition-opacity duration-300'
          }`}
        />

        {/* Left Drawer Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Sanctuary navigation"
          style={{
            width: `${DRAWER_WIDTH}px`,
            transform: `translate3d(${computedTranslateX}px, 0, 0)`,
          }}
          className={`fixed top-0 bottom-0 left-0 max-w-[82vw] bg-paper-50 dark:bg-night-950 border-r border-paper-200/80 dark:border-night-800 shadow-lifted flex flex-col justify-between p-6 ${
            isDragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'
          }`}
        >
          <div className="space-y-8">
            {/* Drawer Brand Header & Close Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-moss-700 to-moss-800 dark:from-moss-800 dark:to-night-900 text-paper-50 flex items-center justify-center shadow-soft border border-moss-700/20 dark:border-paper-100/10 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <path
                      d="M9.5 7.5C12.2 5.4 15.8 5.4 18.5 7.5"
                      stroke="#E4ECE8"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.5 10C13.1 8.8 14.9 8.8 16.5 10"
                      stroke="#C46D4E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5.5 13.5H22.5C22.5 18.4 18.7 21.8 14 21.8C9.3 21.8 5.5 18.4 5.5 13.5Z"
                      fill="#FAF8F5"
                      fillOpacity="0.12"
                      stroke="#FAF8F5"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.5 11.2L23.5 8.5"
                      stroke="#C46D4E"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="18.2" cy="11.4" r="1.3" fill="#FAF8F5" />
                    <path
                      d="M10.5 23.5H17.5"
                      stroke="#FAF8F5"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-brand text-[21px] font-semibold tracking-[-0.015em] text-ink-900 dark:text-paper-50 leading-none">
                    Interval{' '}
                    <span className="italic font-medium text-moss-700 dark:text-emerald-400">
                      Bell
                    </span>
                  </span>
                  <span className="text-[8.5px] uppercase tracking-[0.16em] text-ink-400 font-medium mt-1">
                    Sanctuary Menu
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-full text-ink-400 hover:text-ink-900 dark:hover:text-paper-100 hover:bg-paper-100 dark:hover:bg-night-800 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Active Session Quick Return inside Drawer */}
            {activeSession && (
              <button
                type="button"
                onClick={() => navigateTo('active')}
                className="w-full rounded-2xl bg-moss-100/80 dark:bg-moss-800/35 border border-moss-700/30 p-3.5 flex items-center justify-between text-left"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase tracking-wider text-moss-700 dark:text-emerald-400 font-medium block">
                    {activeSession.status === 'paused' ? 'Paused Sitting' : 'Active Sitting'}
                  </span>
                  <span className="text-xs font-medium text-ink-900 dark:text-paper-50 truncate block">
                    {activeSession.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-moss-700 dark:text-emerald-400 font-medium tabular-nums shrink-0">
                  {remainingLabel}
                </span>
              </button>
            )}

            {/* Navigation Items */}
            <nav aria-label="Mobile navigation" className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = route === item.route;
                const isSettings = item.route === 'settings';
                return (
                  <div
                    key={item.route}
                    className={
                      isSettings
                        ? 'pt-2 mt-2 border-t border-paper-200/70 dark:border-night-800'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => navigateTo(item.route)}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-paper-100 dark:bg-night-900 text-ink-900 dark:text-paper-50 shadow-soft border border-paper-200/80 dark:border-night-800'
                          : 'text-ink-600 dark:text-paper-300/80 hover:bg-paper-100/60 dark:hover:bg-night-900/60'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            isActive
                              ? 'text-moss-700 dark:text-emerald-400'
                              : 'text-ink-400'
                          }
                        >
                          {renderNavIcon(item.route)}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer */}
          <div className="pt-4 border-t border-paper-200/70 dark:border-night-800 text-[11px] text-ink-400">
            <span>100% offline &middot; stored locally</span>
          </div>
        </aside>
      </div>

      <OfflineNoticeBanner />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
};
