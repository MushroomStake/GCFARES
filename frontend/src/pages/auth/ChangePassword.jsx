import { useState } from "react";
import gcLogo from "../../assets/gclogo.png";
import studentHat from "../../assets/student-hat.png";
import { portalApi } from "../../lib/portalApi";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gc-green: #1a6b3c;
    --gc-green-dark: #134f2c;
    --gc-green-light: #228b4e;
    --gc-gold: #c9a84c;
    --gc-gold-light: #e8c96b;
    --white: #ffffff;
    --off-white: #f8f7f4;
    --text-dark: #1a1a1a;
    --text-muted: #5a6a5e;
    --border: #dde3df;
  }

  .cp-root {
    font-family: 'Source Sans 3', sans-serif;
    min-height: 100vh;
    display: flex;
    background: var(--gc-green-dark);
    overflow-x: hidden;
  }

  /* ── LEFT PANEL ── */
  .cp-left {
    width: 55%;
    background: linear-gradient(160deg, var(--gc-green-dark) 0%, var(--gc-green) 50%, #1e5c35 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
    animation: panelIn 0.8s ease both;
  }
  .cp-left::before {
    content: '';
    position: absolute;
    top: -120px; right: -120px;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: rgba(201,168,76,0.07);
    pointer-events: none;
  }
  .cp-left::after {
    content: '';
    position: absolute;
    bottom: -80px; left: -80px;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    pointer-events: none;
  }

  .school-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 48px;
    animation: fadeUp 0.7s 0.2s ease both;
  }
  .school-logo-circle {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--white);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    overflow: hidden;
    font-size: 28px;
  }
  .school-logo-circle img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .school-name h1 {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: var(--white);
    font-weight: 600;
    line-height: 1.2;
  }
  .school-name p {
    font-size: 12px;
    color: var(--gc-gold-light);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 3px;
    font-weight: 500;
  }

  .divider-gold {
    width: 48px;
    height: 2px;
    background: linear-gradient(90deg, var(--gc-gold), transparent);
    margin-bottom: 40px;
    animation: fadeUp 0.7s 0.3s ease both;
  }

  /* Security notice card */
  .security-card {
    background: rgba(255,255,255,0.07);
    border-left: 3px solid var(--gc-gold);
    border-radius: 0 10px 10px 0;
    padding: 20px 22px;
    margin-bottom: 32px;
    animation: fadeUp 0.7s 0.35s ease both;
  }
  .security-card h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 8px;
  }
  .security-card p {
    font-size: 13.5px;
    color: rgba(255,255,255,0.75);
    font-weight: 300;
    line-height: 1.7;
  }

  /* Password requirements */
  .requirements-block {
    animation: fadeUp 0.7s 0.45s ease both;
  }
  .requirements-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gc-gold);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .requirements-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(201,168,76,0.25);
    max-width: 60px;
  }
  .requirements-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .requirements-list li {
    font-size: 13.5px;
    color: rgba(255,255,255,0.75);
    font-weight: 300;
    line-height: 1.5;
    padding-left: 18px;
    position: relative;
    transition: color 0.2s;
  }
  .requirements-list li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: var(--gc-gold);
    font-size: 11px;
    top: 2px;
  }
  .requirements-list li.met {
    color: #86efac;
  }
  .requirements-list li.met::before {
    content: '✓';
    color: #86efac;
  }

  /* ── RIGHT PANEL ── */
  .cp-right {
    width: 45%;
    background: var(--off-white);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 48px;
    animation: slideIn 0.7s 0.1s ease both;
  }

  .cp-card {
    width: 100%;
    max-width: 360px;
  }

  /* Logo */
  .cp-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  .cp-logo-img {
    width: 80px; height: 80px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 12px;
    box-shadow: 0 8px 32px rgba(26,107,60,0.2);
    background: #e8f0eb;
  }
  .cp-logo-img img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .cp-logo h2 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--gc-green-dark);
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.5px;
  }
  .cp-logo .portal-subtitle {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
  }

  /* First login badge */
  .first-login-badge {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  .first-login-badge span {
    background: var(--gc-gold-light);
    color: #5a3e00;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 20px;
  }

  /* Form title */
  .form-title {
    text-align: center;
    margin-bottom: 20px;
  }
  .form-title h3 {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-dark);
    margin-bottom: 5px;
  }
  .form-title p {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* Profile card on right panel */
  .profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 22px;
  }
  .profile-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: var(--gc-green);
    flex-shrink: 0;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .profile-avatar img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .profile-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-dark);
    line-height: 1.3;
  }
  .profile-email {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  /* Form fields */
  .form-group { margin-bottom: 16px; }
  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 7px;
  }
  .form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-dark);
    background: var(--white);
    outline: none;
    transition: border-color 0.2s;
  }
  .form-group input:focus  { border-color: var(--gc-green); }
  .form-group input::placeholder { color: #b0bdb5; }
  .form-group input.input-error   { border-color: #e53e3e; }
  .form-group input.input-success { border-color: var(--gc-green); }

  /* Strength bar */
  .strength-bar {
    margin-top: 8px;
    display: flex;
    gap: 4px;
  }
  .strength-segment {
    flex: 1; height: 3px;
    border-radius: 2px;
    background: var(--border);
    transition: background 0.3s;
  }
  .strength-segment.active-weak   { background: #e53e3e; }
  .strength-segment.active-fair   { background: #e8c96b; }
  .strength-segment.active-strong { background: var(--gc-green); }
  .strength-label {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 5px;
  }

  /* Messages */
  .error-msg {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #c53030;
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 7px;
    margin-bottom: 14px;
    text-align: center;
  }
  .success-msg {
    background: #f0f7f3;
    border: 1px solid var(--gc-green);
    color: var(--gc-green-dark);
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 7px;
    margin-bottom: 14px;
    text-align: center;
  }

  .btn-submit {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, var(--gc-green), var(--gc-green-light));
    color: var(--white);
    border: none;
    border-radius: 8px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    box-shadow: 0 4px 16px rgba(26,107,60,0.3);
    margin-top: 4px;
  }
  .btn-submit:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .footer-note {
    text-align: center;
    margin-top: 24px;
    font-size: 11.5px;
    color: #a0aca5;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .cp-left  { width: 45%; padding: 48px 36px; }
    .cp-right { width: 55%; padding: 48px 36px; }
  }
  @media (max-width: 640px) {
    .cp-root { flex-direction: column; overflow-y: auto; }
    .cp-right { width: 100%; padding: 40px 24px 36px; order: 1; }
    .cp-left  { width: 100%; padding: 32px 24px 40px; justify-content: flex-start; order: 2; }
    .cp-card  { max-width: 100%; }
    .cp-logo-img { width: 64px; height: 64px; }
    .school-header { margin-bottom: 24px; }
    .school-logo-circle { width: 48px; height: 48px; }
    .divider-gold { margin-bottom: 24px; }
  }

  @keyframes panelIn {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function getStrength(password) {
    if (!password) return { level: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: "Weak" };
    if (score === 2) return { level: 2, label: "Fair" };
    return { level: 3, label: "Strong" };
}

export default function ChangePassword({ user, onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const strength = getStrength(newPassword);

    const getSegmentClass = (index) => {
        if (strength.level === 0 || index >= strength.level) return "";
        if (strength.level === 1) return "active-weak";
        if (strength.level === 2) return "active-fair";
        return "active-strong";
    };

    // Live requirement checks
    const reqs = [
        { label: "At least 8 characters long", met: newPassword.length >= 8 },
        {
            label: "Contains an uppercase letter (A–Z)",
            met: /[A-Z]/.test(newPassword),
        },
        {
            label: "Contains a lowercase letter (a–z)",
            met: /[a-z]/.test(newPassword),
        },
        { label: "Contains a number (0–9)", met: /[0-9]/.test(newPassword) },
        {
            label: "Contains a special character (!@#$%^&*)",
            met: /[^A-Za-z0-9]/.test(newPassword),
        },
        {
            label: "New password and confirmation match",
            met: newPassword.length > 0 && newPassword === confirmPassword,
        },
    ];

    const handleSubmit = async () => {
        setError("");
        setSuccess("");
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (currentPassword === newPassword) {
            setError(
                "New password must be different from your current password.",
            );
            return;
        }
        setLoading(true);
        try {
          const {
            data: { user: sessionUser },
          } = await portalApi.auth.getUser();

          const accountEmail = sessionUser?.email || user?.email;
          if (!accountEmail) {
            throw new Error("Unable to determine account email for verification.");
          }

          const { error: verifyError } = await portalApi.auth.signInWithPassword({
            email: accountEmail,
            password: currentPassword,
          });

          if (verifyError) {
            setError("Current password is incorrect. Please try again.");
            return;
          }

          const { error: updateError } = await portalApi.auth.updateUser({
            password: newPassword,
          });
          if (updateError) throw updateError;

            setSuccess("Password updated successfully. Redirecting...");
          if (onSuccess) {
            await onSuccess();
          }
        } catch {
          setError(
            "Password update failed. Please try again or contact the administrator.",
          );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{styles}</style>
            <div className="cp-root">
                {/* LEFT — Security notice + requirements */}
                <div className="cp-left">
                    <div className="school-header">
                        <div className="school-logo-circle">
                            <img src={studentHat} alt="Student Hat" />
                        </div>
                        <div className="school-name">
                            <h1>Gordon College</h1>
                            <p>Olongapo City</p>
                        </div>
                    </div>

                    <div className="divider-gold" />

                    <div className="security-card">
                        <h3>Security First</h3>
                        <p>
                            You are currently using a temporary password
                            assigned by the HR office. For the security of your
                            account and the faculty portal, you must create a
                            new personal password before proceeding.
                        </p>
                    </div>

                    <div className="requirements-block">
                        <div className="requirements-label">
                            Password Requirements
                        </div>
                        <ul className="requirements-list">
                            {reqs.map((req, i) => (
                                <li key={i} className={req.met ? "met" : ""}>
                                    {req.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* RIGHT — Form */}
                <div className="cp-right">
                    <div className="cp-card">
                        <div className="cp-logo">
                            <div className="cp-logo-img">
                                <img src={gcLogo} alt="Gordon College Logo" />
                            </div>
                            <h2>Gordon College</h2>
                            <span className="portal-subtitle">
                                Faculty Ranking Portal
                            </span>
                        </div>

                        <div className="first-login-badge">
                            <span>First Login — Action Required</span>
                        </div>

                        <div className="form-title">
                            <h3>Set New Password</h3>
                            <p>
                                Replace your temporary password to activate your
                                account.
                            </p>
                        </div>

                        {/* Profile card */}
                        <div className="profile-card">
                            <div className="profile-avatar">
                                {/* [TEMPLATE] Replace with user photo if available */}
                                {/* <img src={user?.photoURL} alt={user?.displayName} /> */}
                            </div>
                            <div>
                                <div className="profile-name">
                                    {user?.displayName || "Faculty Member"}
                                </div>
                                <div className="profile-email">
                                    {user?.email || "—"}
                                </div>
                            </div>
                        </div>

                        {error && <div className="error-msg">{error}</div>}
                        {success && (
                            <div className="success-msg">{success}</div>
                        )}

                        <div className="form-group">
                            <label>Temporary Password</label>
                            <input
                                type="password"
                                placeholder="Enter your temporary password"
                                value={currentPassword}
                                onChange={(e) =>
                                    setCurrentPassword(e.target.value)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                placeholder="Create a strong password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={
                                    newPassword
                                        ? strength.level >= 2
                                            ? "input-success"
                                            : "input-error"
                                        : ""
                                }
                            />
                            {newPassword && (
                                <>
                                    <div className="strength-bar">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className={`strength-segment ${getSegmentClass(i)}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="strength-label">
                                        Password strength:{" "}
                                        <strong>{strength.label}</strong>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                placeholder="Re-enter your new password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                className={
                                    confirmPassword
                                        ? confirmPassword === newPassword
                                            ? "input-success"
                                            : "input-error"
                                        : ""
                                }
                            />
                        </div>

                        <button
                            className="btn-submit"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>

                        <p className="footer-note">
                            © 2026 Gordon College. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
