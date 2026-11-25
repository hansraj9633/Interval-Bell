import React, {useEffect, useRef} from 'react';
import {ReminderAlertModal} from '../components/alerts/ReminderAlertModal';
import {ToastProvider, useToast} from '../components/common/ToastBanner';
import {AppShell} from '../components/layout/AppShell';
import {useSessionRuntime} from '../hooks/useSessionRuntime';
import {useThemeSync} from '../hooks/useThemeSync';
import {ActiveSessionPage} from '../pages/ActiveSession/ActiveSessionPage';
import {HistoryPage} from '../pages/History/HistoryPage';
import {HomePage} from '../pages/Home/HomePage';
import {PresetsPage} from '../pages/Presets/PresetsPage';
import {SessionSetupPage} from '../pages/SessionSetup/SessionSetupPage';
import {SettingsPage} from '../pages/Settings/SettingsPage';
import {SoundLibraryPage} from '../pages/SoundLibrary/SoundLibraryPage';
import {useIntervalBellStore} from '../store/useIntervalBellStore';

const AppContent: React.FC = () => {
  const isInitialized = useIntervalBellStore((s) => s.isInitialized);
  const initialize = useIntervalBellStore((s) => s.initialize);
  const route = useIntervalBellStore((s) => s.route);
  const theme = useIntervalBellStore((s) => s.settings.theme);
  const lastCompletedRecord = useIntervalBellStore((s) => s.lastCompletedRecord);
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const {showToast} = useToast();
  const prevRecordIdRef = useRef<string | null>(null);
  const prevSessionChimeRef = useRef<{id: string; count: number} | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!activeSession) {
      prevSessionChimeRef.current = null;
      return;
    }
    const prev = prevSessionChimeRef.current;
    if (
      prev &&
      prev.id === activeSession.id &&
      activeSession.remindersDelivered > prev.count &&
      (activeSession.alertMode ?? 'once') === 'once'
    ) {
      showToast(`Chime ${activeSession.remindersDelivered} · ${activeSession.name}`);
    }
    prevSessionChimeRef.current = {
      id: activeSession.id,
      count: activeSession.remindersDelivered,
    };
  }, [isInitialized, activeSession, showToast]);

  useEffect(() => {
    if (!isInitialized) return;
    if (lastCompletedRecord && lastCompletedRecord.id !== prevRecordIdRef.current) {
      prevRecordIdRef.current = lastCompletedRecord.id;
      showToast(
        lastCompletedRecord.status === 'completed'
          ? 'Sitting complete. Well done.'
          : 'Session recorded in journal.'
      );
    } else if (!lastCompletedRecord) {
      prevRecordIdRef.current = null;
    }
  }, [isInitialized, lastCompletedRecord, showToast]);

  useThemeSync(theme);
  useSessionRuntime();

  const renderPage = () => {
    switch (route) {
      case 'home':
        return <HomePage />;
      case 'setup':
        return <SessionSetupPage />;
      case 'active':
        return <ActiveSessionPage />;
      case 'sounds':
        return <SoundLibraryPage />;
      case 'presets':
        return <PresetsPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-paper-50 dark:bg-night-950 flex items-center justify-center">
        <span className="font-serif text-lg text-ink-600 dark:text-paper-300">
          Opening Interval Bell&hellip;
        </span>
      </div>
    );
  }

  return (
    <>
      <AppShell>{renderPage()}</AppShell>
      <ReminderAlertModal />
    </>
  );
};

export const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
