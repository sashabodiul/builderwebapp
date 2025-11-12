import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

const useBackButton = (backRoute: string | (() => void)) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (backRoute) {
      window.Telegram.WebApp.BackButton.show();
      if (typeof backRoute === 'string') {
        window.Telegram.WebApp.BackButton.onClick(() => navigate(backRoute));
      } else {
        window.Telegram.WebApp.BackButton.onClick(backRoute);
      }
    }

    return () => {
      window.Telegram.WebApp.BackButton.hide();
    };
  }, [navigate, backRoute]);
}

export default useBackButton;