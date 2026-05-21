import { HashRouter, Routes, Route } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Rota da Cliente: raiz do site → agendamento */}
        <Route path="/" element={<ClientBooking />} />

        {/* Rota da Giovanna: acesso via /#/gerencia */}
        <Route path="/gerencia" element={<AdminDashboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;