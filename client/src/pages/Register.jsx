import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Store, MapPin } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer',
    shopName: '',
    bio: '',
    upiId: '',
  });
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const { user, register, loading: authLoading } = useContext(AuthContext);
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          type: 'Point',
          coordinates: [pos.coords.longitude, pos.coords.latitude]
        });
        setLocating(false);
      },
      (err) => {
        setError('Could not get location. Please allow location access.');
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.role === 'artisan' && !location) {
      setError('Artisans must provide a location for self-pickup.');
      return;
    }

    const payload = { ...formData };
    if (location) {
      payload.location = location;
    }
    
    if (formData.role === 'artisan') {
      payload.artisanData = {
        shopName: formData.shopName,
        bio: formData.bio,
        upiId: formData.upiId
      };
    }

    try {
      const data = await register(payload);
      if (data.user.role === 'artisan') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create an account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength="6"
                maxLength="128"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">I want to...</label>
              <select
                name="role"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                onChange={handleChange}
                value={formData.role}
              >
                <option value="buyer">Buy Local Products</option>
                <option value="artisan">Sell as an Artisan</option>
              </select>
            </div>

            {formData.role === 'artisan' && (
              <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900">Artisan Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                  <input
                    type="text"
                    name="shopName"
                    required={formData.role === 'artisan'}
                    minLength={2}
                    maxLength={100}
                    autoComplete="organization"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio / Story</label>
                  <textarea
                    name="bio"
                    rows="3"
                    minLength={10}
                    maxLength={500}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    onChange={handleChange}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">UPI ID (For Payments)</label>
                  <input
                    type="text"
                    name="upiId"
                    required={formData.role === 'artisan'}
                    pattern="[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*"
                    maxLength={100}
                    title="Enter a valid UPI ID, such as name@bank"
                    placeholder="example@upi"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    onChange={handleChange}
                  />
                </div>
                
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={locating || location}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    <MapPin className="h-4 w-4" />
                    {location ? 'Location Captured ✓' : locating ? 'Getting Location...' : 'Set Shop Location'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">Required for self-pickup routing.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Register
            </button>
          </div>
        </form>
        <div className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <Link to="/login" className="font-medium text-amber-600 hover:text-amber-500">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
