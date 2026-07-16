import "./App.css";

import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import Tables from "./pages/Tables";
import Clients from "./pages/Clients";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";

function App() {
  return (
    <>
      <Header />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prenotazioni" element={<Reservations />} />
            <Route path="/tavoli" element={<Tables />} />
            <Route path="/clienti" element={<Clients />} />
            <Route path="/statistiche" element={<Statistics />} />
            <Route path="/impostazioni" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;