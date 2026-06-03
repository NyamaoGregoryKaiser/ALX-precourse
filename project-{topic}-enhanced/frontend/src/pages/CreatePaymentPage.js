```javascript
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/apiService'; // Your API service
import CardForm from '../components/Payment/CardForm'; // Component for collecting card details
import SavedPaymentMethods from '../components/Payment/SavedPaymentMethods'; // Component to select saved methods
import { toast } from 'react-toastify'; // For notifications

function CreatePaymentPage() {
  const { user } = useAuth();
  const { merchantId: urlMerchantId } = useParams(); // Merchant ID from URL if paying a specific merchant
  const navigate = useNavigate();

  const [paymentMethodSelection, setPaymentMethodSelection] = useState('newCard'); // 'newCard' or 'savedMethod'
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [merchantIdentifier, setMerchantIdentifier] = useState(urlMerchantId || '');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardHolderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCardDetailsChange = (e) => {
    setCardDetails({ ...cardDetails, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let payload = {
      amount: parseFloat(amount),
      currency,
      description,
      merchantId: merchantIdentifier,
    };

    if (paymentMethodSelection === 'newCard') {
      payload = { ...payload, ...cardDetails };
    } else if (paymentMethodSelection === 'savedMethod') {
      if (!selectedPaymentMethodId) {
        setError('Please select a saved payment method.');
        setLoading(false);
        return;
      }
      payload.paymentMethodId = selectedPaymentMethodId;
      // CVV is required even for saved cards, but not stored. User provides it.
      if (!cardDetails.cvv) {
        setError('CVV is required for saved card payments.');
        setLoading(false);
        return;
      }
      payload.cvv = cardDetails.cvv; // Only CVV is sent with saved method
    }

    try {
      const res = await api.post('/transactions', payload);
      toast.success('Payment successful!');
      navigate(`/transactions/${res.data.data.transaction.id}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.type !== 'user') {
    return (
      <div className="container">
        <h1>Unauthorized</h1>
        <p>Only customer accounts can make payments.</p>
      </div>
    );
  }

  return (
    <div className="container payment-page">
      <h1>Make a Payment</h1>
      <form onSubmit={handleSubmit}>
        {/* Merchant Identifier */}
        <div className="form-group">
          <label htmlFor="merchantIdentifier">Merchant ID:</label>
          <input
            type="text"
            id="merchantIdentifier"
            value={merchantIdentifier}
            onChange={(e) => setMerchantIdentifier(e.target.value)}
            required
            readOnly={!!urlMerchantId}
          />
        </div>

        {/* Amount and Currency */}
        <div className="form-group">
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="currency">Currency:</label>
          <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            {/* Add more currencies as needed */}
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
        </div>

        {/* Payment Method Selection */}
        <div className="form-group">
          <label>Choose Payment Method:</label>
          <div>
            <input
              type="radio"
              id="newCard"
              name="paymentMethodSelection"
              value="newCard"
              checked={paymentMethodSelection === 'newCard'}
              onChange={() => setPaymentMethodSelection('newCard')}
            />
            <label htmlFor="newCard">New Card</label>
            <input
              type="radio"
              id="savedMethod"
              name="paymentMethodSelection"
              value="savedMethod"
              checked={paymentMethodSelection === 'savedMethod'}
              onChange={() => setPaymentMethodSelection('savedMethod')}
            />
            <label htmlFor="savedMethod">Saved Card</label>
          </div>
        </div>

        {paymentMethodSelection === 'newCard' && (
          <CardForm cardDetails={cardDetails} onCardDetailsChange={handleCardDetailsChange} isNewCard={true} />
        )}

        {paymentMethodSelection === 'savedMethod' && (
          <>
            <SavedPaymentMethods
              userId={user.id}
              selectedMethod={selectedPaymentMethodId}
              onSelectMethod={setSelectedPaymentMethodId}
            />
            <div className="form-group">
              <label htmlFor="cvv_saved">CVV (for saved card):</label>
              <input
                type="text"
                id="cvv_saved"
                name="cvv"
                value={cardDetails.cvv}
                onChange={handleCardDetailsChange}
                maxLength="4"
                required
              />
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}

export default CreatePaymentPage;
```