import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EmpresaCompetenciaPage } from './pages/EmpresaCompetenciaPage'
import { EmpresasPage } from './pages/EmpresasPage'
import { PendenciasPage } from './pages/PendenciasPage'
import { LoginPage } from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/empresas" element={<EmpresasPage />} />
          <Route path="/empresas/:cnpj/:competencia" element={<EmpresaCompetenciaPage />} />
          <Route path="/pendencias" element={<PendenciasPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
