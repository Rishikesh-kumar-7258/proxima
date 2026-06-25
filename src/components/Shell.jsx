import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Users, MapIcon, Plus, LogOut, Book } from './icons'

const tabs = [
  { to: '/', label: 'Map', Icon: MapIcon, end: true },
  { to: '/contacts', label: 'Contacts', Icon: Users },
  { to: '/journal', label: 'Journal', Icon: Book },
]

// Responsive chrome: a sidebar on desktop, a top bar + bottom tab bar on mobile.
export default function Shell() {
  const signOut = useAuth((s) => s.signOut)

  return (
    <div className="md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-svh md:w-64 md:shrink-0 md:flex-col md:border-r md:border-gray-200 md:bg-white md:p-4 xl:w-72">
        <Brand />
        <nav className="mt-6 flex flex-col gap-1">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => sideLink(isActive)}>
              <Icon className="size-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/add" className="btn mt-4"><Plus className="size-5" /> Add contact</NavLink>
        <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-500 hover:bg-gray-50">
          <LogOut className="size-5" /> Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button onClick={signOut} aria-label="Sign out" className="text-gray-400"><LogOut className="size-5" /></button>
      </header>

      {/* Page content */}
      <main className="min-w-0 flex-1 pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-gray-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <Tab to="/" end Icon={MapIcon} label="Map" />
        <Tab to="/contacts" Icon={Users} label="Contacts" />
        <AddTab />
        <Tab to="/journal" Icon={Book} label="Journal" />
      </nav>
    </div>
  )
}

const sideLink = (active) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${active ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-gray-50'}`

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-sm font-bold text-white">MN</span>
      <span className="font-bold tracking-tight">My Network</span>
    </div>
  )
}

function Tab({ to, end, Icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${isActive ? 'text-violet-600' : 'text-gray-400'}`}
    >
      <Icon className="size-5" /> {label}
    </NavLink>
  )
}

// Center action — floats above the bar for an obvious primary action.
function AddTab() {
  return (
    <NavLink to="/add" aria-label="Add contact" className="flex flex-1 flex-col items-center justify-end pb-2">
      <span className="-mt-6 grid size-12 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30">
        <Plus className="size-6" />
      </span>
    </NavLink>
  )
}
