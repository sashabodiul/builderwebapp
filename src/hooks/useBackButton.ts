import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

const useBackButton = (backRoute: string) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (backRoute) {
      window.Telegram.WebApp.BackButton.show();
      window.Telegram.WebApp.BackButton.onClick(() => navigate(backRoute));
    }
  }, [navigate, backRoute]);
}

export default useBackButton;