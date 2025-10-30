import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import Work from "./pages/Work";
import Salary from "./pages/Salary";
import Admin from "./pages/Admin";
import RegisterForm from "./pages/Auth/RegisterForm";
import Facilities from "./pages/Admin/screens/Facilities";
import FacilityTypes from "./pages/Admin/screens/FacilityTypes";
import Workers from "./pages/Admin/screens/Workers";
import Tasks from "./pages/Admin/screens/Tasks";
import WorkProcesses from "./pages/Admin/screens/WorkProcesses";
import RoutesPage from "./pages/Routes";

function App() {
  const [, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.data.isAuthenticated);
  
  useTelegramWebApp();

  useEffect(() => {
    if (isDataLoaded) {
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
  }, [isDataLoaded]);

  const isAuthPage = location.pathname === '/register';

  const loadingFallback = (
    <div className="p-6 text-theme-text-muted text-center">loading…</div>
  );

  const renderProtected = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (isAuthenticated ? element : <Navigate to="/register" replace />)
  );

  const renderPublicOnly = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (!isAuthenticated ? element : <Navigate to="/" replace />)
  );

  return (
    <div className={"App"}>
      {/*{isLoading && <Preloader />}*/}
      <main>
        <Routes>
          <Route 
            path={routes.WORK} 
            element={renderProtected(<Work />)} 
          />
          <Route 
            path={routes.ROUTES} 
            element={renderProtected(<RoutesPage />)} 
          />
          <Route 
            path={routes.SALARY} 
            element={renderProtected(<Salary />)} 
          />
          <Route 
            path={routes.ADMIN} 
            element={renderProtected(<Admin />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITIES} 
            element={renderProtected(<Facilities />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITY_TYPES} 
            element={renderProtected(<FacilityTypes />)} 
          />
          <Route 
            path={routes.ADMIN_WORKERS} 
            element={renderProtected(<Workers />)} 
          />
          <Route 
            path={routes.ADMIN_TASKS} 
            element={renderProtected(<Tasks />)} 
          />
          <Route 
            path={routes.ADMIN_WORK_PROCESSES} 
            element={renderProtected(<WorkProcesses />)} 
          />
          <Route 
            path={routes.REGISTER} 
            element={renderPublicOnly(<RegisterForm />)} 
          />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  )
}

export default App
