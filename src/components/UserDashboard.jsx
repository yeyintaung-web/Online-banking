import React, { useState, useEffect } from 'react';
import { styles } from './styles';

const UserDashboard = ({ user, onLogout }) => {
  const [bankingDetails, setBankingDetails] = useState({
    balance: '0.00',
    account_number: 'N/A',
    transactions: []
  });
  const [currentStatus, setCurrentStatus] = useState(user.status);
  const [transferData, setTransferData] = useState({ recipient: '', amount: '', password: '' });
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recipientName, setRecipientName] = useState('');

  // Responsive States
  const [width, setWidth] = useState(window.innerWidth);
  const isTablet = width < 1024;
  const isMobile = width < 768;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 4000);
  };

  const updateStatus = (newStatus) => {
    setCurrentStatus(newStatus);
  };

  const fetchDetails = async () => {
    try {
      const response = await fetch(`/api/user/details/${user.id}`);
      const data = await response.json();
      setBankingDetails(data);
      if (data.status) updateStatus(data.status);
      setIsInitialSync(false);
    } catch (err) {
      console.error('Failed to fetch details:', err);
      setIsInitialSync(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const timer = setInterval(() => {
      if (currentStatus !== 'Approved') fetchDetails();
    }, 10000);

    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStatus]);

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.recipient || !transferData.amount) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/user/verify-account/${transferData.recipient}`);
      const data = await response.json();
      if (data.success) {
        setRecipientName(data.fullName);
        setShowConfirmModal(true);
      } else {
        showToast(data.error || 'Recipient not found', 'error');
      }
    } catch (err) {
      showToast('Account verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/user/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          recipientAccountNumber: transferData.recipient,
          amount: transferData.amount,
          password: transferData.password
        }),
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message, 'success');
        setTransferData({ recipient: '', amount: '', password: '' });
        setShowConfirmModal(false);
        fetchDetails();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Connection failure', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.id || isInitialSync) {
    return (
      <div style={{ ...modernStyles.layout, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>🏦</div>
        <h2 style={{ fontWeight: '900', color: '#1DB954' }}>Synchronizing with Loyal Bank...</h2>
        <p style={{ color: '#666' }}>Securely fetching your latest account details.</p>
      </div>
    );
  }

  return (
    <div style={modernStyles.layout}>
      {/* Mobile Top Header */}
      {isTablet && (
        <div style={modernStyles.mobileHeader}>
          <button onClick={() => setMobileMenuOpen(true)} style={modernStyles.mobileMenuBtn}>☰</button>
          <div style={modernStyles.avatarSmall}>{user.name?.charAt(0)}</div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div style={{
        ...modernStyles.sidebar,
        ...(isTablet ? {
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: mobileMenuOpen ? '20px 0 50px rgba(0,0,0,0.1)' : 'none'
        } : {})
      }}>
        {isTablet && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
          >
            ✕
          </button>
        )}
        <div style={modernStyles.logoSection}>
          <div style={modernStyles.logoIcon}>🏦</div>
          <h2 style={modernStyles.logoText}>Loyal Bank Test</h2>
        </div>

        <nav style={modernStyles.nav}>
          <button
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'overview' ? modernStyles.navActive : {}) }}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('transfer'); setMobileMenuOpen(false); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'transfer' ? modernStyles.navActive : {}) }}
          >
            Transfer Money
          </button>
          <button
            onClick={() => { setActiveTab('transactions'); setMobileMenuOpen(false); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'transactions' ? modernStyles.navActive : {}) }}
          >
            History
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'profile' ? modernStyles.navActive : {}) }}
          >
            Profile
          </button>
        </nav>

        <button onClick={onLogout} style={modernStyles.logoutBtn}>
          Log Out
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isTablet && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 950 }}
        />
      )}

      {/* Main Content Area */}
      <main style={{
        ...modernStyles.main,
        padding: isMobile ? '1.5rem' : (isTablet ? '2rem' : '2.5rem 4rem'),
        paddingTop: isTablet ? '100px' : '2.5rem'
      }}>
        {currentStatus !== 'Approved' && (
          <div style={modernStyles.bannerPending}>⚠️ Verification Required: Your account is currently under review.</div>
        )}

        <header style={{ ...modernStyles.header, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '1.5rem' : '0' }}>
          <div>
            <h1 style={{ ...modernStyles.greeting, fontSize: isMobile ? '1.8rem' : '2.2rem' }}>Welcome back, {user.name.split(' ')[0]}</h1>
            <p style={modernStyles.subGreeting}>Here is what's happening today.</p>
          </div>
          <div style={modernStyles.statusBadge}>
            <span style={{ ...modernStyles.statusDot, backgroundColor: currentStatus === 'Approved' ? '#1DB954' : '#f59e0b' }}></span>
            {currentStatus}
          </div>
        </header>

        <section style={{ ...modernStyles.contentGrid, gridTemplateColumns: isTablet ? '1fr' : '1.1fr 0.9fr' }}>
          {activeTab === 'overview' && (
            <>
              {/* Virtual Card View */}
              <div style={{ ...modernStyles.glassCard, padding: isMobile ? '1.5rem' : '2.5rem' }}>
                <div style={modernStyles.cardHeader}>
                  <p style={modernStyles.cardBrand}>Loyal Card</p>
                  <p style={modernStyles.cardChip}>░░</p>
                </div>
                <div style={modernStyles.cardBody}>
                  <p style={modernStyles.cardLabel}>Available Balance</p>
                  <h3 style={{ ...modernStyles.cardBalance, fontSize: isMobile ? '2.5rem' : '3rem' }}>${(parseFloat(bankingDetails.balance) || 0).toFixed(2)}</h3>
                </div>
                <div style={{ ...modernStyles.cardFooter, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? '12px' : '0' }}>
                  <div>
                    <p style={modernStyles.cardLabel}>Account Number</p>
                    <p style={{ ...modernStyles.cardId, fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
                      {currentStatus === 'Approved' ? bankingDetails.account_number : '•••• •••• ••••'}
                    </p>
                  </div>
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <p style={modernStyles.cardLabel}>Holder</p>
                    <p style={{ ...modernStyles.cardHolder, fontSize: isMobile ? '0.85rem' : '1rem' }}>{user.name}</p>
                  </div>
                </div>
              </div>

              {/* Quick Transaction Feed */}
              <div style={{ ...modernStyles.activitySection, padding: isMobile ? '1.5rem' : '2rem' }}>
                <h3 style={modernStyles.sectionTitle}>Recent Activity</h3>
                <div style={modernStyles.txList}>
                  {bankingDetails.transactions.length === 0 ? (
                    <p style={modernStyles.emptyText}>No transactions found.</p>
                  ) : (
                    bankingDetails.transactions.slice(0, 4).map(t => {
                      const isSent = t.sender_id === user.id;
                      return (
                        <div key={t.id} style={{ ...modernStyles.txRow, gap: isMobile ? '12px' : '16px' }}>
                          <div style={{ ...modernStyles.txAvatar, width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', fontSize: isMobile ? '1rem' : '1.2rem' }}>
                            {t.type === 'Deposit' ? <i className="fa-solid fa-star"></i> : (isSent ? '↗' : '↙')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ ...modernStyles.txName, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                              {t.type === 'Deposit' ? 'Loyal Bank Deposit' : (isSent ? `To: ${t.receiver_name}` : `From: ${t.sender_name}`)}
                            </p>
                            <p style={modernStyles.txDate}>{new Date(t.created_at).toLocaleDateString()}</p>
                          </div>
                          <p style={{ ...modernStyles.txAmount, fontSize: isMobile ? '0.95rem' : '1.1rem', color: isSent ? '#ef4444' : '#1DB954' }}>
                            {isSent ? '-' : '+'}${(parseFloat(t.amount) || 0).toFixed(2)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'transfer' && (
            <div style={{ ...modernStyles.formContainer, padding: isMobile ? '2rem' : '3.5rem' }}>
              <h1 style={modernStyles.sectionTitle}>Secure Transfer</h1>
              {currentStatus !== 'Approved' ? (
                <div style={modernStyles.lockOverlay}>
                  <p style={{ fontSize: '3rem' }}>🔒</p>
                  <h3>Verification Required</h3>
                  <p>Please wait for admin approval to access transfers.</p>
                </div>
              ) : (
                <form onSubmit={handleInitiateTransfer} style={modernStyles.form}>
                  <div style={modernStyles.inputGroup}>
                    <label style={modernStyles.label}>Recipient Account Number</label>
                    <input
                      type="text"
                      value={transferData.recipient}
                      onChange={(e) => setTransferData({ ...transferData, recipient: e.target.value })}
                      placeholder="e.g. 1001234567"
                      required
                      style={modernStyles.input}
                    />
                  </div>
                  <div style={modernStyles.inputGroup}>
                    <label style={modernStyles.label}>Amount ($)</label>
                    <input
                      type="number"
                      value={transferData.amount}
                      onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                      style={modernStyles.input}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={modernStyles.submitBtn}>
                    {loading ? 'Verifying...' : 'Process Payment Now'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div style={{ width: '100%', gridColumn: '1 / -1' }}>
              <h2 style={modernStyles.sectionTitle}>Full Transaction History</h2>
              <div style={modernStyles.txGrid}>
                {bankingDetails.transactions.map(t => {
                  const isSent = t.sender_id === user.id;
                  const dateObj = new Date(t.created_at);
                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={t.id} style={{
                      ...modernStyles.txItemFull,
                      gridTemplateColumns: isMobile ? '1fr' : '1.2fr 2fr 1fr',
                      gap: isMobile ? '1rem' : '0'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={modernStyles.txDateLarge}>{formattedDate}</span>
                        <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: '700' }}>{formattedTime}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ ...modernStyles.txDescLarge, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                          {t.type === 'Deposit' ? 'Official Bank Deposit' : (isSent ? `Transfer to: ${t.receiver_name}` : `Received from: ${t.sender_name}`)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: '800', letterSpacing: '0.5px' }}>REF: {t.id}</span>
                      </div>
                      <span style={{ ...modernStyles.txAmountLarge, fontSize: isMobile ? '1rem' : '1.2rem', textAlign: isMobile ? 'left' : 'right', color: isSent ? '#ef4444' : '#1DB954' }}>
                        {isSent ? '-' : '+'}${(parseFloat(t.amount) || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ ...modernStyles.formContainer, padding: isMobile ? '2rem' : '3.5rem' }}>
              <h2 style={modernStyles.sectionTitle}>Identity & Security Profile</h2>
              <div style={{ ...modernStyles.profileGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>Personal Identity</label>
                  <p style={modernStyles.profileValue}>{user.name}</p>
                  <span style={modernStyles.profileSub}>Full Legal Name</span>
                </div>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>Electronic Mail</label>
                  <p style={modernStyles.profileValue}>{user.email}</p>
                  <span style={modernStyles.profileSub}>Primary Contact</span>
                </div>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>Mobile Registry</label>
                  <p style={modernStyles.profileValue}>{user.phone_number || 'Not Provided'}</p>
                  <span style={modernStyles.profileSub}>Verified Phone</span>
                </div>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>Birth Registry</label>
                  <p style={modernStyles.profileValue}>{new Date(user.date_of_birth).toLocaleDateString()}</p>
                  <span style={modernStyles.profileSub}>Date of Birth</span>
                </div>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>National Identifier</label>
                  <p style={modernStyles.profileValue}>XXX-{(bankingDetails.national_id || user.national_id || 'XXX').toString().slice(-3)}</p>
                  <span style={modernStyles.profileSub}>Government ID</span>
                </div>
                <div style={modernStyles.profileField}>
                  <label style={modernStyles.profileLabel}>Account Standing</label>
                  <p style={{ ...modernStyles.profileValue, color: currentStatus === 'Approved' ? '#1DB954' : '#f59e0b' }}>{currentStatus}</p>
                  <span style={modernStyles.profileSub}>Verification Status</span>
                </div>

                <div style={{ ...modernStyles.profileField, gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1.5px solid #F3FFF6', paddingTop: '1.5rem' }}>
                  <label style={modernStyles.profileLabel}>Residential Address</label>
                  <p style={modernStyles.profileValue}>{user.address_line1 || 'No address on file'}</p>
                  <p style={{ ...modernStyles.profileValue, fontSize: '0.95rem', marginTop: '4px' }}>
                    {user.city}, {user.state_province} {user.zip_postal_code}
                  </p>
                  <p style={{ ...modernStyles.profileValue, fontSize: '0.9rem', opacity: 0.7 }}>{user.country}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Toast */}
      <div style={{
        ...modernStyles.toast,
        right: toast.visible ? '30px' : '-400px',
        opacity: toast.visible ? 1 : 0,
        backgroundColor: toast.type === 'success' ? '#1DB954' : '#ef4444'
      }}>
        {toast.message}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={modernStyles.modalOverlay}>
          <div style={modernStyles.modalContent}>
            <h2 style={{ ...modernStyles.sectionTitle, color: '#1DB954', marginBottom: '1rem' }}>Confirm Transfer</h2>
            <div style={modernStyles.modalSummary}>
              <div style={modernStyles.modalSummaryItem}>
                <span style={modernStyles.modalLabel}>Sending To</span>
                <span style={modernStyles.modalValue}>{recipientName}</span>
                <span style={modernStyles.modalSub}>{transferData.recipient}</span>
              </div>
              <div style={modernStyles.modalSummaryItem}>
                <span style={modernStyles.modalLabel}>Transfer Amount</span>
                <span style={{ ...modernStyles.modalValue, color: '#ef4444', fontSize: '1.8rem' }}>${parseFloat(transferData.amount).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
              <div style={modernStyles.inputGroup}>
                <label style={modernStyles.label}>Confirm with Transaction Password</label>
                <input
                  type="password"
                  value={transferData.password}
                  onChange={(e) => setTransferData({ ...transferData, password: e.target.value })}
                  placeholder="Enter your security password"
                  required
                  autoFocus
                  style={modernStyles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  style={{ ...modernStyles.submitBtn, backgroundColor: '#f1f1f1', color: '#666', flex: 1, margin: 0, padding: '0.7rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: 'none' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...modernStyles.submitBtn, flex: 1, margin: 0, padding: '0.7rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                >
                  {loading ? 'Processing...' : 'Confirm & Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const modernStyles = {
  layout: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#F3FFF6',
    color: '#1E1E1E',
    overflow: 'hidden'
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#FFFFFF',
    borderRight: '1.5px solid #E2F0E5',
    display: 'flex',
    flexDirection: 'column',
    padding: '2.5rem 1.5rem'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '3rem'
  },
  logoIcon: { fontSize: '2rem' },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '900',
    letterSpacing: '-1px',
    margin: 0,
    color: '#1DB954'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1
  },
  navItem: {
    padding: '0.85rem 1.25rem',
    borderRadius: '1rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.95rem',
    fontWeight: '700'
  },
  navActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    color: '#1DB954'
  },
  logoutBtn: {
    marginTop: 'auto',
    padding: '0.85rem',
    borderRadius: '1.2rem',
    border: '1.5px solid #ef4444',
    backgroundColor: 'transparent',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.9rem'
  },
  main: {
    flex: 1,
    padding: '2.5rem 4rem',
    overflowY: 'auto'
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '70px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1.5px solid #E2F0E5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    zIndex: 900
  },
  mobileMenuBtn: {
    fontSize: '1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1DB954'
  },
  avatarSmall: {
    width: '35px',
    height: '35px',
    borderRadius: '10px',
    backgroundColor: '#1DB954',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    fontSize: '0.9rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3.5rem'
  },
  greeting: {
    fontSize: '2.2rem',
    fontWeight: '900',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subGreeting: {
    color: '#666',
    margin: '6px 0 0 0',
    fontSize: '1rem'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    borderRadius: '100px',
    backgroundColor: '#FFFFFF',
    fontSize: '0.85rem',
    fontWeight: '800',
    border: '1.5px solid #E2F0E5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '3rem'
  },
  glassCard: {
    background: 'linear-gradient(135deg, #1DB954 0%, #0F9D58 100%)',
    borderRadius: '2.5rem',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    aspectRatio: '1.63 / 1',
    boxShadow: '0 30px 60px rgba(29, 185, 84, 0.2)',
    position: 'relative',
    color: 'white'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { fontSize: '0.9rem', fontWeight: '900', margin: 0, letterSpacing: '1px' },
  cardChip: { fontSize: '1.8rem', opacity: 0.3, margin: 0 },
  cardLabel: { fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: '700' },
  cardBalance: { fontSize: '3rem', fontWeight: '900', margin: '8px 0 0 0' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardId: { fontSize: '1.1rem', fontWeight: '700', letterSpacing: '3px', margin: 0, marginTop: '6px' },
  cardHolder: { fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', margin: 0, marginTop: '6px' },

  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '2.5rem',
    padding: '2rem',
    boxShadow: '0 15px 35px rgba(15, 157, 88, 0.04)',
    border: '1.5px solid #E2F0E5'
  },
  sectionTitle: { fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem', margin: 0 },
  txList: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  txRow: { display: 'flex', alignItems: 'center', gap: '16px' },
  txAvatar: { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#F3FFF6', color: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '900' },
  txName: { fontSize: '1rem', fontWeight: '800', margin: 0 },
  txDate: { fontSize: '0.8rem', color: '#888', margin: 0 },
  txAmount: { fontSize: '1.1rem', fontWeight: '900', margin: 0 },

  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '2.5rem',
    padding: '3.5rem',
    gridColumn: '1 / -1',
    maxWidth: '650px',
    boxShadow: '0 20px 40px rgba(15, 157, 88, 0.04)',
    border: '1.5px solid #E2F0E5'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.8rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '0.9rem', color: '#444', fontWeight: '700' },
  input: {
    padding: '1.1rem',
    borderRadius: '1.1rem',
    backgroundColor: '#F9FFF9',
    border: '1.5px solid #E2F0E5',
    color: '#1E1E1E',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s'
  },
  submitBtn: {
    padding: '1.1rem',
    borderRadius: '1.1rem',
    backgroundColor: '#1DB954',
    color: 'white',
    border: 'none',
    fontWeight: '800',
    fontSize: '1.1rem',
    cursor: 'pointer',
    marginTop: '1.5rem',
    boxShadow: '0 10px 25px rgba(29, 185, 84, 0.2)'
  },
  lockOverlay: { textAlign: 'center', padding: '4rem 0' },

  txGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  txItemFull: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr 1fr',
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '1.2rem',
    alignItems: 'center',
    border: '1.5px solid #E2F0E5',
    boxShadow: '0 8px 20px rgba(0,0,0,0.01)'
  },
  txDateLarge: { color: '#666', fontSize: '0.9rem', fontWeight: '600' },
  txDescLarge: { fontWeight: '800', fontSize: '1rem' },
  txAmountLarge: { textAlign: 'right', fontWeight: '900', fontSize: '1.2rem' },

  profileGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem 3rem' },
  profileField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  profileLabel: { fontSize: '0.75rem', fontWeight: '800', color: '#1DB954', textTransform: 'uppercase', letterSpacing: '0.5px' },
  profileValue: { fontSize: '1.1rem', fontWeight: '900', margin: 0, color: '#1E1E1E' },
  profileSub: { fontSize: '0.7rem', color: '#999', fontWeight: '600' },

  bannerPending: { backgroundColor: '#f1c40f', color: '#000', padding: '10px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '900', borderRadius: '0', marginBottom: '1rem' },

  toast: {
    position: 'fixed',
    top: '30px',
    padding: '1.2rem 2.5rem',
    borderRadius: '1.5rem',
    color: 'white',
    fontWeight: '800',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    zIndex: 30000
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20000
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: '3rem',
    borderRadius: '2.5rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 40px 100px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  modalSummary: {
    width: '100%',
    backgroundColor: '#F9FFF9',
    padding: '2rem',
    borderRadius: '1.5rem',
    marginBottom: '2rem',
    border: '1.5px solid #E2F0E5',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  modalSummaryItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  modalLabel: { fontSize: '0.75rem', fontWeight: '800', color: '#1DB954', textTransform: 'uppercase' },
  modalValue: { fontSize: '1.3rem', fontWeight: '900', color: '#1E1E1E' },
  modalSub: { fontSize: '0.85rem', color: '#999', fontWeight: '700' }
};

export default UserDashboard;
