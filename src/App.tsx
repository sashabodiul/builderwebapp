import { Routes, Route, useLocation } from "react-router-dom";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import Work from "./pages/Work";
import Salary from "./pages/Salary";
import Admin from "./pages/Admin";
import LoginForm from "./pages/Auth/LoginForm";

function App() {
  const [, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();
  const location = useLocation();

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

  // Hide footer on auth pages
  const isAuthPage = location.pathname === '/login';

  return (
    <div className={"App"}>
      {/*{isLoading && <Preloader />}*/}
      <main>
        <Routes>
          <Route path={routes.WORK} element={<Work />} />
          <Route path={routes.SALARY} element={<Salary />} />
          <Route path={routes.ADMIN} element={<Admin />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  )
}

export default App
