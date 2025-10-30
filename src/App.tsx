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
            path={routes.ADMIN_FACILITIES} 
            element={isAuthenticated ? <Facilities /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.ADMIN_FACILITY_TYPES} 
            element={isAuthenticated ? <FacilityTypes /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.ADMIN_WORKERS} 
            element={isAuthenticated ? <Workers /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.ADMIN_TASKS} 
            element={isAuthenticated ? <Tasks /> : <Navigate to="/register" replace />} 
          />
          <Route 
            path={routes.ADMIN_WORK_PROCESSES} 
            element={isAuthenticated ? <WorkProcesses /> : <Navigate to="/register" replace />} 
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
