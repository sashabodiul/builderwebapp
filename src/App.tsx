import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
// import ApiEnvironmentSwitcher from "./components/layout/ApiEnvironmentSwitcher";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import Work from "./pages/Work";
import Salary from "./pages/Salary";
import Admin from "./pages/Admin";
import LoginForm from "./pages/Auth/LoginForm";
import RegisterForm from "./pages/Auth/RegisterForm";
import Facilities from "./pages/Admin/screens/Facilities";
import FacilityTypes from "./pages/Admin/screens/FacilityTypes";
import Workers from "./pages/Admin/screens/Workers";
import Tasks from "./pages/Admin/screens/Tasks";
import WorkProcesses from "./pages/Admin/screens/WorkProcesses";
import RoutesPage from "./pages/Routes";
import RouteResultScreen from "@/pages/Routes/components/RouteResultScreen";

function App() {
  const [, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.data.isAuthenticated);
  const user = useSelector((state: any) => state.data.user);
  
  useTelegramWebApp();

  useEffect(() => {
    if (isDataLoaded) {
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
  }, [isDataLoaded]);

  const isAuthPage = location.pathname === '/register' || location.pathname === '/login';
  const isRoutesPage = location.pathname.startsWith('/routes');

  const loadingFallback = (
    <div className="p-6 text-theme-text-muted text-center">loading…</div>
  );

  const renderProtected = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (isAuthenticated ? element : <Navigate to="/login" replace />)
  );

  const renderAdminOnly = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (isAuthenticated && user?.worker_type === "admin" ? element : <Navigate to="/" replace />)
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
            path={"/routes/result"}
            element={renderProtected(<RouteResultScreen />)}
          />
          <Route 
            path={routes.SALARY} 
            element={renderProtected(<Salary />)} 
          />
          <Route 
            path={routes.ADMIN} 
            element={renderAdminOnly(<Admin />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITIES} 
            element={renderAdminOnly(<Facilities />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITY_TYPES} 
            element={renderAdminOnly(<FacilityTypes />)} 
          />
          <Route 
            path={routes.ADMIN_WORKERS} 
            element={renderAdminOnly(<Workers />)} 
          />
          <Route 
            path={routes.ADMIN_TASKS} 
            element={renderAdminOnly(<Tasks />)} 
          />
          <Route 
            path={routes.ADMIN_WORK_PROCESSES} 
            element={renderAdminOnly(<WorkProcesses />)} 
          />
          <Route 
            path="/login" 
            element={renderPublicOnly(<LoginForm />)} 
          />
          <Route 
            path={routes.REGISTER} 
            element={renderPublicOnly(<RegisterForm />)} 
          />
        </Routes>
      </main>

      {!isAuthPage && !isRoutesPage && <Footer />}
      {/* <ApiEnvironmentSwitcher /> */}
    </div>
  )
}

export default App
