import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Dashboard({ user, token }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAccounts(response.data.accounts);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to fetch accounts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAccounts();
    }
  }, [token]);

  if (loading) return <div className="text-center mt-8">Loading accounts...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.firstName}!</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Your Accounts</h2>
        <Link to="/accounts/create" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Create New Account
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="text-gray-600">You don't have any accounts yet. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">{account.accountNumber}</h3>
              <p className="text-gray-700 mb-1">Balance: <span className="font-semibold">{account.currency} {parseFloat(account.balance).toFixed(2)}</span></p>
              <p className="text-gray-700 mb-4">Status: <span className={`font-semibold ${account.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{account.status}</span></p>
              <div className="flex justify-end gap-2">
                <Link
                  to={`/transactions/initiate/${account.id}`}
                  className="bg-blue-500 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded"
                >
                  Initiate Transaction
                </Link>
                <Link
                  to={`/accounts/${account.id}`}
                  className="bg-gray-500 hover:bg-gray-700 text-white text-sm py-1 px-3 rounded"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;