import React, { useState, useEffect, useRef } from 'react';
import { Navbar, KhdhTabId } from './Navbar';
import { DocumentPreview } from './DocumentPreview';
import { PpctManager } from './PpctManager';
import { TkbManager } from './TkbManager';
import { SettingsTab } from './SettingsTab';
import { SchoolConfig, PpctItem, TimetableSlot, LessonPlanRow, ConfiguredClass, UserAccount } from '../types';
import {
  defaultSchoolConfig,
  defaultPpctList,
  defaultTimetable
} from '../data/defaultData';
import {
  saveKhdhDataToFirestore,
  loadKhdhDataFromFirestore,
  subscribeToUserKhdh,
  getSavedSessionUser,
  getUserKhdhStorageKeys
} from '../services/dbService';

const DEFAULT_CONFIGURED_CLASSES: ConfiguredClass[] = [
  { id: 'c-3a1', name: '3A1', grade: 3 },
  { id: 'c-3a2', name: '3A2', grade: 3 },
  { id: 'c-4a1', name: '4A1', grade: 4 },
  { id: 'c-4a2', name: '4A2', grade: 4 },
  { id: 'c-5a1', name: '5A1', grade: 5 },
  { id: 'c-5a2', name: '5A2', grade: 5 },
  { id: 'c-cc', name: 'Chào cờ', grade: 0 },
  { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
];

interface KhdhModuleProps {
  currentUser?: UserAccount | null;
  activeClassName?: string;
}

export const KhdhModule: React.FC<KhdhModuleProps> = ({
  currentUser: propCurrentUser,
  activeClassName
}) => {
  const activeUser = propCurrentUser || getSavedSessionUser();
  const userId = activeUser?.id || 'shared';
  const keys = getUserKhdhStorageKeys(activeUser?.id);

  // Determine effective teacher type: defaults to GVCN for any non-GVBM teacher
  const effectiveTeacherType: 'GVCN' | 'GVBM' =
    activeUser?.teacherType === 'GVBM' ? 'GVBM' : 'GVCN';
  const isGvcn = effectiveTeacherType === 'GVCN';

  // 1. School config state
  const [config, setConfig] = useState<SchoolConfig>(() => {
    try {
      const saved = localStorage.getItem(keys.CONFIG) || localStorage.getItem('khdh_school_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.error('Error loading khdh config:', e);
    }
    return defaultSchoolConfig;
  });

  // 2. PPCT list state
  const [ppctList, setPpctList] = useState<PpctItem[]>(() => {
    try {
      const saved = localStorage.getItem(keys.PPCT) || localStorage.getItem('khdh_ppct_list_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading khdh ppct:', e);
    }
    return defaultPpctList;
  });

  // 3. Timetable state
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem(keys.TIMETABLE) || localStorage.getItem('khdh_timetable_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading khdh timetable:', e);
    }
    return defaultTimetable;
  });

  // 4. Customized weeks state
  const [customizedWeeks, setCustomizedWeeks] = useState<Record<number, LessonPlanRow[]>>(() => {
    try {
      const saved = localStorage.getItem(keys.CUSTOMIZED_WEEKS) || localStorage.getItem('khdh_customized_weeks_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading khdh customized weeks:', e);
    }
    return {};
  });

  // 5. Configured classes state
  const [configuredClasses, setConfiguredClasses] = useState<ConfiguredClass[]>(() => {
    try {
      const saved = localStorage.getItem(keys.CONFIGURED_CLASSES) || localStorage.getItem('khdh_configured_classes_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading configured classes:', e);
    }
    return DEFAULT_CONFIGURED_CLASSES;
  });

  // 6. Active Tab
  const [activeTab, setActiveTab] = useState<KhdhTabId>(() => {
    try {
      const saved = localStorage.getItem(keys.ACTIVE_TAB) || localStorage.getItem('khdh_active_tab_v1');
      if (saved && ['document', 'ppct', 'tkb', 'settings'].includes(saved)) {
        return saved as KhdhTabId;
      }
    } catch {}
    return 'document';
  });

  useEffect(() => {
    const handleCustomTabChange = (e: any) => {
      if (e.detail && ['document', 'ppct', 'tkb', 'settings'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('khdh_change_tab', handleCustomTabChange);
    return () => window.removeEventListener('khdh_change_tab', handleCustomTabChange);
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('khdh_tab_updated', { detail: activeTab }));
    } catch {}
  }, [activeTab]);

  // Safety references to prevent race condition overwriting
  const isCloudLoadedRef = useRef<boolean>(false);
  const isRemoteKhdhSyncingRef = useRef<boolean>(false);

  // Load from Firestore whenever currentUser changes or on initial mount
  useEffect(() => {
    let active = true;
    async function loadFromCloud() {
      const currentUserId = activeUser?.id || 'shared';
      const userKeys = getUserKhdhStorageKeys(activeUser?.id);

      // Fast sync with user local storage cache first
      try {
        const savedCfg = localStorage.getItem(userKeys.CONFIG);
        if (savedCfg && active) setConfig(JSON.parse(savedCfg));
        const savedPpct = localStorage.getItem(userKeys.PPCT);
        if (savedPpct && active) setPpctList(JSON.parse(savedPpct));
        const savedTkb = localStorage.getItem(userKeys.TIMETABLE);
        if (savedTkb && active) setTimetable(JSON.parse(savedTkb));
        const savedWeeks = localStorage.getItem(userKeys.CUSTOMIZED_WEEKS);
        if (savedWeeks && active) setCustomizedWeeks(JSON.parse(savedWeeks));
        const savedCls = localStorage.getItem(userKeys.CONFIGURED_CLASSES);
        if (savedCls && active) setConfiguredClasses(JSON.parse(savedCls));
      } catch (err) {
        console.warn('Local storage parse on user switch:', err);
      }

      // Fetch cloud state from Firestore directly
      try {
        const cloudData = await loadKhdhDataFromFirestore(currentUserId);
        if (cloudData && active) {
          if (cloudData.config) {
            setConfig(cloudData.config);
            localStorage.setItem(userKeys.CONFIG, JSON.stringify(cloudData.config));
          }
          if (cloudData.ppctList) {
            setPpctList(cloudData.ppctList);
            localStorage.setItem(userKeys.PPCT, JSON.stringify(cloudData.ppctList));
          }
          if (cloudData.timetable) {
            setTimetable(cloudData.timetable);
            localStorage.setItem(userKeys.TIMETABLE, JSON.stringify(cloudData.timetable));
          }
          if (cloudData.customizedWeeks) {
            setCustomizedWeeks(cloudData.customizedWeeks);
            localStorage.setItem(userKeys.CUSTOMIZED_WEEKS, JSON.stringify(cloudData.customizedWeeks));
          }
          if (cloudData.configuredClasses && Array.isArray(cloudData.configuredClasses)) {
            setConfiguredClasses(cloudData.configuredClasses);
            localStorage.setItem(userKeys.CONFIGURED_CLASSES, JSON.stringify(cloudData.configuredClasses));
          }
        }
      } catch (err) {
        console.warn('Error loading KHDH cloud data:', err);
      } finally {
        if (active) {
          isCloudLoadedRef.current = true;
        }
      }
    }

    loadFromCloud();
    return () => {
      active = false;
    };
  }, [activeUser?.id]);

  // Live synchronization of KHDH across browsers/devices via Firestore onSnapshot
  useEffect(() => {
    const currentUserId = activeUser?.id || 'shared';
    const unsubscribe = subscribeToUserKhdh(currentUserId, (remoteData) => {
      if (remoteData) {
        isRemoteKhdhSyncingRef.current = true;
        if (remoteData.config) setConfig(remoteData.config);
        if (remoteData.ppctList) setPpctList(remoteData.ppctList);
        if (remoteData.timetable) setTimetable(remoteData.timetable);
        if (remoteData.customizedWeeks) setCustomizedWeeks(remoteData.customizedWeeks);
        if (remoteData.configuredClasses && Array.isArray(remoteData.configuredClasses)) {
          setConfiguredClasses(remoteData.configuredClasses);
        }
      }
    });

    return () => unsubscribe();
  }, [activeUser?.id]);

  // Save to localStorage & Firestore with debouncing
  useEffect(() => {
    // CRITICAL: Do NOT write to Firestore before cloud data has been loaded for this user
    if (!isCloudLoadedRef.current) return;

    // Do NOT echo-save if update was received from remote subscription
    if (isRemoteKhdhSyncingRef.current) {
      isRemoteKhdhSyncingRef.current = false;
      return;
    }

    const userKeys = getUserKhdhStorageKeys(activeUser?.id);
    try {
      localStorage.setItem(userKeys.CONFIG, JSON.stringify(config));
      localStorage.setItem(userKeys.PPCT, JSON.stringify(ppctList));
      localStorage.setItem(userKeys.TIMETABLE, JSON.stringify(timetable));
      localStorage.setItem(userKeys.CUSTOMIZED_WEEKS, JSON.stringify(customizedWeeks));
      localStorage.setItem(userKeys.CONFIGURED_CLASSES, JSON.stringify(configuredClasses));
    } catch (e) {
      console.warn('Error saving KHDH local cache:', e);
    }

    // Ultra-fast auto-save to Firestore (150ms)
    const timer = setTimeout(() => {
      saveKhdhDataToFirestore(activeUser?.id || 'shared', {
        config,
        ppctList,
        timetable,
        customizedWeeks,
        configuredClasses
      }).catch((err) => console.warn('Error saving KHDH to Firestore:', err));
    }, 150);

    return () => clearTimeout(timer);
  }, [config, ppctList, timetable, customizedWeeks, configuredClasses, activeUser?.id]);

  // Flush KHDH data to Firestore on page unload or visibility change
  useEffect(() => {
    const flushKhdh = () => {
      saveKhdhDataToFirestore(activeUser?.id || 'shared', {
        config,
        ppctList,
        timetable,
        customizedWeeks,
        configuredClasses
      }).catch(console.warn);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushKhdh();
      }
    };

    window.addEventListener('beforeunload', flushKhdh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', flushKhdh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [config, ppctList, timetable, customizedWeeks, configuredClasses, activeUser?.id]);

  const handleTabChange = (tab: KhdhTabId) => {
    setActiveTab(tab);
    try {
      const userKeys = getUserKhdhStorageKeys(activeUser?.id);
      localStorage.setItem(userKeys.ACTIVE_TAB, tab);
    } catch {}
  };

  const handleSaveWeekRows = (weekNumber: number, rows: LessonPlanRow[]) => {
    setCustomizedWeeks((prev) => ({
      ...prev,
      [weekNumber]: rows
    }));
  };

  const handleResetWeekRows = (weekNumber: number) => {
    setCustomizedWeeks((prev) => {
      const updated = { ...prev };
      delete updated[weekNumber];
      return updated;
    });
  };

  const handleResetPpct = () => {
    setPpctList(defaultPpctList);
  };

  const handleResetTimetable = () => {
    setTimetable(defaultTimetable);
  };

  const handleResetConfig = () => {
    setConfig(defaultSchoolConfig);
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-50/50">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        title={
          isGvcn
            ? (config.documentTitle === 'KẾ HOẠCH DẠY HỌC' || !config.documentTitle ? 'LỊCH BÁO GIẢNG GVCN' : config.documentTitle)
            : (config.documentTitle || 'KẾ HOẠCH DẠY HỌC (GVBM)')
        }
        academicYear={config.academicYear || '2026 - 2027'}
        teacherType={effectiveTeacherType}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 lg:p-6">
        {activeTab === 'document' && (
          <DocumentPreview
            config={config}
            ppctList={ppctList}
            timetable={timetable}
            customizedWeeks={customizedWeeks}
            onSaveWeekRows={handleSaveWeekRows}
            onResetWeekRows={handleResetWeekRows}
            onUpdateConfig={setConfig}
            teacherType={effectiveTeacherType}
          />
        )}

        {activeTab === 'ppct' && (
          <PpctManager
            ppctList={ppctList}
            onUpdatePpctList={setPpctList}
            onResetPpctList={handleResetPpct}
            teacherType={effectiveTeacherType}
          />
        )}

        {activeTab === 'tkb' && (
          <TkbManager
            timetable={timetable}
            onUpdateTimetable={setTimetable}
            onResetTimetable={handleResetTimetable}
            configuredClasses={configuredClasses}
            onUpdateConfiguredClasses={setConfiguredClasses}
            teacherType={effectiveTeacherType}
            activeClassName={activeClassName || configuredClasses[0]?.name || '3A1'}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            config={config}
            onUpdateConfig={setConfig}
            onResetConfig={handleResetConfig}
            currentUser={activeUser}
          />
        )}
      </main>
    </div>
  );
};
