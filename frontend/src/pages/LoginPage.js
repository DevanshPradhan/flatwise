import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl tracking-tight font-light" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              Welcome back
            </h1>
            <p className="mt-2 text-base leading-relaxed" style={{ fontFamily: 'IBM Plex Sans, sans-serif', color: '#6B6862' }}>
              Sign in to continue to Flat Ledger
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="email" style={{ color: '#2D2C2A' }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                style={{
                  backgroundColor: '#F9F8F6',
                  borderColor: '#E5E0D8',
                  color: '#2D2C2A'
                }}
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" style={{ color: '#2D2C2A' }}>Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                style={{
                  backgroundColor: '#F9F8F6',
                  borderColor: '#E5E0D8',
                  color: '#2D2C2A'
                }}
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }} data-testid="login-error-message">
                <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full px-6 py-2.5 font-medium transition-colors focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: '#4A6741',
                color: 'white',
                fontFamily: 'IBM Plex Sans, sans-serif'
              }}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#6B6862' }}>
              Need credentials? Check with your flatmates or use:
            </p>
            <p className="text-xs mt-2" style={{ color: '#6B6862' }}>
              akash@flatledger.com / akash123
            </p>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: `url('https://static.prod-images.emergentagent.com/jobs/ebfa41e3-7583-46d7-a7ba-881a04922340/images/ae46d49e712b9a664179c5c4d0bb694eff2f7463e211efb8e58e460744956f60.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(74, 103, 65, 0.3)' }}>
          <h2 className="text-5xl font-light tracking-tight text-white px-8 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Shared living, simplified
          </h2>
        </div>
      </div>
    </div>
  );
}