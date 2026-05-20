import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      {/* Removemos a tag <nav> daqui. Não há mais botões unindo as telas. */}
      <Routes>
        {/* Rota da Cliente: Acessa a raiz do site e vê APENAS o agendamento */}
        <Route path="/" element={<ClientBooking />} />
        
        {/* Rota da Giovanna: Link separado e invisível para o público */}
        <Route path="/gerencia" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;