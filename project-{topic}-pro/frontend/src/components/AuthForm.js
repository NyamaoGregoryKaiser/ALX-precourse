import React from 'react';

const AuthForm = ({ type, formData, handleChange, handleSubmit, error, isLoading }) => {
  const isRegister = type === 'register';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg max-w-md w-full">
        <h3 className="text-2xl font-bold text-center">
          {isRegister ? 'Register' : 'Login'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-6">
          {isRegister && (
            <div className="mt-4">
              <label className="block" htmlFor="username">Username</label>
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="mt-4">
            <label className="block" htmlFor="email">Email</label>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mt-4">
            <label className="block" htmlFor="password">Password</label>
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {isRegister && (
            <div className="mt-4">
              <label className="block" htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <div className="flex items-baseline justify-between">
            <button
              type="submit"
              className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
            </button>
            {isRegister ? (
              <a href="/login" className="text-sm text-blue-600 hover:underline">Already have an account?</a>
            ) : (
              <a href="/register" className="text-sm text-blue-600 hover:underline">Don't have an account?</a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;