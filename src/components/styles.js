export const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3FFF6',
    fontFamily: "'Inter', sans-serif",
    color: '#1E1E1E',
    margin: 0,
    padding: '3rem 1.5rem',
    boxSizing: 'border-box',
  },
  logoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '2.5rem',
  },
  logoIconLarge: {
    fontSize: '2.5rem',
  },
  logoTitleLarge: {
    fontSize: '1.75rem',
    fontWeight: '900',
    color: '#1DB954',
    margin: 0,
    letterSpacing: '-1px',
  },
  authCard: {
    width: '100%',
    maxWidth: '430px', // For Login
    transition: 'all 0.3s ease',
    padding: '2.5rem',
    borderRadius: '2rem',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 20px 40px rgba(15, 157, 88, 0.08)',
    border: '1px solid rgba(163, 247, 191, 0.4)',
  },
  authCardWide: {
    maxWidth: '1000px', // Wider card for 3-column layout
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.25rem 1.5rem',
  },
  fullWidth: {
    gridColumn: 'span 3',
  },
  errorMessage: {
    padding: '0.75rem',
    borderRadius: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: '#ef4444',
    fontSize: '0.875rem',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '1rem',
    border: '1px solid rgba(239, 68, 68, 0.15)'
  },
  successMessage: {
    padding: '0.75rem',
    borderRadius: '0.75rem',
    backgroundColor: 'rgba(29, 185, 84, 0.08)',
    color: '#1DB954',
    fontSize: '0.875rem',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '1rem',
    border: '1px solid rgba(29, 185, 84, 0.15)'
  },
  dashboardCard: {
    textAlign: 'center',
    padding: '3rem',
    borderRadius: '2rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(163, 247, 191, 0.3)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
    color: '#1E1E1E',
    letterSpacing: '-0.5px',
    textAlign: 'center'
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '2rem',
    fontSize: '0.95rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'left'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#444',
    marginLeft: '4px'
  },
  input: {
    padding: '0.85rem 1.25rem',
    borderRadius: '1rem',
    backgroundColor: '#F9FFF9',
    border: '1.5px solid #E2F0E5',
    color: '#1E1E1E',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    width: '100%',
    boxSizing: 'border-box',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: '1.25rem',
    cursor: 'pointer',
    color: '#666',
    fontSize: '1.1rem',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '0 5px'
  },
  primaryButton: {
    marginTop: '0.5rem',
    padding: '0.85rem',
    borderRadius: '1rem',
    backgroundColor: '#1DB954',
    color: 'white',
    fontWeight: '700',
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(29, 185, 84, 0.25)',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    marginTop: '0.5rem',
    padding: '0.7rem 1.4rem',
    borderRadius: '1rem',
    backgroundColor: 'transparent',
    border: '1.5px solid #ef4444',
    color: '#ef4444',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleText: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#666'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#0F9D58',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '0 4px',
    fontSize: 'inherit',
    textDecoration: 'underline'
  }
};
