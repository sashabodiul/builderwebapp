import { Routes, Route } from "react-router-dom";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
import Preloader from "./components/layout/Preloader";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import Main from "./pages/Main";
import LoginForm from "./pages/Auth/LoginForm";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();

  useEffect(() => {
    if (isDataLoaded) {
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
  }, [isDataLoaded]);

  if (window.Telegram) {
    window.Telegram.WebApp.expand();
  }

  return (
    <div className={"App"}>
      {isLoading && <Preloader />}
      <main>
        <Routes>
          <Route path={routes.MAIN} element={<Main />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App
