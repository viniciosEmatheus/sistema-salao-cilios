import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', gap: '20px', fontFamily: 'sans-serif' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Agendar</Link>
        <Link to="/admin" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Área da Dona</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ClientBooking />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;