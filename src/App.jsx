import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './store/auth'
import Login from './components/Login'
import Shell from './components/Shell'
import ContactList from './pages/ContactList'
import ContactProfile from './pages/ContactProfile'
import AddContact from './pages/AddContact'
import MapView from './pages/MapView'
import Journal from './pages/Journal'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return null // wait out the initial session check, then render once
  if (!session) return <Login /> // single auth gate — no routing until signed in

  return (
    <BrowserRouter>
      <Routes>
        {/* Shell provides the responsive nav; pages render into its <Outlet>. */}
        <Route element={<Shell />}>
          <Route path="/" element={<ContactList />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/add" element={<AddContact />} />
          <Route path="/contact/:id" element={<ContactProfile />} />
          <Route path="/contact/:id/edit" element={<AddContact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
