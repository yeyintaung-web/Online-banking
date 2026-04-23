import React, { useState } from 'react';
import { styles } from './styles';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const email = e.target.email.value;
    const password = e.target.password.value;
    const fullName = e.target.full_name ? e.target.full_name.value : '';
    const nationalId = e.target.nationalId ? e.target.nationalId.value : null;
    const dob = e.target.dob ? e.target.dob.value : null;
    const phone_number = e.target.phone_number ? e.target.phone_number.value : '';
    const address_line1 = e.target.address_line1 ? e.target.address_line1.value : '';
    const city = e.target.city ? e.target.city.value : '';
    const state_province = e.target.state_province ? e.target.state_province.value : '';
    const zip_postal_code = e.target.zip_postal_code ? e.target.zip_postal_code.value : '';
    const country = e.target.country ? e.target.country.value : '';

    // Age validation for Registration
    if (!isLogin && dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        setError('Registration Failed: You must be at least 18 years old to open an account with Loyal Bank.');
        setIsLoading(false);
        return;
      }
    }

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin 
      ? { email, password } 
      : { 
          email, 
          full_name: fullName, 
          password, 
          national_id: nationalId, 
          date_of_birth: dob,
          phone_number,
          address_line1,
          city,
          state_province,
          zip_postal_code,
          country
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isLogin) {
          // Success after registration -> Move to Login
          setSuccessMessage('Registration successful! Please login with your new account to continue.');
          setIsLogin(true); // Flip to login view immediately
        } else {
          // Success after login
          onAuthSuccess(data.user);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.logoHeader}>
        <span style={styles.logoIconLarge}>🏦</span>
        <h1 style={styles.logoTitleLarge}>Loyal Bank</h1>
      </div>
      
      <div style={{...styles.authCard, ...(isLogin ? {} : styles.authCardWide)}}>
        <h2 style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p style={styles.subtitle}>
          {isLogin ? 'Login to your Loyal Bank account' : 'Join Loyal Bank today'}
        </p>

        <form onSubmit={handleAuth} style={styles.form}>
          {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
          {error && <div style={styles.errorMessage}>{error}</div>}
          
          <div style={isLogin ? styles.form : styles.formGrid}>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="john.doe@example.com" 
                  required 
                  style={styles.input}
                />
            </div>

            {!isLogin && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input 
                  name="full_name"
                  type="text" 
                  placeholder="User" 
                  required
                  style={styles.input}
                />
              </div>
            )}

            {!isLogin && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number</label>
                <input 
                  name="phone_number"
                  type="tel" 
                  placeholder="09********" 
                  required
                  maxLength="11"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                  }}
                  style={styles.input}
                />
              </div>
            )}

            {!isLogin && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Date of Birth</label>
                  <input 
                    name="dob"
                    type="date" 
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>National ID Number (6 Digits)</label>
                  <input 
                    name="nationalId"
                    type="text" 
                    placeholder="XXX-XXX" 
                    pattern="\d{6}"
                    maxLength="6"
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Address Line 1</label>
                  <input 
                    name="address_line1"
                    type="text" 
                    placeholder="123 Main St" 
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>City</label>
                  <input 
                    name="city"
                    type="text" 
                    placeholder="Anytown" 
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>State/Province</label>
                  <select name="state_province" required style={styles.input}>
                    <option value="">Select State</option>
                    <option value="Yangon">Yangon</option>
                    <option value="Mandalay">Mandalay</option>
                    <option value="Naypyidaw">Naypyidaw</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Zip/Postal Code</label>
                  <input 
                    name="zip_postal_code"
                    type="text" 
                    placeholder="12345" 
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Country</label>
                  <select name="country" required style={styles.input}>
                    <option value="">Select Country</option>
                    <option value="Myanmar">Myanmar</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Thailand">Thailand</option>
                  </select>
                </div>
              </>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input 
                name="password"
                type="password" 
                placeholder="••••••••" 
                required
                style={styles.input}
              />
            </div>
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.primaryButton,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner">Processing...</span>
            ) : (
              isLogin ? 'Login' : 'Register'
            )}
          </button>
        </form>

        <div style={styles.toggleText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={styles.linkButton}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
