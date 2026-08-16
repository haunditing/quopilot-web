import { BrowserRouter } from "react-router-dom";

import AppRouter from "./routes/AppRouter.js";
import ConfirmProvider from "./components/ConfirmProvider.js";
import ToastProvider from "./components/ToastProvider.js";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AppRouter />
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
