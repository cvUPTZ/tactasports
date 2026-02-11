import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { EventConfigProvider } from "@/contexts/EventConfigContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <EventConfigProvider>
            <App />
        </EventConfigProvider>
    </ErrorBoundary>
);
