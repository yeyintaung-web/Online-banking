import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [user, setUser] = useState(null); // { email, name, user_type }
  const [isAuth, setIsAuth] = useState(false);

  // Check for session on application start
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuth(true);
    }
  }, []);


  const handleAuthSuccess = (userData) => {
    const userProfile = {
      email: userData.email,
      name: userData.full_name,
      user_type: userData.user_type,
      id: userData.id,
      date_of_birth: userData.date_of_birth,
      phone_number: userData.phone_number,
      address_line1: userData.address_line1,
      city: userData.city,
      state_province: userData.state_province,
      zip_postal_code: userData.zip_postal_code,
      country: userData.country,
      national_id: userData.national_id
    };

    // Save to state
    setUser(userProfile);
    setIsAuth(true);

    // Save to session (localStorage)
    localStorage.setItem('user', JSON.stringify(userProfile));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuth(false);
    localStorage.removeItem('user'); // Clear session
  };

  // 1. Secure Routing: If not authenticated or data is loading, show Auth/Loading
  if (!isAuth || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. Verified Intelligence: Route to the appropriate command center
  if (user.user_type === 'Admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
}

export default App;
