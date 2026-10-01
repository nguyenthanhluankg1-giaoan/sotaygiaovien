import { UserAccount } from '../types';
import { saveUserToFirestore } from '../services/dbService';

const GLOBAL_GEMINI_KEY = 'gemini_api_key';
const GUEST_GEMINI_KEY = 'gemini_api_key_guest';

/**
 * Lấy API Key được lưu trữ thống nhất toàn bộ ứng dụng:
 * Thứ tự ưu tiên:
 * 1. API Key lưu trong thuộc tính tài khoản Giáo viên (user.apiKey - đồng bộ từ Firestore đám mây)
 * 2. API Key lưu theo ID tài khoản trong LocalStorage (gemini_api_key_user_ID)
 * 3. API Key lưu chung toàn ứng dụng (gemini_api_key)
 * 4. API Key lưu khách (gemini_api_key_guest)
 * 5. Biến môi trường hệ thống (VITE_GEMINI_API_KEY)
 */
export function getStoredApiKey(user?: UserAccount | null): string {
  try {
    // 1. Ưu tiên API key từ tài khoản Giáo viên (đồng bộ từ Firestore đám mây)
    if (user?.apiKey && user.apiKey.trim()) {
      const cloudKey = user.apiKey.trim();
      // Tự động lưu cache cục bộ để các tab đều sẵn sàng
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(GLOBAL_GEMINI_KEY, cloudKey);
          if (user.id) {
            localStorage.setItem(`gemini_api_key_user_${user.id}`, cloudKey);
          }
        }
      } catch (e) {
        // ignore storage errors
      }
      return cloudKey;
    }

    if (typeof localStorage === 'undefined') return '';

    // 2. Kiểm tra API Key lưu riêng theo ID tài khoản
    if (user?.id) {
      const userKey = localStorage.getItem(`gemini_api_key_user_${user.id}`);
      if (userKey && userKey.trim()) return userKey.trim();
    }

    // 3. Kiểm tra API Key lưu chung toàn bộ ứng dụng
    const globalKey = localStorage.getItem(GLOBAL_GEMINI_KEY);
    if (globalKey && globalKey.trim()) return globalKey.trim();

    // 4. Kiểm tra API Key lưu khách
    const guestKey = localStorage.getItem(GUEST_GEMINI_KEY);
    if (guestKey && guestKey.trim()) return guestKey.trim();

    // 5. Kiểm tra Biến môi trường
    const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
    if (envKey && envKey.trim()) return envKey.trim();
  } catch (e) {
    console.error('Lỗi khi đọc Gemini API key:', e);
  }
  return '';
}

/**
 * Lưu API Key dùng chung toàn bộ ứng dụng và TỰ ĐỘNG ĐỒNG BỘ LÊN CLOUD FIRESTORE
 * Khi đăng nhập trên máy tính khác, API Key sẽ tự động cập nhật theo tài khoản Giáo viên!
 */
export async function saveStoredApiKey(apiKey: string, user?: UserAccount | null): Promise<boolean> {
  const trimmed = apiKey.trim();

  // 1. Cập nhật LocalStorage trên thiết bị hiện tại
  try {
    if (typeof localStorage !== 'undefined') {
      if (trimmed) {
        localStorage.setItem(GLOBAL_GEMINI_KEY, trimmed);
        localStorage.setItem(GUEST_GEMINI_KEY, trimmed);
        if (user?.id) {
          localStorage.setItem(`gemini_api_key_user_${user.id}`, trimmed);
        }
      } else {
        localStorage.removeItem(GLOBAL_GEMINI_KEY);
        localStorage.removeItem(GUEST_GEMINI_KEY);
        if (user?.id) {
          localStorage.removeItem(`gemini_api_key_user_${user.id}`);
        }
      }
    }
  } catch (e) {
    console.error('Lỗi khi lưu Gemini API key vào localStorage:', e);
  }

  // 2. ĐỒNG BỘ LÊN ĐÁM MÂY FIRESTORE CHO TÀI KHOẢN GIÁO VIÊN
  if (user && user.id) {
    user.apiKey = trimmed;
    try {
      await saveUserToFirestore(user);
      return true;
    } catch (e) {
      console.warn('Không thể đồng bộ API Key lên Firestore đám mây:', e);
    }
  }
  return false;
}

/**
 * Xóa API Key khỏi tài khoản trên thiết bị và XÓA TRÊN HỆ THỐNG LƯU TRỮ FIRESTORE
 */
export async function clearStoredApiKey(user?: UserAccount | null): Promise<boolean> {
  // 1. Xóa khỏi LocalStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GLOBAL_GEMINI_KEY);
      localStorage.removeItem(GUEST_GEMINI_KEY);
      if (user?.id) {
        localStorage.removeItem(`gemini_api_key_user_${user.id}`);
      }
    }
  } catch (e) {
    console.error('Lỗi khi xóa Gemini API key khỏi localStorage:', e);
  }

  // 2. XÓA TRÊN HỆ THỐNG LƯU TRỮ ĐÁM MÂY FIRESTORE
  if (user && user.id) {
    user.apiKey = '';
    try {
      await saveUserToFirestore(user);
      return true;
    } catch (e) {
      console.warn('Không thể xóa API Key trên đám mây Firestore:', e);
    }
  }
  return false;
}
