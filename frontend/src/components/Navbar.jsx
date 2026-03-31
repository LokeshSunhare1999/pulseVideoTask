import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleColors = {
  admin: 'bg-red-500/20 text-red-400 border border-red-500/30',
  editor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  viewer: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">VideoVault</span>
          </Link>

          {/* Nav links */}
          {user && (
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/library"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/library') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Library
              </Link>
              {(user.role === 'editor' || user.role === 'admin') && (
                <Link
                  to="/upload"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/upload') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Upload
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* User info */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[user.role]}`}>
                {user.role}
              </span>
              <span className="text-slate-300 text-sm hidden sm:block">{user.username}</span>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors">
                Login
              </Link>
              <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-md transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
