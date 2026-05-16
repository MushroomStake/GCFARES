import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const fullEmail = email.includes('@') ? email : `${email}@gordoncollege.edu.ph`;
      const { error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password,
      });
      if (error) {
        throw new Error(error.message);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="split">

      <aside className="login-left">
        <div className="left-content">
          <div className="brand-mark">
            <div className="brand-mark-badge">
              <img src="/gclogo.png" alt="Gordon College Logo" className="brand-mark-logo" />
            </div>
            <div>
              <h1>Gordon College</h1>
              <p>Olongapo City</p>
            </div>
          </div>

          <div className="login-section">
            <div className="section-label">Vision</div>
            <p>
              A globally recognized local institution committed to innovative academic
              excellence, holistic and sustainable development, inclusivity, and community
              engagement.
            </p>
          </div>

          <div className="login-divider" />

          <div className="login-section">
            <div className="section-label">Mission</div>
            <p>
              Produce empowered global citizens who create sustainable impact, uphold
              values of character, excellence, and service, and contribute to academic
              and societal development.
            </p>
          </div>

          <div className="login-divider" />

          <div className="login-section">
            <div className="section-label">Core Values</div>
            <ul className="core-values">
              <li>Character — integrity, responsibility, and lifelong learning</li>
              <li>Excellence — intellectual curiosity, innovation, and academic rigor</li>
              <li>Service — community impact and social responsibility</li>
            </ul>
          </div>

        </div>
      </aside>

      <main className="login-right">
        <div className="brand">
          <div className="brand-seal-wrap">
            <img src="/gclogo.png" alt="Gordon College Logo" className="brand-seal-image" />
          </div>
          <h2>Gordon College</h2>
          <p>HR Admin Portal</p>
          <span className="brand-subtitle">Faculty Advancement &amp; Ranking Evaluation System</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">GC EMAIL ADDRESS</label>
              <div className="email-input-group">
                <input
                  type="text" id="email" name="email"
                  placeholder="e.g admin"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <span className="domain-suffix">@gordoncollege.edu.ph</span>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="password">PASSWORD</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"} id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="btn-sign-in">Sign In</button>
          </form>

        <p className="copyright">&copy; 2026 &nbsp;&nbsp; Gordon College — Olongapo City</p>
      </main>

    </div>
  );
}