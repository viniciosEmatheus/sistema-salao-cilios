import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/">Agendar</Link>
        <Link to="/admin">Área da Dona</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ClientBooking />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;