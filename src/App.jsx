import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import Login from './components/Login'
import Shell from './components/Shell'
import ContactList from './pages/ContactList'
import ContactProfile from './pages/ContactProfile'
import AddContact from './pages/AddContact'
import MapView from './pages/MapView'
import Journal from './pages/Journal'
import JournalCompose from './pages/JournalCompose'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<MapView />} />
          <Route path="/contacts" element={<ContactList />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/new" element={<JournalCompose />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="/add" element={<AddContact />} />
          <Route path="/contact/:id" element={<ContactProfile />} />
          <Route path="/contact/:id/edit" element={<AddContact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
