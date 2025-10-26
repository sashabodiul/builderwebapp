import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import Work from "./pages/Work";
import Salary from "./pages/Salary";
import Admin from "./pages/Admin";
import RegisterForm from "./pages/Auth/RegisterForm";

function App() {
  const [, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.data.isAuthenticated);

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
  const isAuthPage = location.pathname === '/register';

  return (
    <div className={"App"}>
      {/*{isLoading && <Preloader />}*/}
      <main>
        <Routes>
          <Route 
            path={routes.WORK} 
            element={isAuthenticated ? <Work /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.SALARY} 
            element={isAuthenticated ? <Salary /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.ADMIN} 
            element={isAuthenticated ? <Admin /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.REGISTER} 
            element={!isAuthenticated ? <RegisterForm /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  )
}

export default App
