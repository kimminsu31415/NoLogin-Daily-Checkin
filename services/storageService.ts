/**
 * Handles the persistent local storage for the Anonymous User ID (UUID).
 * This ensures the browser remembers who the user is without login.
 */

const STORAGE_KEY_USER_ID = 'badminton_app_device_id';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(STORAGE_KEY_USER_ID);

  if (!deviceId) {
    // Generate a new UUID if one doesn't exist
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback for older browsers or non-secure contexts
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY_USER_ID, deviceId);
  }

  return deviceId;
};

export const getStoredNickname = (): string => {
  return localStorage.getItem('badminton_app_last_nickname') || '';
};

export const setStoredNickname = (nickname: string): void => {
  localStorage.setItem('badminton_app_last_nickname', nickname);
};