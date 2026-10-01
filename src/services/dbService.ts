import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  UserAccount,
  AppState,
  ClassInfo,
  Student,
  SchoolConfig,
  PpctItem,
  TimetableSlot,
  LessonPlanRow,
  DetailedLessonPlan,
  ConfiguredClass,
  ContactInfo
} from '../types';
import { getDefaultState, getDefaultStateForUser } from '../utils/helpers';

// Operation types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_USERS_KEY = 'lopHoc_system_users_v1';
const CURRENT_USER_SESSION_KEY = 'lopHoc_current_user_session';

export const INITIAL_DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@lophoc.edu.vn',
    name: 'Quản Trị Viên Hệ Thống',
    role: 'admin',
    password: 'admin123',
    subject: 'Quản trị hệ thống',
    school: 'Trường TH Thạnh Yên 1',
    status: 'active',
    note: 'Tài khoản Quản trị viên cấp cao toàn quyền quản lý tài khoản giáo viên và hệ thống.',
    createdAt: new Date().toISOString()
  }
];

// Helper to get local cached users
export function getLocalCachedUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local users cache', e);
  }
  return INITIAL_DEFAULT_USERS;
}

// Helper to save local cached users
export function setLocalCachedUsers(users: UserAccount[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error writing local users cache', e);
  }
}

/**
 * Fetch all user accounts from Firestore.
 * If database is empty, seed default accounts.
 */
export async function fetchUsersFromFirestore(): Promise<UserAccount[]> {
  const usersCol = collection(db, 'users');
  try {
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
      console.log('No users found in Firestore. Seeding default accounts...');
      // Seed default accounts to Firestore
      for (const u of INITIAL_DEFAULT_USERS) {
        await setDoc(doc(db, 'users', u.id), u);
      }
      setLocalCachedUsers(INITIAL_DEFAULT_USERS);
      return INITIAL_DEFAULT_USERS;
    }

    const list: UserAccount[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as UserAccount);
    });

    // Make sure admin exists
    const hasAdmin = list.some((u) => u.role === 'admin');
    if (!hasAdmin) {
      const adminAcc = INITIAL_DEFAULT_USERS[0];
      await setDoc(doc(db, 'users', adminAcc.id), adminAcc);
      list.unshift(adminAcc);
    }

    setLocalCachedUsers(list);
    return list;
  } catch (err: any) {
    // If it's a connection or offline error, use local cache silently with a helpful log
    if (err?.code === 'unavailable' || err?.message?.includes('unavailable') || err?.message?.includes('offline') || err?.code === 'failed-precondition') {
      console.warn('Firestore is currently operating offline/unavailable, using local cache.');
      return getLocalCachedUsers();
    }
    
    // Otherwise log and fallback
    console.warn('Firestore fetch users notice:', err?.message || err);
    return getLocalCachedUsers();
  }
}

/**
 * Create or update a user in Firestore
 */
export async function saveUserToFirestore(user: UserAccount): Promise<boolean> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), user);
    // Update local cache
    const currentList = getLocalCachedUsers();
    const idx = currentList.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      currentList[idx] = user;
    } else {
      currentList.push(user);
    }
    setLocalCachedUsers(currentList);
    return true;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('unavailable') || err?.message?.includes('offline')) {
      console.warn('Firestore unavailable, saved to local cache only.');
      return false;
    }
    console.warn('Save user Firestore notice:', err?.message || err);
    return false;
  }
}

/**
 * Delete a user from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'users', userId));
    const currentList = getLocalCachedUsers().filter((u) => u.id !== userId);
    setLocalCachedUsers(currentList);
    return true;
  } catch (err) {
    console.error('Failed to delete user from Firestore:', err);
    const currentList = getLocalCachedUsers().filter((u) => u.id !== userId);
    setLocalCachedUsers(currentList);
    return false;
  }
}

/**
 * Get unique workspace document key for a user
 */
export function getUserWorkspaceKey(user?: UserAccount | null | string): string {
  if (!user) return 'workspace_guest';
  const userId = typeof user === 'string' ? user : user.id;
  return `workspace_${userId}`;
}

/**
 * Helper to recursively sanitize and clean data for Firestore:
 * 1. Strips all `undefined` properties (Firestore setDoc strictly throws if any property is undefined)
 * 2. Strips empty string keys (Firestore disallows empty string keys in maps)
 * 3. Converts NaN to 0
 */
export function sanitizeFirestoreData(data: any): any {
  if (data === undefined || data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data
      .map(sanitizeFirestoreData)
      .filter((item) => item !== undefined);
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const key in data) {
      if (key === '' || data[key] === undefined) {
        continue;
      }
      const val = sanitizeFirestoreData(data[key]);
      if (val !== undefined) {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  if (typeof data === 'number' && isNaN(data)) {
    return 0;
  }

  return data;
}

/**
 * Safely optimize AppState object to guarantee JSON size stays well below
 * Firestore's strict 1MB (1,048,576 bytes) document size limit.
 */
export function prepareOptimizedWorkspacePayload(state: AppState): AppState {
  if (!state) return state;

  const cloned: AppState = JSON.parse(JSON.stringify(state));

  // 1. Cap long history logs to prevent unbounded document size growth over time
  if (Array.isArray(cloned.transactions) && cloned.transactions.length > 50) {
    cloned.transactions = cloned.transactions.slice(0, 50);
  }
  if (Array.isArray(cloned.wheelHistory) && cloned.wheelHistory.length > 25) {
    cloned.wheelHistory = cloned.wheelHistory.slice(0, 25);
  }
  if (Array.isArray(cloned.filmHistory) && cloned.filmHistory.length > 25) {
    cloned.filmHistory = cloned.filmHistory.slice(0, 25);
  }
  if (Array.isArray(cloned.redemptions) && cloned.redemptions.length > 30) {
    cloned.redemptions = cloned.redemptions.slice(0, 30);
  }
  if (Array.isArray(cloned.worksheets) && cloned.worksheets.length > 15) {
    cloned.worksheets = cloned.worksheets.slice(0, 15);
  }

  // 2. Clear / strip oversized base64 images (> 12KB) in student avatars, teacher avatar, class banners, and rewards
  if (Array.isArray(cloned.students)) {
    cloned.students = cloned.students.map((s: Student) => {
      if (s.avatar && typeof s.avatar === 'string' && s.avatar.startsWith('data:') && s.avatar.length > 12000) {
        // Clear oversized base64 strings so student defaults to vibrant SVG avatar icon
        return { ...s, avatar: '' };
      }
      return s;
    });
  }

  if (cloned.teacher?.avatar && typeof cloned.teacher.avatar === 'string' && cloned.teacher.avatar.startsWith('data:') && cloned.teacher.avatar.length > 20000) {
    cloned.teacher.avatar = '';
  }

  if (Array.isArray(cloned.classes)) {
    cloned.classes = cloned.classes.map((c) => {
      if (c.bannerUrl && typeof c.bannerUrl === 'string' && c.bannerUrl.startsWith('data:') && c.bannerUrl.length > 25000) {
        return { ...c, bannerUrl: '' };
      }
      return c;
    });
  }

  if (Array.isArray(cloned.rewards)) {
    cloned.rewards = cloned.rewards.map((r) => {
      if (r.image && typeof r.image === 'string' && r.image.startsWith('data:') && r.image.length > 15000) {
        return { ...r, image: '' };
      }
      return r;
    });
  }

  // 3. FAILSAFE SIZE GUARANTEE LOOP (Guarantees JSON payload string length is strictly under 500,000 bytes!)
  let jsonString = JSON.stringify(cloned);

  if (jsonString.length > 500000) {
    // Stage 1: Strip ALL data: base64 images in student avatars
    if (Array.isArray(cloned.students)) {
      cloned.students = cloned.students.map((s) =>
        s.avatar?.startsWith('data:') ? { ...s, avatar: '' } : s
      );
    }
    jsonString = JSON.stringify(cloned);
  }

  if (jsonString.length > 500000) {
    // Stage 2: Aggressively trim transactions & history logs to 15 items
    if (Array.isArray(cloned.transactions)) cloned.transactions = cloned.transactions.slice(0, 15);
    if (Array.isArray(cloned.wheelHistory)) cloned.wheelHistory = cloned.wheelHistory.slice(0, 10);
    if (Array.isArray(cloned.filmHistory)) cloned.filmHistory = cloned.filmHistory.slice(0, 10);
    if (Array.isArray(cloned.redemptions)) cloned.redemptions = cloned.redemptions.slice(0, 10);
    if (Array.isArray(cloned.worksheets)) cloned.worksheets = cloned.worksheets.slice(0, 5);
    jsonString = JSON.stringify(cloned);
  }

  if (jsonString.length > 500000) {
    // Stage 3: Trim quizQuestions if > 40 questions
    if (Array.isArray(cloned.quizQuestions) && cloned.quizQuestions.length > 40) {
      cloned.quizQuestions = cloned.quizQuestions.slice(0, 40);
    }
    jsonString = JSON.stringify(cloned);
  }

  return cloned;
}

/**
 * Save Classroom App State to Firestore in isolated workspace
 * Also creates/updates dedicated classes_data backup
 */
export async function saveAppStateToFirestore(
  key: string,
  state: AppState,
  meta?: { userId?: string; teacherName?: string; role?: string }
): Promise<boolean> {
  const path = `workspaces/${key}`;
  const nowIso = new Date().toISOString();
  const userId = meta?.userId || state.ownerUserId || '';

  try {
    const docRef = doc(db, 'workspaces', key);
    const stateToSave = prepareOptimizedWorkspacePayload({
      ...state,
      ownerUserId: userId,
      ownerName: meta?.teacherName || state.ownerName || state.teacher?.name || '',
      updatedAt: nowIso
    });

    const sanitizedState = sanitizeFirestoreData(stateToSave);
    
    try {
      await setDoc(docRef, sanitizedState);
    } catch (primaryErr: any) {
      // Emergency retry: If document size or write limit error occurred, force strip all data URLs
      if (
        primaryErr?.message?.includes('size') ||
        primaryErr?.message?.includes('exceeds') ||
        primaryErr?.code === 'invalid-argument'
      ) {
        console.warn('Primary setDoc size error, attempting emergency ultra-pruning retry...');
        const emergencyCloned = JSON.parse(JSON.stringify(stateToSave));
        if (Array.isArray(emergencyCloned.students)) {
          emergencyCloned.students = emergencyCloned.students.map((s: any) => ({
            ...s,
            avatar: s.avatar?.startsWith('data:') ? '' : s.avatar
          }));
        }
        if (Array.isArray(emergencyCloned.transactions)) {
          emergencyCloned.transactions = emergencyCloned.transactions.slice(0, 10);
        }
        if (Array.isArray(emergencyCloned.wheelHistory)) {
          emergencyCloned.wheelHistory = emergencyCloned.wheelHistory.slice(0, 5);
        }
        if (Array.isArray(emergencyCloned.filmHistory)) {
          emergencyCloned.filmHistory = emergencyCloned.filmHistory.slice(0, 5);
        }
        const emergencySanitized = sanitizeFirestoreData(emergencyCloned);
        await setDoc(docRef, emergencySanitized);
      } else {
        throw primaryErr;
      }
    }

    // Concurrently maintain a lightweight, dedicated backup for classes and students
    if (userId) {
      try {
        const classesDocRef = doc(db, 'classes_data', userId);
        const optimizedStudents = Array.isArray(state.students)
          ? state.students.map((s) => {
              if (s.avatar && typeof s.avatar === 'string' && s.avatar.startsWith('data:') && s.avatar.length > 12000) {
                return { ...s, avatar: '' };
              }
              return s;
            })
          : [];

        await setDoc(classesDocRef, {
          userId,
          ownerName: meta?.teacherName || state.ownerName || state.teacher?.name || '',
          classes: sanitizeFirestoreData(state.classes || []),
          students: sanitizeFirestoreData(optimizedStudents),
          updatedAt: nowIso
        });
      } catch (backupErr) {
        console.warn('Dedicated classes_data backup notice:', backupErr);
      }
    }

    return true;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('unavailable') || err?.message?.includes('offline')) {
      console.warn('Firestore unavailable, state saved to local cache.');
      return false;
    }
    console.error('Save app state Firestore error:', err?.message || err);
    return false;
  }
}

/**
 * Direct helper to instantly save Classes & Students to Firebase
 */
export async function syncClassesAndStudentsToFirestore(
  userId: string,
  classes: ClassInfo[],
  students: Student[],
  meta?: { teacherName?: string }
): Promise<boolean> {
  if (!userId) return false;
  const nowIso = new Date().toISOString();

  try {
    // 1. Save to dedicated classes_data collection
    const classesDocRef = doc(db, 'classes_data', userId);
    await setDoc(classesDocRef, {
      userId,
      ownerName: meta?.teacherName || '',
      classes: sanitizeFirestoreData(classes || []),
      students: sanitizeFirestoreData(students || []),
      updatedAt: nowIso
    });

    // 2. Also update in teacher's workspace if it exists
    const wsKey = `workspace_${userId}`;
    const wsDocRef = doc(db, 'workspaces', wsKey);
    const snap = await getDoc(wsDocRef);
    if (snap.exists()) {
      const existing = snap.data();
      await setDoc(wsDocRef, {
        ...existing,
        classes: sanitizeFirestoreData(classes || []),
        students: sanitizeFirestoreData(students || []),
        updatedAt: nowIso
      });
    }

    return true;
  } catch (err) {
    console.error('Direct syncClassesAndStudentsToFirestore error:', err);
    return false;
  }
}

/**
 * Load Classroom App State from Firestore in isolated workspace
 * With automatic recovery of classes and students from classes_data if needed
 */
export async function loadAppStateFromFirestore(
  key: string,
  user?: UserAccount | null
): Promise<AppState | null> {
  try {
    let cloudState: AppState | null = null;

    // 1. Try loading from isolated workspaces collection
    const docRef = doc(db, 'workspaces', key);
    const snap = await getDoc(docRef);

    if (snap && snap.exists()) {
      const data = snap.data() as AppState;
      if (data && data.version) {
        cloudState = data;
      }
    }

    // 2. Also check if classes_data has classes/students to recover
    const targetUserId = user?.id || (key.startsWith('workspace_') ? key.replace('workspace_', '') : '');
    if (targetUserId) {
      try {
        const classesDocRef = doc(db, 'classes_data', targetUserId);
        const classesSnap = await getDoc(classesDocRef);

        if (classesSnap && classesSnap.exists()) {
          const cData = classesSnap.data();
          if (cData && Array.isArray(cData.classes) && cData.classes.length > 0) {
            if (!cloudState) {
              cloudState = getDefaultStateForUser(user);
            }
            // If cloudState has no classes, or classes_data is newer, use classes_data
            const cloudClassesCount = cloudState.classes?.length || 0;
            if (cloudClassesCount === 0) {
              cloudState.classes = cData.classes;
              cloudState.students = Array.isArray(cData.students) ? cData.students : [];
              if (cData.classes[0]?.id && (!cloudState.activeClassId || cloudState.activeClassId === 'default_class')) {
                cloudState.activeClassId = cData.classes[0].id;
              }
            }
          }
        }
      } catch (backupReadErr) {
        console.warn('Notice checking classes_data fallback:', backupReadErr);
      }
    }

    return cloudState;
  } catch (err) {
    console.error('Failed to load classroom state from Firestore:', err);
    return null;
  }
}

/**
 * Real-time listener for the user's workspace on Firestore
 * Enables automatic live synchronization across multiple browsers/devices
 */
export function subscribeToUserWorkspace(
  key: string,
  onRemoteUpdate: (state: AppState) => void
): () => void {
  const docRef = doc(db, 'workspaces', key);
  return onSnapshot(
    docRef,
    (snap) => {
      // Ignore local writes that haven't been committed to server yet
      if (snap.exists() && !snap.metadata.hasPendingWrites) {
        const data = snap.data() as AppState;
        if (data && data.version) {
          onRemoteUpdate(data);
        }
      }
    },
    (err) => {
      console.warn('Real-time workspace sync listener notice:', err);
    }
  );
}

/**
 * Real-time listener for the user's KHDH data on Firestore
 */
export function subscribeToUserKhdh(
  userId: string,
  onRemoteUpdate: (data: any) => void
): () => void {
  const docRef = doc(db, 'khdh_data', userId || 'shared');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && !snap.metadata.hasPendingWrites) {
        const data = snap.data();
        if (data) {
          onRemoteUpdate(data);
        }
      }
    },
    (err) => {
      console.warn('Real-time KHDH listener notice:', err);
    }
  );
}

/**
 * Get user-isolated LocalStorage keys
 */
export function getUserKhdhStorageKeys(userId?: string | null) {
  const prefix = userId ? `khdh_u_${userId}` : 'khdh_u_guest';
  return {
    CONFIG: `${prefix}_config_v1`,
    PPCT: `${prefix}_ppct_list_v1`,
    TIMETABLE: `${prefix}_timetable_v1`,
    CUSTOMIZED_WEEKS: `${prefix}_customized_weeks_v1`,
    CONFIGURED_CLASSES: `${prefix}_configured_classes_v1`,
    SAVED_PLANS: `${prefix}_saved_lesson_plans_v1`,
    ACTIVE_TAB: `${prefix}_active_tab_v1`
  };
}

/**
 * Save KHDH Data to Firestore
 */
export async function saveKhdhDataToFirestore(
  userId: string,
  data: {
    config: SchoolConfig;
    ppctList: PpctItem[];
    timetable: TimetableSlot[];
    customizedWeeks: Record<number, LessonPlanRow[]>;
    configuredClasses?: ConfiguredClass[];
  }
): Promise<boolean> {
  const sanitized = sanitizeFirestoreData(data);
  try {
    const docRef = doc(db, 'khdh_data', userId || 'shared');
    await setDoc(docRef, {
      ...sanitized,
      userId: userId || 'shared',
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('unavailable') || err?.message?.includes('offline')) {
      console.warn('Firestore unavailable, KHDH data saved locally only.');
      return false;
    }
    console.warn('Save KHDH data Firestore notice:', err?.message || err);
    return false;
  }
}

/**
 * Load KHDH Data from Firestore
 */
export async function loadKhdhDataFromFirestore(userId: string): Promise<{
  config?: SchoolConfig;
  ppctList?: PpctItem[];
  timetable?: TimetableSlot[];
  customizedWeeks?: Record<number, LessonPlanRow[]>;
  configuredClasses?: ConfiguredClass[];
} | null> {
  try {
    const docRef = doc(db, 'khdh_data', userId || 'shared');
    const snap = await getDoc(docRef);
    if (snap && snap.exists()) {
      return snap.data() as any;
    }
  } catch (err) {
    console.warn('Load KHDH data Firestore notice:', err);
  }
  return null;
}

/**
 * Save Lesson Plans Library to Firestore for specific user
 */
export async function saveLessonPlansToFirestore(
  userId: string,
  plans: DetailedLessonPlan[]
): Promise<boolean> {
  const sanitized = sanitizeFirestoreData({ plans });
  try {
    const docRef = doc(db, 'lesson_plans', userId || 'shared');
    await setDoc(docRef, {
      userId: userId || 'shared',
      plans: sanitized.plans || [],
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('unavailable') || err?.message?.includes('offline')) {
      console.warn('Firestore unavailable, Lesson Plans saved locally only.');
      return false;
    }
    console.warn('Save Lesson Plans Firestore notice:', err?.message || err);
    return false;
  }
}

/**
 * Load Lesson Plans Library from Firestore for specific user
 */
export async function loadLessonPlansFromFirestore(
  userId: string
): Promise<DetailedLessonPlan[] | null> {
  try {
    const docRef = doc(db, 'lesson_plans', userId || 'shared');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.plans)) {
        return data.plans as DetailedLessonPlan[];
      }
    }
  } catch (err) {
    console.warn('Load Lesson Plans Firestore notice:', err);
  }
  return null;
}

/**
 * Fetch global system configuration (e.g. school logo)
 */
export async function fetchSystemConfig(): Promise<any> {
  try {
    const docRef = doc(db, 'system', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Failed to fetch system config:', err);
  }
  return null;
}

/**
 * Save global system configuration
 */
export async function saveSystemConfig(config: any): Promise<boolean> {
  try {
    const docRef = doc(db, 'system', 'config');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Failed to save system config:', err);
    return false;
  }
}

/**
 * Session storage for current logged in user
 */
export function getSavedSessionUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading saved session', e);
  }
  return null;
}

export function saveSessionUser(user: UserAccount | null) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error saving session user', e);
  }
}

const SYSTEM_CONTACT_KEY = 'lopHoc_system_contact_info_v1';

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  title: 'Thông Tin Liên Hệ Gia Hạn & Hỗ Trợ Kỹ Thuật',
  phone: '0912 345 678',
  zalo: '0912 345 678',
  qrCode: '',
  note: 'Vui lòng quét mã QR Zalo / Chuyển khoản hoặc liên hệ SĐT trên để được hỗ trợ cấp / gia hạn tài khoản nhanh chóng!',
  updatedAt: new Date().toISOString()
};

export function getLocalCachedContactInfo(): ContactInfo {
  try {
    const raw = localStorage.getItem(SYSTEM_CONTACT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local contact cache:', e);
  }
  return DEFAULT_CONTACT_INFO;
}

export async function fetchContactInfoFromFirestore(): Promise<ContactInfo> {
  try {
    const docRef = doc(db, 'system', 'contact');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ContactInfo;
      localStorage.setItem(SYSTEM_CONTACT_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch contact info from firestore:', err);
  }
  return getLocalCachedContactInfo();
}

export async function saveContactInfoToFirestore(info: ContactInfo): Promise<boolean> {
  try {
    const dataToSave = {
      ...info,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SYSTEM_CONTACT_KEY, JSON.stringify(dataToSave));
    const docRef = doc(db, 'system', 'contact');
    await setDoc(docRef, dataToSave);
    return true;
  } catch (err) {
    console.error('Failed to save contact info to firestore:', err);
    return false;
  }
}
