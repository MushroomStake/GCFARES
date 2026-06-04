import React from 'react';

export default function Loader({ message = "Loading...", center = true }) {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: center ? 'center' : 'flex-start',
    padding: '40px 20px',
    width: '100%',
    height: center ? '100%' : 'auto',
    minHeight: center ? '200px' : 'auto',
    gap: '16px',
    color: 'var(--muted, #6b7280)',
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.9rem'
  };

  const spinnerStyle = {
    width: '36px',
    height: '36px',
    animation: 'spin 1s linear infinite',
    color: 'var(--green-mid, #1e6e38)'
  };

  return (
    <div style={containerStyle} className="loader-container">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <svg style={spinnerStyle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25"></circle>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {message && <span>{message}</span>}
    </div>
  );
}
