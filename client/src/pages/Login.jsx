import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Store } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, login, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'artisan') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (data.user.role === 'artisan') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-amber-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                maxLength={254}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                minLength={6}
                maxLength={128}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="text-center mt-4 text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="font-medium text-amber-600 hover:text-amber-500">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
