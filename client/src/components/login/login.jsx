import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// NOTE: The import for 'login.css' has been removed.

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/login', { email, password });

      if (response.status === 200) {
        const { token } = response.data;
        console.log(token); // Assume the backend sends a JWT token
        localStorage.setItem('authToken', token); // Store token
        alert('Login successful');
        navigate('/queryPage'); // Redirect
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Main container using Tailwind for a dark theme and centered layout
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-800 p-4 text-gray-100">
      {/* Form wrapper with card-like styling consistent with the app theme */}
      <div className="w-full max-w-md rounded-xl bg-gray-900 p-8 shadow-lg">
        <h2 className="mb-6 text-center text-3xl font-bold">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input Field */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-400">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              // Styling consistent with the query page inputs
              className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Password Input Field */}
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-400">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              // Styling consistent with the query page inputs
              className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Error message display, styled like chat errors */}
          {error && (
            <div className="rounded-md bg-red-900/50 p-3 text-center text-sm text-red-300">
              {error}
            </div>
          )}
          {/* Login button with loading state */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-gray-500"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;