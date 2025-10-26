import { createRoot } from 'react-dom/client';
import './styles/globals.scss';
import './i18n/config';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from "react-redux";
import store from "./store/config.ts";
import {ToastContainer} from 'react-toastify';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter>
			<ToastContainer
				position="top-center"
				autoClose={3000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover={false}
				theme="dark"
			/>
        <App />
    </BrowserRouter>
  </Provider>
);
