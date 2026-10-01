import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  isPortrait: boolean;
  isLandscape: boolean;
  deviceCategory: 'small-mobile' | 'mobile' | 'tablet' | 'desktop';
  devicePixelRatio: number;
  safeAreaInsetTop: number;
  safeAreaInsetBottom: number;
}

export function useDeviceDetect(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let category: 'small-mobile' | 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width < 380) category = 'small-mobile';
    else if (width < 640) category = 'mobile';
    else if (width < 1024) category = 'tablet';

    return {
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      isTouch,
      screenWidth: width,
      screenHeight: height,
      isPortrait: height >= width,
      isLandscape: width > height,
      deviceCategory: category,
      devicePixelRatio: dpr,
      safeAreaInsetTop: 0,
      safeAreaInsetBottom: 0
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const dpr = window.devicePixelRatio || 1;

      let category: 'small-mobile' | 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (width < 380) category = 'small-mobile';
      else if (width < 640) category = 'mobile';
      else if (width < 1024) category = 'tablet';

      setDeviceInfo({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        isTouch,
        screenWidth: width,
        screenHeight: height,
        isPortrait: height >= width,
        isLandscape: width > height,
        deviceCategory: category,
        devicePixelRatio: dpr,
        safeAreaInsetTop: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10),
        safeAreaInsetBottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0', 10)
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}
