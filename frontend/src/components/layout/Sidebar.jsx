import { LayoutDashboard, BookOpen, Dumbbell, TrendingUp, History, Settings, Users, UsersRound } from 'lucide-react'
import { useFriends } from '../../context/FriendsContext'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../ui/Badge'

/**
 * Navigation item definitions.
 * Items with `guestVisible: true` are shown to anonymous users.
 * All items are shown to registered users.
 */
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', guestVisible: true },
  { icon: BookOpen, label: 'Lessons', path: '/lessons', guestVisible: true },
  { icon: Dumbbell, label: 'Practice', path: '/practice', guestVisible: false },
  { icon: Users, label: 'Friends', path: '/friends', hasBadge: true, guestVisible: false },
  { icon: UsersRound, label: 'Study Groups', path: '/groups', guestVisible: false },
  { icon: TrendingUp, label: 'Progress', path: '/progress', guestVisible: false },
  { icon: History, label: 'History', path: '/history', guestVisible: false },
  { icon: Settings, label: 'Settings', path: '/settings', guestVisible: false },
]

export function Sidebar({ currentPath = '/dashboard', onNavigate }) {
  const friendsContext = useFriends();
  const pendingCount = friendsContext?.pendingCount || 0;
  const { isAnonymous } = useAuth();

  // Filter nav items: anonymous users only see guestVisible items
  const visibleNavItems = isAnonymous
    ? navItems.filter(item => item.guestVisible)
    : navItems;

  return (
    <aside className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo area */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Knowrizon" className="w-12 h-12" />
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Knowrizon
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleNavItems.map(({ icon: Icon, label, path, hasBadge }) => {
            const isActive = currentPath === path
            const badgeCount = hasBadge && path === '/friends' ? pendingCount : 0

            return (
              <li key={path}>
                <button
                  onClick={() => onNavigate?.(path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </div>
                  {badgeCount > 0 && <Badge count={badgeCount} />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Guest indicator */}
      {isAnonymous && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
            Guest Mode — Limited Access
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Sign up to unlock all features
          </p>
        </div>
      )}
    </aside>
  )
}

