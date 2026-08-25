import { BrowserRouter } from "react-router-dom";

import AppRouter from "./routes/AppRouter.js";
import ConfirmProvider from "./components/ConfirmProvider.js";
import ToastProvider from "./components/ToastProvider.js";
import { BrandingProvider } from "./context/BrandingProvider.js";

function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppRouter />
          </ConfirmProvider>
        </ToastProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}

export default App;
