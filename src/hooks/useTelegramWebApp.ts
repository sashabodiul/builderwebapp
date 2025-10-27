import { useEffect } from 'react';

export const useTelegramWebApp = () => {
  const isDesktop = (): boolean => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobile = /android|iphone|ipad|mobile|ipod|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(userAgent);
    if (import.meta.env.VITE_DEBUG) {
      return false;
    }
    return !isMobile;
  };

  useEffect(() => {
    if (import.meta.env.VITE_DEBUG) {
      const html = document.querySelector("html");
      html!.classList.add("desktop");
    }

    if (window.Telegram && !isDesktop() && !import.meta.env.VITE_DEBUG) {
      window.Telegram.WebApp.requestFullscreen();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.disableVerticalSwipes();
      window.Telegram.WebApp.lockOrientation();
    }
  }, []);

  return { isDesktop };
};
