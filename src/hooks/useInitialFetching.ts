import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkerByTelegramId } from "../requests/worker";
import { setUser, clearUser } from "../store/slice";

const useInitialFetching = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // skip auth check if already on login or register page
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register') {
        setIsLoaded(true);
        return;
      }

      // Extract telegram_id from Telegram WebApp or use debug value
      let telegram_id: number | undefined;

      // Check for override in localStorage (can be quickly disabled by removing the key)
      const overrideTelegramId = localStorage.getItem('override_telegram_id');
      if (overrideTelegramId && overrideTelegramId !== 'disabled') {
        const parsedId = parseInt(overrideTelegramId, 10);
        if (!isNaN(parsedId)) {
          telegram_id = parsedId;
          console.log(`[DEBUG] Using overridden telegram_id: ${telegram_id}`);
        }
      } else if (import.meta.env.VITE_DEBUG) {
        telegram_id = 1359929127;
      } else {
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        telegram_id = telegramUser?.id;
      }

      // Skip if telegram_id is not available
      if (!telegram_id) {
        console.warn('Telegram ID not available');
        dispatch(clearUser());
        navigate('/login');
        setIsLoaded(true);
        return;
      }

      const response = await getWorkerByTelegramId(telegram_id);

      if (response?.error && !import.meta.env.VITE_DISABLE_AUTH) {
        console.error('Auth check failed:', response.error);
        dispatch(clearUser());
        navigate('/login');
        setIsLoaded(true);
        return;
      }
      
      // Save bot-api worker id (numeric id) for work requests
      if (response.data?.id) {
        localStorage.setItem('botApiWorkerId', String(response.data.id));
      }
      
      dispatch(setUser(response.data));
      setIsLoaded(true);
    };

    checkAuth();
  }, [dispatch, navigate]);

  return isLoaded;
};

export default useInitialFetching;