import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ user, onLogout }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: '0.00', approvedCount: 0, pendingCount: 0, suspendedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('pending');
  const [depositAmount, setDepositAmount] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Transaction History States
  const [allTransactions, setAllTransactions] = useState([]);
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('All');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const txPerPage = 8;

  // User Profile States
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [profileSearchTerm, setProfileSearchTerm] = useState('');

  // Security Modal State
  const [authModal, setAuthModal] = useState({ visible: false, type: '', data: null });

  const formatBalance = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const fetchGlobalStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data && data.totalBalance !== undefined) setStats(data);
    } catch (err) { console.error('Stats failed:', err); }
  };

  const refreshData = async () => {
    try {
      const pRes = await fetch('/api/admin/pending-users');
      const aRes = await fetch('/api/admin/all-users');
      const tRes = await fetch('/api/admin/all-transactions');
      const pData = await pRes.json();
      const aData = await aRes.json();
      const tData = await tRes.json();

      if (Array.isArray(pData)) setPendingUsers(pData);
      if (Array.isArray(aData)) setAllUsers(aData);
      if (Array.isArray(tData)) setAllTransactions(tData);

      fetchGlobalStats();
    } catch (err) { console.error('Fetch failed:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 4000);
  };

  const handleAction = async (endpoint, payload, method = 'POST') => {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : null,
      });
      const data = await response.json();
      if (data && data.success) {
        showAlert(data.message, 'success');
        refreshData();
        setAuthModal({ visible: false, type: '', data: null });
      } else {
        showAlert(data?.error || 'Action failed', 'error');
      }
    } catch (err) { showAlert('Network error or server failure', 'error'); }
  };

  // Open confirmation modal for different actions
  const openConfirmModal = (type, data) => {
    if (type === 'deposit') {
      if (!depositAmount[data.id] || isNaN(parseFloat(depositAmount[data.id])) || parseFloat(depositAmount[data.id]) <= 0) {
        return showAlert('Enter a valid deposit amount.', 'error');
      }
      if (data.status?.toLowerCase() !== 'approved') {
        return showAlert('Cannot deposit into an inactive or suspended account. Please activate first.', 'error');
      }
    }
    setAuthModal({ visible: true, type, data });
  };

  const executeConfirmedAction = () => {
    if (authModal.type === 'deposit') {
      handleAction('/api/admin/deposit', { userId: authModal.data.id, amount: depositAmount[authModal.data.id] });
    } else if (authModal.type === 'status') {
      handleAction('/api/admin/update-status', {
        userId: authModal.data.id,
        newStatus: authModal.data.status?.toLowerCase() === 'suspended' ? 'Approved' : 'Suspended'
      });
    } else if (authModal.type === 'delete') {
      handleAction('/api/admin/delete-user', { userId: authModal.data.id }, 'POST');
    } else if (authModal.type === 'approve') {
      handleAction('/api/admin/update-status', { userId: authModal.data.id, newStatus: 'Approved' });
    } else if (authModal.type === 'decline') {
      handleAction('/api/admin/delete-user', { userId: authModal.data.id });
    }
  };

  const getUserStats = (userId) => {
    const userTx = allTransactions.filter(t => t.sender_id === userId || t.receiver_id === userId);
    const sent = userTx.filter(t => t.sender_id === userId).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const received = userTx.filter(t => t.receiver_id === userId).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    return { sent, received, count: userTx.length };
  };

  if (loading) return <div style={modernStyles.loadingScreen}>🏦 Securing Loyal Bank Admin...</div>;

  return (
    <div style={modernStyles.layout}>
      {/* Confirmation Modal Layer */}
      {authModal.visible && (
        <div style={modernStyles.modalOverlay}>
          <div style={modernStyles.modalContent}>            
            <h2 style={modernStyles.modalTitle}>Confirm Action</h2>
            <p style={modernStyles.modalSub}>
              Are you sure you want to <strong>{authModal.type.toUpperCase()}</strong> for <strong>{authModal.data.full_name}</strong>? This action will be processed immediately.
            </p>
            <div style={modernStyles.modalActions}>
              <button onClick={executeConfirmedAction} style={modernStyles.modalBtnConfirm}>Confirm & Proceed</button>
              <button onClick={() => setAuthModal({ visible: false, type: '', data: null })} style={modernStyles.modalBtnCancel}>Nevermind, Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Command Center */}
      <aside style={modernStyles.sidebar}>
        <div style={modernStyles.logoContainer}>
          <div style={modernStyles.logoIcon}></div>
          <h2 style={modernStyles.logoText}>LOYAL <span style={{ color: '#555' }}>BANK</span></h2>
        </div>

        <nav style={modernStyles.nav}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{ ...modernStyles.navItem, ...(activeTab === 'pending' ? modernStyles.navActive : {}) }}
          >
             Verification Queue {stats.pendingAlerts > 0 && <span style={modernStyles.badgeSmall}>{stats.pendingAlerts}</span>}
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            style={{ ...modernStyles.navItem, ...(activeTab === 'manage' ? modernStyles.navActive : {}) }}
          >
             User Central
          </button>
          <button
            onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'history' ? modernStyles.navActive : {}) }}
          >
             Transaction History
          </button>
          <button
            onClick={() => { setActiveTab('profiles'); setSelectedProfileUser(null); }}
            style={{ ...modernStyles.navItem, ...(activeTab === 'profiles' ? modernStyles.navActive : {}) }}
          >
             User Dossiers
          </button>
        </nav>

        <div style={modernStyles.userMini}>
          <div style={modernStyles.avatar}>AD</div>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Global Administrator</p>
          </div>
        </div>

        <button onClick={onLogout} style={modernStyles.logoutBtn}>Logout</button>
      </aside>

      {/* Main Command Area */}
      <main style={modernStyles.main}>
        {actionMessage.text && (
          <div style={{ ...modernStyles.toast, backgroundColor: actionMessage.type === 'success' ? '#1DB954' : '#ef4444' }}>
            {actionMessage.text}
          </div>
        )}

        <header style={modernStyles.header}>
          <h1 style={modernStyles.greeting}>Financial <span style={{ color: '#1DB954' }}>Intelligence</span> Dashboard</h1>
          <p style={modernStyles.subGreeting}>Managing world-class liquidity at Loyal Bank.</p>
        </header>

        {/* Global Stats Grid - Extended to 5-Card Intelligence Grid */}
        <div style={modernStyles.statsGrid}>
          <div style={modernStyles.statCard}>
            <p style={modernStyles.statLabel}>Global Liquidity</p>
            <h3 style={{ ...modernStyles.statValue, color: '#1DB954' }}>${formatBalance(stats.totalBalance)}</h3>
            <span style={modernStyles.statChange}>Total Bank Assets</span>
          </div>
          <div style={modernStyles.statCard}>
            <p style={modernStyles.statLabel}>Customer Base</p>
            <h3 style={modernStyles.statValue}>{stats.totalUsers || 0}</h3>
            <span style={modernStyles.statChange}>Total Accounts</span>
          </div>
          <div style={{ ...modernStyles.statCard, borderLeft: '5px solid #1DB954' }}>
            <p style={modernStyles.statLabel}>Verified</p>
            <h3 style={{ ...modernStyles.statValue, color: '#1DB954' }}>{stats.approvedCount || 0}</h3>
            <span style={modernStyles.statChange}>Active Accounts</span>
          </div>
          <div style={{ ...modernStyles.statCard, borderLeft: '5px solid #f59e0b' }}>
            <p style={modernStyles.statLabel}>Pending</p>
            <h3 style={{ ...modernStyles.statValue, color: '#f59e0b' }}>{stats.pendingCount || 0}</h3>
            <span style={modernStyles.statChange}>Vetting Queue</span>
          </div>
          <div style={{ ...modernStyles.statCard, borderLeft: '5px solid #ef4444' }}>
            <p style={modernStyles.statLabel}>Frozen</p>
            <h3 style={{ ...modernStyles.statValue, color: '#ef4444' }}>{stats.suspendedCount || 0}</h3>
            <span style={modernStyles.statChange}>Suspended Assets</span>
          </div>
        </div>

        <section style={modernStyles.contentSection}>
          {activeTab === 'pending' && (
            <div>
              <h2 style={modernStyles.sectionTitle}>Verification Queue</h2>
              <div style={modernStyles.cardGrid}>
                {pendingUsers.length === 0 ? (
                  <div style={modernStyles.emptyCard}>All customer applications are fully verified!</div>
                ) : (
                  pendingUsers.map(pUser => (
                    <div key={pUser.id} style={modernStyles.userCard}>
                      <div style={modernStyles.cardHead}>
                        <h4 style={modernStyles.userName}>{pUser.full_name}</h4>
                        <span style={modernStyles.userBadge}>{pUser.email}</span>
                      </div>
                      <div style={modernStyles.cardDetails}>
                        <div style={modernStyles.detailItem}><span>ID CARD</span><p>{pUser.national_id}</p></div>
                        <div style={modernStyles.detailItem}><span>BIRTH</span><p>{new Date(pUser.date_of_birth).toLocaleDateString()}</p></div>
                        <div style={modernStyles.detailItem}><span>PHONE</span><p>{pUser.phone_number}</p></div>
                        <div style={{ ...modernStyles.detailItem, flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span>ADDRESS</span>
                          <p style={{ margin: 0 }}>{pUser.address_line1}</p>
                          <p style={{ margin: 0, opacity: 0.7 }}>{pUser.city}, {pUser.state_province} {pUser.zip_postal_code} ({pUser.country})</p>
                        </div>
                      </div>
                      <div style={modernStyles.cardActions}>
                        <button onClick={() => openConfirmModal('approve', pUser)} style={modernStyles.btnApprove}>Approve Account</button>
                        <button onClick={() => openConfirmModal('decline', pUser)} style={modernStyles.btnDecline}>Decline Account</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div>
              <h2 style={modernStyles.sectionTitle}>User Central</h2>
              <div style={modernStyles.searchContainer}>
                <i className="fa-solid fa-magnifying-glass" style={modernStyles.searchIcon}></i>
                <input
                  type="text"
                  placeholder="Search by Name or Account Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={modernStyles.searchInput}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={modernStyles.statusSelect}
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div style={modernStyles.tableBox}>
                <table style={modernStyles.table}>
                  <thead style={modernStyles.thead}>
                    <tr>
                      <th style={modernStyles.th}>IDENTITY</th>
                      <th style={modernStyles.th}>FINANCE</th>
                      <th style={modernStyles.th}>SECURITY STATUS</th>
                      <th style={modernStyles.th}>CONTROL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter(u => {
                        const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.account_number?.includes(searchTerm);
                        const matchesStatus = statusFilter === 'All' || u.status?.toLowerCase() === statusFilter.toLowerCase();
                        return matchesSearch && matchesStatus;
                      })
                      .map(aUser => (
                        <tr key={aUser.id} style={modernStyles.tr}>
                          <td style={modernStyles.td}>
                            <p style={{ margin: 0, fontWeight: '700' }}>{aUser.full_name}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>{aUser.account_number}</p>
                          </td>
                          <td style={modernStyles.td}>
                            <p style={{ ...modernStyles.balanceText, color: '#1DB954' }}>${formatBalance(aUser.balance)}</p>
                          </td>
                          <td style={modernStyles.td}>
                            <span style={{
                              ...modernStyles.statusTag,
                              backgroundColor: aUser.status?.toLowerCase() === 'approved' ? '#1DB954' : aUser.status?.toLowerCase() === 'suspended' ? '#ef4444' : '#f59e0b'
                            }}>
                              {aUser.status}
                            </span>
                          </td>
                          <td style={modernStyles.td}>
                            <div style={modernStyles.actionGroup}>
                              <div style={modernStyles.depositGroup}>
                                <input
                                  type="number"
                                  placeholder="$"
                                  value={depositAmount[aUser.id] || ''}
                                  onChange={(e) => setDepositAmount({ ...depositAmount, [aUser.id]: e.target.value })}
                                  style={modernStyles.smallInput}
                                />
                                <button onClick={() => openConfirmModal('deposit', aUser)} style={modernStyles.btnDeposit}>Top Up</button>
                              </div>
                              <button onClick={() => openConfirmModal('status', aUser)} style={modernStyles.btnSub}>
                                {aUser.status?.toLowerCase() === 'suspended' ? 'Resume' : 'Pause'}
                              </button>
                              <button onClick={() => openConfirmModal('delete', aUser)} style={modernStyles.btnSubRed}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={modernStyles.sectionTitle}>Global Transaction Ledger</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={refreshData} style={modernStyles.btnDeposit}>Refresh Data</button>
                </div>
              </div>

              {/* Advanced Filter Bar - Matching Image */}
              <div style={modernStyles.historyFilterBar}>
                <div style={modernStyles.filterGroup}>
                  <label style={modernStyles.filterLabel}>Search Transaction</label>
                  <input
                    type="text"
                    placeholder="ID, Name, Acc, or Amount..."
                    value={txSearchTerm}
                    onChange={(e) => setTxSearchTerm(e.target.value)}
                    style={modernStyles.historyInput}
                  />
                </div>
                <div style={modernStyles.filterGroup}>
                  <label style={modernStyles.filterLabel}>Start Date</label>
                  <input
                    type="date"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    style={modernStyles.historyInput}
                  />
                </div>
                <div style={modernStyles.filterGroup}>
                  <label style={modernStyles.filterLabel}>End Date</label>
                  <input
                    type="date"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    style={modernStyles.historyInput}
                  />
                </div>
                <div style={modernStyles.filterGroup}>
                  <label style={modernStyles.filterLabel}>Transaction Type</label>
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    style={modernStyles.historySelect}
                  >
                    <option value="All">All Types</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Deposit">Deposit</option>
                  </select>
                </div>
                <button
                  onClick={() => { setCurrentPage(1); refreshData(); }}
                  style={modernStyles.btnApplyFilters}
                >
                  Apply Filters
                </button>
              </div>

              <div style={modernStyles.tableBox}>
                <table style={modernStyles.table}>
                  <thead style={modernStyles.thead}>
                    <tr>
                      <th style={modernStyles.th}>TRANSACTION ID</th>
                      <th style={modernStyles.th}>DATE</th>
                      <th style={modernStyles.th}>PARTIES (SENDER ➔ RECEIVER)</th>
                      <th style={modernStyles.th}>TYPE</th>
                      <th style={modernStyles.th}>AMOUNT</th>
                      <th style={modernStyles.th}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions
                      .filter(tx => {
                        const term = txSearchTerm.toLowerCase();
                        const matchesSearch =
                          tx.id.toLowerCase().includes(term) ||
                          tx.sender_name?.toLowerCase().includes(term) ||
                          tx.receiver_name?.toLowerCase().includes(term) ||
                          tx.sender_account?.includes(term) ||
                          tx.receiver_account?.includes(term) ||
                          tx.amount.toString().includes(term);

                        const matchesType = txTypeFilter === 'All' || tx.type === txTypeFilter;

                        const txDate = new Date(tx.created_at);
                        const matchesStart = !txStartDate || txDate >= new Date(txStartDate);
                        const matchesEnd = !txEndDate || txDate <= new Date(new Date(txEndDate).setHours(23, 59, 59));

                        return matchesSearch && matchesType && matchesStart && matchesEnd;
                      })
                      .slice((currentPage - 1) * txPerPage, currentPage * txPerPage)
                      .map(tx => {
                        const dateObj = new Date(tx.created_at);
                        const isDeposit = tx.type === 'Deposit';
                        return (
                          <tr key={tx.id} style={modernStyles.tr}>
                            <td style={{ ...modernStyles.td, fontWeight: '800', color: '#666' }}>{tx.id}</td>
                            <td style={modernStyles.td}>
                              <p style={{ margin: 0, fontWeight: '700' }}>{dateObj.toLocaleDateString()}</p>
                              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>{dateObj.toLocaleTimeString()}</p>
                            </td>
                            <td style={modernStyles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: '800', color: '#1E1E1E' }}>
                                    {isDeposit ? 'Official Bank' : tx.sender_name}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: '#999', fontWeight: '700' }}>
                                    {isDeposit ? 'System' : `Bank Acc: ${tx.sender_account}`}
                                  </span>
                                </div>
                                <span style={{ color: '#1DB954', fontWeight: '900' }}>➔</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: '800', color: '#1E1E1E' }}>{tx.receiver_name}</span>
                                  <span style={{ fontSize: '0.65rem', color: '#1DB954', fontWeight: '800' }}>
                                    Bank Acc: {tx.receiver_account}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={modernStyles.td}>
                              <span style={{ fontWeight: '800', color: isDeposit ? '#0F9D58' : '#1E1E1E' }}>{tx.type}</span>
                            </td>
                            <td style={{ ...modernStyles.td, fontWeight: '900', color: isDeposit ? '#1DB954' : '#ef4444' }}>
                              {isDeposit ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                            </td>
                            <td style={modernStyles.td}>
                              <span style={{ ...modernStyles.statusTag, backgroundColor: '#1DB954' }}>Completed</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={modernStyles.pagination}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={modernStyles.pageBtn}
                >
                  Previous
                </button>
                <div style={modernStyles.pageNumbers}>
                  {[...Array(Math.ceil(allTransactions.length / txPerPage))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      style={{ ...modernStyles.pageNum, ...(currentPage === i + 1 ? modernStyles.pageNumActive : {}) }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={currentPage >= Math.ceil(allTransactions.length / txPerPage)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={modernStyles.pageBtn}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div style={modernStyles.profileLayout}>
              {/* Left Column: User Selection */}
              <div style={modernStyles.profileSider}>
                <h3 style={{ ...modernStyles.sectionTitle, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Select User</h3>
                <div style={{ ...modernStyles.searchContainer, padding: '0.4rem 1rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={profileSearchTerm}
                    onChange={(e) => setProfileSearchTerm(e.target.value)}
                    style={modernStyles.searchInput}
                  />
                </div>
                <div style={modernStyles.profileList}>
                  {allUsers
                    .filter(u =>
                      u.full_name?.toLowerCase().includes(profileSearchTerm.toLowerCase()) ||
                      u.national_id?.includes(profileSearchTerm) ||
                      u.account_number?.includes(profileSearchTerm)
                    )
                    .map(u => (
                      <div
                        key={u.id}
                        onClick={() => setSelectedProfileUser(u)}
                        style={{
                          ...modernStyles.profileListItem,
                          ...(selectedProfileUser?.id === u.id ? modernStyles.profileListActive : {})
                        }}
                      >
                        <div style={modernStyles.avatarSmall}>{u.full_name.charAt(0)}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{u.full_name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>{u.account_number}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Detailed Dossier */}
              <div style={modernStyles.profileDossier}>
                {!selectedProfileUser ? (
                  <div style={modernStyles.dossierEmpty}>
                    <i className="fa-solid fa-folder" style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }}></i>
                    <h3>Select a customer profile to view the formal bank dossier.</h3>
                  </div>
                ) : (
                  <div style={modernStyles.dossierContent}>
                    <header style={modernStyles.dossierHeader}>
                      <div style={modernStyles.avatarLarge}>{selectedProfileUser.full_name.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{selectedProfileUser.full_name}</h2>
                        <p style={{ margin: '4px 0', color: '#1DB954', fontWeight: '800' }}>Bank ID: {selectedProfileUser.account_number}</p>
                        <div style={{ ...modernStyles.statusTag, backgroundColor: selectedProfileUser.status?.toLowerCase() === 'approved' ? '#1DB954' : '#ef4444', display: 'inline-block', marginTop: '5px' }}>
                          {selectedProfileUser.status}
                        </div>
                      </div>
                    </header>

                    {/* Financial Dossier Summary */}
                    <div style={modernStyles.miniStats}>
                      {(() => {
                        const uStats = getUserStats(selectedProfileUser.id);
                        return (
                          <>
                            <div style={{ ...modernStyles.miniStatCard, borderLeft: '4px solid #1DB954' }}>
                              <span>Current Balance</span>
                              <h4 style={{ color: '#1DB954' }}>${formatBalance(selectedProfileUser.balance)}</h4>
                            </div>
                            <div style={modernStyles.miniStatCard}>
                              <span>Total Incoming</span>
                              <h4>+${uStats.received.toFixed(2)}</h4>
                            </div>
                            <div style={modernStyles.miniStatCard}>
                              <span>Total Outgoing</span>
                              <h4 style={{ color: '#ef4444' }}>-${uStats.sent.toFixed(2)}</h4>
                            </div>
                            <div style={modernStyles.miniStatCard}>
                              <span>Member Since</span>
                              <h4>{new Date(selectedProfileUser.created_at).toLocaleDateString()}</h4>
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    <div style={modernStyles.dossierGrid}>
                      <section style={modernStyles.dossierSection}>
                        <h4 style={modernStyles.dossierLabel}>Identity & Verification</h4>
                        <div style={modernStyles.dossierInfo}>
                          <div style={modernStyles.infoSet}><span>Legal Name</span><p>{selectedProfileUser.full_name}</p></div>
                          <div style={modernStyles.infoSet}><span>National ID</span><p>{selectedProfileUser.national_id}</p></div>
                          <div style={modernStyles.infoSet}><span>Date of Birth</span><p>{new Date(selectedProfileUser.date_of_birth).toLocaleDateString()}</p></div>
                          <div style={modernStyles.infoSet}><span>Phone Verified</span><p>{selectedProfileUser.phone_number}</p></div>
                        </div>
                      </section>

                      <section style={modernStyles.dossierSection}>
                        <h4 style={modernStyles.dossierLabel}>Primary Residence</h4>
                        <div style={modernStyles.dossierInfo}>
                          <p style={{ margin: 0, fontWeight: '700' }}>{selectedProfileUser.address_line1}</p>
                          <p style={{ margin: '4px 0' }}>{selectedProfileUser.city}, {selectedProfileUser.state_province} {selectedProfileUser.zip_postal_code}</p>
                          <p style={{ margin: 0, opacity: 0.7 }}>{selectedProfileUser.country}</p>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const modernStyles = {
  layout: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#F3FFF6', color: '#1E1E1E', overflow: 'hidden', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#1E1E1E', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', color: 'white' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '3.5rem' },
  logoIcon: { fontSize: '2rem' },
  logoText: { fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-1px', margin: 0, color: '#1DB954' },
  nav: { display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 },
  navItem: { padding: '1rem 1.2rem', borderRadius: '14px', border: 'none', backgroundColor: 'transparent', color: '#888', textAlign: 'left', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '700', transition: 'all 0.3s' },
  navActive: { backgroundColor: 'rgba(29, 185, 84, 0.15)', color: '#1DB954' },
  badgeSmall: { backgroundColor: '#f59e0b', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginLeft: '5px' },
  userMini: { marginTop: 'auto', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '15px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' },
  logoutBtn: { padding: '1rem', borderRadius: '14px', border: '1.5px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '800', transition: '0.3s' },
  main: { flex: 1, padding: '3rem 4.5rem', overflowY: 'auto' },
  header: { marginBottom: '3rem' },
  greeting: { fontSize: '2.4rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' },
  subGreeting: { color: '#666', margin: '4px 0 0 0', fontWeight: '500' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '3.5rem' },
  statCard: { backgroundColor: 'white', padding: '2rem', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1.5px solid #E2F0E5' },
  statLabel: { fontSize: '0.85rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', margin: 0 },
  statValue: { fontSize: '2.2rem', fontWeight: '900', margin: '10px 0' },
  statChange: { fontSize: '0.8rem', color: '#666', fontWeight: '600' },
  contentSection: { width: '100%' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
  userCard: { backgroundColor: 'white', padding: '1.8rem', borderRadius: '25px', border: '1.5px solid #E2F0E5', boxShadow: '0 15px 40px rgba(0,0,0,0.02)' },
  userName: { margin: 0, fontSize: '1.1rem', fontWeight: '800' },
  userBadge: { fontSize: '0.85rem', color: '#1DB954', fontWeight: '700' },
  cardDetails: { margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '10px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' },
  cardActions: { display: 'flex', gap: '10px' },
  btnApprove: { flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', backgroundColor: '#1DB954', color: 'white', fontWeight: '800', cursor: 'pointer' },
  btnDecline: { flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1.5px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontWeight: '800', cursor: 'pointer' },
  tableBox: { backgroundColor: 'white', borderRadius: '25px', overflow: 'hidden', border: '1.5px solid #E2F0E5' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#F9FFF9' },
  th: { padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#0F9D58', textTransform: 'uppercase' },
  tr: { borderBottom: '1.5px solid #F3FFF6' },
  td: { padding: '1.2rem', fontSize: '0.9rem' },
  balanceText: { fontWeight: '900', margin: 0 },
  statusTag: { padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' },
  actionGroup: { display: 'flex', gap: '12px', alignItems: 'center' },
  depositGroup: { display: 'flex', gap: '5px' },
  smallInput: { width: '100px', padding: '8px', borderRadius: '10px', border: '1.5px solid #E2F0E5', outline: 'none', fontWeight: '800' },
  btnDeposit: { backgroundColor: '#1DB954', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontWeight: '800' },
  btnSub: { backgroundColor: '#1E1E1E', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' },
  btnSubRed: { backgroundColor: 'transparent', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' },
  welcomeView: { padding: '1rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' },
  infoBlock: { padding: '2rem', borderRadius: '25px', backgroundColor: 'white', border: '1.5px solid #E2F0E5' },
  loadingScreen: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3FFF6', fontSize: '1.5rem', fontWeight: '900', color: '#1DB954' },
  toast: { position: 'fixed', top: '20px', right: '20px', padding: '1rem 2rem', borderRadius: '15px', color: 'white', fontWeight: '800', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 9999 },
  emptyCard: { padding: '3rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: '700', color: '#666', border: '1.5px dashed #E2F0E5', borderRadius: '25px', gridColumn: '1 / -1' },

  // Modal Styles (Simple Confirmation)
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' },
  modalContent: { backgroundColor: 'white', padding: '3rem', borderRadius: '30px', width: '450px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', textAlign: 'center', border: '1.5px solid #E2F0E5' },
  modalIcon: { fontSize: '3rem', marginBottom: '1.5rem' },
  modalTitle: { margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#1E1E1E' },
  modalSub: { color: '#666', margin: '1rem 0 2.5rem 0', fontSize: '1rem', lineHeight: '1.5' },
  modalActions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  modalBtnConfirm: { width: '100%', padding: '1.2rem', borderRadius: '15px', border: 'none', backgroundColor: '#1DB954', color: 'white', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(29, 185, 84, 0.2)' },
  modalBtnCancel: { width: '100%', padding: '0.8rem', borderRadius: '15px', border: 'none', backgroundColor: 'transparent', color: '#888', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' },

  // Search Bar Styles
  searchContainer: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '0.5rem 1.5rem', marginBottom: '1.5rem', border: '1.5px solid #E2F0E5', boxShadow: '0 5px 15px rgba(0,0,0,0.02)', gap: '12px' },
  searchIcon: { fontSize: '1.2rem', opacity: 0.5 },
  searchInput: { flex: 1, border: 'none', outline: 'none', padding: '10px 0', fontSize: '0.95rem', fontWeight: '600', color: '#1E1E1E', backgroundColor: 'transparent' },
  statusSelect: { border: 'none', outline: 'none', padding: '10px 15px', fontSize: '0.85rem', fontWeight: '800', color: '#1DB954', backgroundColor: '#F9FFF9', borderRadius: '12px', cursor: 'pointer', appearance: 'none', border: '1.5px solid rgba(29, 185, 84, 0.2)' },

  // History Page Specific Styles
  historyFilterBar: { display: 'flex', gap: '20px', backgroundColor: 'white', padding: '2rem', borderRadius: '25px', marginBottom: '2rem', border: '1.5px solid #E2F0E5', alignItems: 'flex-end', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  filterLabel: { fontSize: '0.75rem', fontWeight: '800', color: '#1E1E1E', textTransform: 'uppercase', letterSpacing: '0.5px' },
  historyInput: { padding: '12px 15px', borderRadius: '12px', border: '1.5px solid #E2F0E5', outline: 'none', fontSize: '0.9rem', fontWeight: '600', backgroundColor: '#FFFFFF', color: '#1E1E1E' },
  historySelect: { padding: '12px 15px', borderRadius: '12px', border: '1.5px solid #E2F0E5', outline: 'none', fontSize: '0.9rem', fontWeight: '800', color: '#1DB954', backgroundColor: '#F9FFF9' },
  btnApplyFilters: { padding: '12px 25px', borderRadius: '12px', border: 'none', backgroundColor: '#1DB954', color: 'white', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 15px rgba(29, 185, 84, 0.2)' },
  btnViewDetails: { backgroundColor: 'transparent', border: 'none', color: '#666', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' },

  // Pagination Styles
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' },
  pageNumbers: { display: 'flex', gap: '10px' },
  pageBtn: { padding: '10px 20px', borderRadius: '12px', border: '1.5px solid #E2F0E5', backgroundColor: '#ffffff', color: '#1E1E1E', fontWeight: '800', cursor: 'pointer', transition: '0.2s' },
  pageNum: { width: '40px', height: '40px', borderRadius: '12px', border: '1.5px solid #E2F0E5', backgroundColor: '#ffffff', color: '#1E1E1E', fontWeight: '800', cursor: 'pointer' },
  pageNumActive: { backgroundColor: '#1DB954', color: 'white', border: 'none' },

  // Dossier & Profile Management Styles
  profileLayout: { display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '2rem', height: '70vh' },
  profileSider: { backgroundColor: 'white', borderRadius: '25px', padding: '1.5rem', border: '1.5px solid #E2F0E5', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  profileList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  profileListItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '15px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' },
  profileListActive: { backgroundColor: 'rgba(29, 185, 84, 0.08)', borderColor: 'rgba(29, 185, 84, 0.3)' },
  avatarSmall: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f3fff6', color: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', border: '1.5px solid #E2F0E5' },
  profileDossier: { backgroundColor: 'white', borderRadius: '25px', border: '1.5px solid #E2F0E5', overflowY: 'auto' },
  dossierEmpty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999', opacity: 0.7 },
  dossierContent: { padding: '3rem' },
  dossierHeader: { display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '3rem', borderBottom: '1.5px solid #f3fff6', paddingBottom: '2.5rem' },
  avatarLarge: { width: '100px', height: '100px', borderRadius: '30px', backgroundColor: '#1E1E1E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: '900' },
  miniStats: { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' },
  miniStatCard: { flex: 1, minWidth: '200px', backgroundColor: '#F9FFF9', padding: '1.2rem', borderRadius: '18px', border: '1.5px solid #E2F0E5' },
  miniStatCard_span: { fontSize: '0.65rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' },
  miniStatCard_h4: { margin: '5px 0 0 0', fontSize: '1.2rem', fontWeight: '900' },
  dossierGrid: { display: 'flex', flexWrap: 'wrap', gap: '2.5rem', marginBottom: '3rem' },
  dossierSection: { flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '15px' },
  dossierLabel: { margin: 0, fontSize: '0.85rem', fontWeight: '900', color: '#1DB954', textTransform: 'uppercase', letterSpacing: '1px' },
  dossierInfo: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoSet: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3fff6', paddingBottom: '8px' },
  infoSet_span: { fontSize: '0.8rem', color: '#888', fontWeight: '600' },
  infoSet_p: { margin: 0, fontSize: '0.9rem', fontWeight: '750' },
  notesSection: { backgroundColor: '#F9F9F9', padding: '2rem', borderRadius: '20px', border: '1.5px solid #E2F0E5' },
  notesArea: { width: '100%', height: '120px', borderRadius: '15px', border: '1.5px solid #E2F0E5', padding: '1.2rem', outline: 'none', resize: 'none', fontSize: '0.9rem', fontWeight: '600', color: '#444' },
  btnSaveNotes: { padding: '8px 15px', borderRadius: '10px', border: 'none', backgroundColor: '#1E1E1E', color: 'white', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer' }
};

export default AdminDashboard;
