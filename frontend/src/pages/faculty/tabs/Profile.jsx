// 📄 SIA/frontend/src/pages/faculty/tabs/Profile.jsx
//
// ── REVISION NOTES (Midterm Demo Feedback) ──────────────────────────────────
// • Removed "Current Salary" field — salary must not be disclosed to faculty
// • Removed "Applying For" field — HR manages target position, not faculty
// • Removed "Faculty Performance Rating" card from profile —
//     rating is now shown in the Dashboard hero only (see Home.jsx)
// • Added Data Privacy Provision section at the bottom
// • Added last-cycle performance rating chip in the hero (read-only)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
    User,
    Building2,
    Mail,
    School,
    Briefcase,
    GraduationCap,
    ClipboardList,
    Star,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    Info,
    BadgeCheck,
    Calendar,
    Pencil,
    X,
    Plus,
    AlertCircle,
    Shield,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

  :root {
    --gc-green: #1a6b3c;
    --gc-green-dark: #134f2c;
    --gc-green-light: #228b4e;
    --gc-green-pale: #eef7f2;
    --gc-gold: #c9a84c;
    --gc-gold-light: #e8c96b;
    --gc-gold-pale: #fdf8ec;
    --white: #ffffff;
    --off-white: #f8f7f4;
    --text-dark: #1a1a1a;
    --text-mid: #3a4a3e;
    --text-muted: #6b7c70;
    --border: #dde5df;
    --danger: #c0392b;
    --danger-pale: #fdf0ee;
    --blue: #2471a3;
    --blue-pale: #eaf3fb;
  }

  /* ── HERO ── */
  .pf-hero {
    background: linear-gradient(135deg, var(--gc-green-dark) 0%, var(--gc-green) 55%, #22704a 100%);
    border-radius: 16px; padding: 26px 28px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 20px;
    box-shadow: 0 8px 32px rgba(26,107,60,0.22);
    position: relative; overflow: hidden;
    animation: pfFadeUp 0.5s 0.1s ease both;
  }
  .pf-hero::before {
    content:''; position:absolute; top:-60px; right:-60px;
    width:240px; height:240px; border-radius:50%;
    background:rgba(201,168,76,0.09); pointer-events:none;
  }

  /* Static profile avatar */
  .pf-avatar-wrap {
    position:relative; flex-shrink:0;
  }
  .pf-hero-avatar {
    width:80px; height:80px; border-radius:50%;
    background:rgba(255,255,255,0.18); border:3px solid rgba(255,255,255,0.35);
    display:flex; align-items:center; justify-content:center;
    color:rgba(255,255,255,0.9); overflow:hidden;
  }
  .pf-hero-info { flex:1; min-width:0; position:relative; z-index:1; }
  .pf-hero-tag  {
    font-size:10.5px; color:var(--gc-gold-light); letter-spacing:1.5px;
    text-transform:uppercase; font-weight:600; margin-bottom:5px;
  }
  .pf-hero-name {
    font-family:'Playfair Display',serif; font-size:22px; color:var(--white);
    font-weight:600; margin-bottom:10px; line-height:1.2;
  }
  .pf-hero-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .pf-chip {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.2);
    border-radius:20px; padding:4px 12px; font-size:12px; color:var(--white); font-weight:500;
  }
  .pf-chip.gold {
    background:rgba(201,168,76,0.22); border-color:rgba(201,168,76,0.45);
    color:var(--gc-gold-light);
  }
  .pf-status-box { text-align:right; flex-shrink:0; position:relative; z-index:1; }
  .psb-label  { font-size:10px; color:rgba(255,255,255,0.55); letter-spacing:1px; text-transform:uppercase; margin-bottom:3px; }
  .psb-active { font-size:14px; font-weight:700; color:#7debb0; display:flex; align-items:center; gap:5px; justify-content:flex-end; }
  .psb-sub    { font-size:12.5px; color:rgba(255,255,255,0.7); font-weight:500; }

  /* ── CARD ── */
  .pf-card {
    background:var(--white); border-radius:14px; border:1px solid var(--border);
    padding:20px; box-shadow:0 2px 6px rgba(0,0,0,0.04); margin-bottom:18px;
    animation: pfFadeUp 0.5s ease both;
  }
  .pf-card-header {
    display:flex; align-items:center; gap:10px; margin-bottom:18px;
    padding-bottom:14px; border-bottom:1px solid var(--border);
  }
  .pf-card-icon {
    width:34px; height:34px; border-radius:9px;
    background:var(--gc-green-pale); color:var(--gc-green);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .pf-card-title { font-family:'Playfair Display',serif; font-size:15px; font-weight:600; color:var(--text-dark); flex:1; }
  .pf-card-editable-badge {
    display:inline-flex; align-items:center; gap:4px;
    font-size:10px; font-weight:600; color:var(--gc-green);
    background:var(--gc-green-pale); padding:3px 9px; border-radius:20px;
  }
  .pf-card-readonly-badge {
    display:inline-flex; align-items:center; gap:4px;
    font-size:10px; font-weight:600; color:var(--text-muted);
    background:var(--off-white); border:1px solid var(--border);
    padding:3px 9px; border-radius:20px;
  }

  /* ── GRIDS ── */
  .pf-grid-2      { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:0px; }
  .pf-grid-2-asym { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; }

  /* ── FIELDS ── */
  .pf-fields { display:flex; flex-direction:column; gap:14px; }
  .pf-row    { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:14px; }
  .pf-item   { display:flex; flex-direction:column; gap:4px; }
  .pf-item.full { grid-column:1/-1; }
  .pf-label  {
    font-size:11px; font-weight:600; color:var(--text-muted);
    letter-spacing:0.5px; text-transform:uppercase;
    display:flex; align-items:center; gap:5px;
  }
  .pf-label-required { color:var(--gc-gold); font-size:10px; }
  .pf-value  { font-size:14px; font-weight:500; color:var(--text-dark); line-height:1.4; }
  .pf-tag {
    display:inline-flex; align-items:center;
    background:var(--gc-green-pale); color:var(--gc-green-dark);
    font-size:12px; font-weight:600; padding:3px 10px; border-radius:8px;
  }

  /* ── EDITABLE FIELD ── */
  .pf-editable-field { display:flex; flex-direction:column; gap:4px; }
  .pf-edit-row { display:flex; align-items:center; gap:6px; }
  .pf-edit-input {
    flex:1; padding:8px 12px; border:1.5px solid var(--border); border-radius:8px;
    font-family:'Source Sans 3',sans-serif; font-size:14px; color:var(--text-dark);
    background:var(--white); outline:none; transition:border-color 0.2s;
  }
  .pf-edit-input:focus { border-color:var(--gc-green); }
  .pf-edit-btn {
    width:30px; height:30px; border-radius:7px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    transition:all 0.15s;
  }
  .pf-edit-btn-pencil { background:var(--gc-green-pale); color:var(--gc-green); }
  .pf-edit-btn-pencil:hover { background:var(--gc-green); color:var(--white); }
  .pf-edit-btn-save { background:var(--gc-green); color:var(--white); }
  .pf-edit-btn-save:hover { opacity:0.85; }
  .pf-edit-btn-cancel { background:var(--off-white); color:var(--text-muted); }
  .pf-edit-btn-cancel:hover { background:var(--border); }

  /* ── EDUCATION LIST (editable) ── */
  .pf-edu-list { display:flex; flex-direction:column; gap:12px; }
  .pf-edu-item {
    display:flex; align-items:flex-start; gap:12px;
    padding:12px; border-radius:10px; background:var(--off-white);
    border:1px solid var(--border); position:relative;
  }
  .pf-edu-level {
    font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;
    white-space:nowrap; flex-shrink:0; margin-top:2px; letter-spacing:0.5px;
  }
  .edu-bachelor  { background:#e8f4fd; color:var(--blue); }
  .edu-masters   { background:var(--gc-green-pale); color:var(--gc-green-dark); }
  .edu-doctorate { background:#f5f0fb; color:#6c3483; }
  .pf-edu-degree { font-size:13.5px; font-weight:600; color:var(--text-dark); margin-bottom:3px; }
  .pf-edu-school { font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px; }
  .pf-edu-add {
    display:flex; align-items:center; gap:6px;
    padding:9px 14px; border-radius:9px; border:1.5px dashed var(--border);
    background:var(--white); cursor:pointer; font-size:13px; font-weight:600;
    color:var(--text-muted); font-family:'Source Sans 3',sans-serif;
    transition:all 0.15s; width:100%;
  }
  .pf-edu-add:hover { border-color:var(--gc-green); color:var(--gc-green); }

  /* ── ELIGIBILITY (editable) ── */
  .pf-elig-list { display:flex; flex-direction:column; gap:8px; }
  .pf-elig-item {
    display:flex; align-items:center; gap:10px;
    font-size:13.5px; color:var(--text-mid);
    padding:8px 12px; border-radius:8px; background:var(--off-white);
    border:1px solid var(--border);
  }
  .pf-elig-dot {
    width:8px; height:8px; border-radius:50%;
    background:var(--gc-green); flex-shrink:0;
  }
  .pf-elig-text { flex:1; }
  .pf-elig-add {
    display:flex; align-items:center; gap:6px;
    padding:9px 14px; border-radius:9px; border:1.5px dashed var(--border);
    background:var(--white); cursor:pointer; font-size:13px; font-weight:600;
    color:var(--text-muted); font-family:'Source Sans 3',sans-serif;
    transition:all 0.15s; width:100%;
  }
  .pf-elig-add:hover { border-color:var(--gc-green); color:var(--gc-green); }

  /* ── DATA PRIVACY ── */
  .pf-privacy-body {
    font-size:13.5px; color:var(--text-mid); line-height:1.75;
  }
  .pf-privacy-body p { margin-bottom:12px; }
  .pf-privacy-body p:last-child { margin-bottom:0; }
  .pf-privacy-list {
    list-style:none; display:flex; flex-direction:column; gap:7px;
    margin:10px 0 12px 0;
  }
  .pf-privacy-list li {
    position:relative; display:block; padding-left:18px;
    font-size:13px; color:var(--text-mid); line-height:1.5;
  }
  .pf-privacy-list li::before {
    content:'>'; position:absolute; left:0; top:1px;
    color:var(--gc-gold); font-size:11px;
  }

  /* ── NOTICES ── */
  .pf-notice {
    border-radius:10px; padding:14px 18px; margin-bottom:18px;
    display:flex; align-items:flex-start; gap:10px;
    font-size:13px; line-height:1.6;
    animation: pfFadeUp 0.5s 0.3s ease both;
  }
  .pf-notice-blue    { background:var(--blue-pale); border:1px solid rgba(36,113,163,0.2); color:var(--blue); }
  .pf-notice strong  { color:var(--gc-green-dark); }

    /* ── TOASTS ── */
    .pf-toast-wrap {
        position: fixed;
        right: 18px;
        bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 10000;
        max-width: min(360px, 92vw);
    }
    .pf-toast {
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 12.5px;
        line-height: 1.4;
        box-shadow: 0 10px 22px rgba(0,0,0,0.14);
        border: 1px solid transparent;
        background: #fff;
    }
    .pf-toast.success { border-color: #a9dfbf; background: #eafaf1; color: #1e8449; }
    .pf-toast.error { border-color: #f5b7b1; background: #fef2f2; color: #c0392b; }
    .pf-toast.info { border-color: #bcd7ea; background: #eef6fc; color: #1f5f8a; }

  /* ── CHANGE PASSWORD ── */
  .pf-cp-fields { display:flex; flex-direction:column; gap:14px; margin-bottom:18px; }
  .pf-cp-field  { display:flex; flex-direction:column; gap:6px; }
  .pf-cp-wrap {
    display:flex; align-items:center;
    border:1.5px solid var(--border); border-radius:8px;
    background:var(--white); overflow:hidden; transition:border-color 0.2s;
  }
  .pf-cp-wrap:focus-within { border-color:var(--gc-green); }
  .pf-cp-input {
    flex:1; padding:11px 14px; border:none; outline:none;
    font-family:'Source Sans 3',sans-serif; font-size:14px;
    color:var(--text-dark); background:transparent;
  }
  .pf-cp-input::placeholder { color:#b0bdb5; }
  .pf-cp-eye {
    padding:0 12px; background:none; border:none;
    cursor:pointer; color:var(--text-muted); transition:color 0.15s;
    display:flex; align-items:center;
  }
  .pf-cp-eye:hover { color:var(--gc-green); }
  .pf-strength-bar   { height:4px; border-radius:4px; background:var(--border); margin-top:6px; overflow:hidden; }
  .pf-strength-fill  { height:100%; border-radius:4px; transition:width 0.3s, background 0.3s; }
  .pf-strength-label { font-size:11px; font-weight:600; margin-top:4px; }
  .pf-match-msg      { font-size:11.5px; font-weight:600; min-height:16px; display:flex; align-items:center; gap:4px; }
  .pf-cp-actions { display:flex; gap:10px; justify-content:flex-end; }
  .pf-cp-cancel {
    padding:9px 18px; border-radius:8px; border:1.5px solid var(--border); background:var(--white);
    font-size:13px; font-weight:600; color:var(--text-muted);
    cursor:pointer; font-family:'Source Sans 3',sans-serif; transition:background 0.15s;
  }
  .pf-cp-cancel:hover { background:var(--off-white); }
  .pf-cp-save {
    padding:9px 20px; border-radius:8px; border:none;
    background:linear-gradient(135deg,var(--gc-green),var(--gc-green-light));
    font-size:13px; font-weight:600; color:var(--white);
    cursor:pointer; font-family:'Source Sans 3',sans-serif;
    box-shadow:0 4px 12px rgba(26,107,60,0.25); transition:opacity 0.15s, transform 0.15s;
  }
  .pf-cp-save:hover { opacity:0.9; transform:translateY(-1px); }
  .pf-cp-success {
    display:flex; align-items:center; gap:12px;
    background:#eafaf1; border:1.5px solid #a9dfbf;
    border-radius:10px; padding:14px 16px;
  }
    .pf-cp-error {
        background:#fef2f2;
        border:1px solid #f5b7b1;
        color:#c0392b;
        border-radius:8px;
        padding:10px 12px;
        font-size:12.5px;
        margin-bottom:14px;
    }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .pf-grid-2      { grid-template-columns: 1fr; }
    .pf-grid-2-asym { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .pf-hero         { flex-direction: column; align-items: flex-start; padding: 20px; }
    .pf-hero-name    { font-size: 18px; }
    .pf-status-box   { text-align: left; }
    .psb-active      { justify-content: flex-start; }
    .pf-row          { grid-template-columns: 1fr 1fr; }
    .pf-cp-actions   { flex-direction: column; }
    .pf-cp-cancel, .pf-cp-save { width: 100%; text-align: center; justify-content: center; }
  }
  @media (max-width: 400px) {
    .pf-row        { grid-template-columns: 1fr; }
    .pf-hero-chips { flex-direction: column; }
  }

  @keyframes pfFadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }

  /* ── MODAL OVERLAY ── */
  .pf-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex;
    align-items:center; justify-content:center; z-index:1000;
    animation:fadeIn 0.2s ease;
  }
  .pf-modal {
    background:var(--white); border-radius:14px; max-width:500px;
    width:90vw; max-height:85vh; overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);
    animation:slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { transform:translateY(30px); opacity:0; }
    to { transform:translateY(0); opacity:1; }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to { opacity:1; }
  }
  .pf-modal-header {
    display:flex; align-items:center; gap:12px;
    padding:20px; border-bottom:1px solid var(--border);
    background:var(--gc-green-pale);
  }
  .pf-modal-icon {
    width:36px; height:36px; border-radius:9px;
    background:var(--gc-green-light); color:var(--white);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .pf-modal-title {
    font-family:'Playfair Display',serif; font-size:16px;
    font-weight:600; color:var(--text-dark); flex:1;
  }
  .pf-modal-close {
    width:32px; height:32px; border-radius:8px; border:none;
    background:rgba(26,107,60,0.1); color:var(--gc-green);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all 0.15s; flex-shrink:0;
  }
  .pf-modal-close:hover { background:var(--gc-green); color:var(--white); }
  .pf-modal-body {
    padding:20px; display:flex; flex-direction:column; gap:16px;
  }
  .pf-modal-field {
    display:flex; flex-direction:column; gap:6px;
  }
  .pf-modal-label {
    font-size:11px; font-weight:600; color:var(--text-muted);
    letter-spacing:0.5px; text-transform:uppercase;
    display:flex; align-items:center; gap:5px;
  }
  .pf-modal-label-required { color:var(--gc-gold); font-size:10px; }
  .pf-modal-input,
  .pf-modal-select,
  .pf-modal-textarea {
    padding:10px 12px; border:1.5px solid var(--border);
    border-radius:8px; font-family:'Source Sans 3',sans-serif;
    font-size:14px; color:var(--text-dark); outline:none;
    background:var(--white); transition:border-color 0.2s;
  }
  .pf-modal-input:focus,
  .pf-modal-select:focus,
  .pf-modal-textarea:focus {
    border-color:var(--gc-green);
    box-shadow:0 0 0 3px rgba(26,107,60,0.1);
  }
  .pf-modal-textarea {
    resize:vertical; min-height:70px; font-size:13px;
  }
  .pf-modal-grid-2 {
    display:grid; grid-template-columns:1fr 1fr; gap:12px;
  }
  .pf-modal-error {
    background:var(--danger-pale); border:1px solid rgba(192,57,43,0.2);
    color:var(--danger); padding:10px 12px; border-radius:8px;
    font-size:13px;
  }
  .pf-modal-footer {
    display:flex; gap:10px; justify-content:flex-end;
    padding:16px 20px; border-top:1px solid var(--border);
    background:var(--off-white);
  }
  .pf-modal-btn {
    padding:9px 20px; border-radius:8px; border:none;
    font-size:13px; font-weight:600; cursor:pointer;
    font-family:'Source Sans 3',sans-serif; transition:all 0.15s;
  }
  .pf-modal-btn-cancel {
    background:var(--white); color:var(--text-muted);
    border:1.5px solid var(--border);
  }
  .pf-modal-btn-cancel:hover { background:var(--off-white); }
  .pf-modal-btn-save {
    background:linear-gradient(135deg,var(--gc-green),var(--gc-green-light));
    color:var(--white);
    box-shadow:0 4px 12px rgba(26,107,60,0.25);
  }
  .pf-modal-btn-save:hover { opacity:0.9; transform:translateY(-1px); }
  .pf-modal-btn-save:disabled {
    opacity:0.5; cursor:not-allowed; transform:none;
  }

  @media (max-width: 640px) {
    .pf-modal { width:95vw; }
    .pf-modal-grid-2 { grid-template-columns:1fr; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE EDIT WINDOW FLAG
// Default fallback used until ranking cycle data is hydrated from Supabase.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PROFILE_EDIT_OPEN = false;
const USER_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_USER_TABLE_CANDIDATES ||
    "users"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const CYCLE_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_CYCLE_TABLE_CANDIDATES ||
    "ranking_cycles,cycles"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const AREA_SUBMISSION_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_AREA_SUBMISSION_TABLE_CANDIDATES ||
    "area_submissions"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const TOAST_TTL_MS = 3200;
const USER_TABLE = "users";
const PROFILE_LAST_NAME_KEYS = ["name_last", "last_name", "lastname", "surname", "family_name", "lastName"];
const PROFILE_FIRST_NAME_KEYS = ["name_first", "first_name", "firstname", "given_name", "firstName"];
const PROFILE_MIDDLE_NAME_KEYS = ["name_middle", "middle_name", "middlename", "middleName"];

function parseIntegerOrNull(value) {
    const parsed = Number.parseInt(String(value).trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function isNumericId(value) {
    // Return true only when the value clearly represents a numeric id (no hyphens, digits only)
    if (value === null || value === undefined) return false;
    const s = String(value).trim();
    return /^\d+$/.test(s);
}

function getFirstValue(source, keys, fallback = null) {
    if (!source) return fallback;
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return fallback;
}


function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function toBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "t", "yes", "y", "open"].includes(normalized)) return true;
        if (["false", "f", "no", "n", "closed"].includes(normalized)) return false;
    }
    return fallback;
}

function formatShortDate(value, fallback = "") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function parseWindowDate(value, { endOfDay = false } = {}) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
            const parsedDateOnly = new Date(`${trimmed}${suffix}`);
            return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly;
        }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWindowDateTime(value) {
    if (!value) return null;

    return value.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function buildEditWindowLabel(startAt, deadlineAt) {
    const startLabel = formatWindowDateTime(startAt);
    const deadlineLabel = formatWindowDateTime(deadlineAt);

    if (startLabel && deadlineLabel) {
        return `Editable from ${startLabel} to ${deadlineLabel}.`;
    }
    if (startLabel) {
        return `Editable starting ${startLabel}.`;
    }
    if (deadlineLabel) {
        return `Editable until ${deadlineLabel}.`;
    }

    return "";
}

function resolveProfileEditWindow(cycle) {
    if (!cycle) {
        return { isOpen: DEFAULT_PROFILE_EDIT_OPEN, windowLabel: "" };
    }

    const manualFlagRaw = getFirstValue(cycle, ["profile_edit_open", "is_profile_edit_open"], null);
    const manualFlag =
        manualFlagRaw === null || manualFlagRaw === undefined
            ? null
            : toBoolean(manualFlagRaw, false);

    const startAt = parseWindowDate(
        getFirstValue(cycle, [
            "profile_edit_start",
            "profile_edit_start_at",
            "edit_start",
            "edit_start_at",
            "start_date",
            "start_at",
        ]),
        { endOfDay: false },
    );

    const deadlineAt = parseWindowDate(
        getFirstValue(cycle, [
            "profile_edit_deadline",
            "profile_edit_deadline_at",
            "edit_deadline",
            "edit_deadline_at",
            "deadline",
            "end_date",
            "end_at",
        ]),
        { endOfDay: true },
    );

    const now = new Date();

    let isWithinWindow = null;
    if (startAt && deadlineAt) {
        isWithinWindow = now >= startAt && now <= deadlineAt;
    } else if (startAt) {
        isWithinWindow = now >= startAt;
    } else if (deadlineAt) {
        isWithinWindow = now <= deadlineAt;
    }

    let isOpen = DEFAULT_PROFILE_EDIT_OPEN;
    if (isWithinWindow === null && manualFlag === null) {
        isOpen = DEFAULT_PROFILE_EDIT_OPEN;
    } else if (isWithinWindow === null) {
        isOpen = Boolean(manualFlag);
    } else if (manualFlag === null) {
        isOpen = isWithinWindow;
    } else {
        isOpen = manualFlag && isWithinWindow;
    }

    return {
        isOpen,
        windowLabel: buildEditWindowLabel(startAt, deadlineAt),
    };
}

function parseArrayOrLines(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return trimmed
                .split(/\r?\n|\|\|/)
                .map((line) => line.trim())
                .filter(Boolean);
        }
    }
    return [];
}

async function queryPlainRowsWithTableFromCandidates(candidates, limit = 300) {
    for (const table of candidates) {
        const result = await supabase.from(table).select("*").limit(limit);
        if (!result.error && Array.isArray(result.data)) {
            return { table, rows: result.data };
        }
    }

    return { table: null, rows: [] };
}

async function queryRowsWithTableFromCandidates(candidates, limit = 300) {
    for (const table of candidates) {
        const ordered = await supabase
            .from(table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
        if (!ordered.error && Array.isArray(ordered.data)) {
            return { table, rows: ordered.data };
        }

        const plain = await supabase.from(table).select("*").limit(limit);
        if (!plain.error && Array.isArray(plain.data)) {
            return { table, rows: plain.data };
        }
    }

    return { table: null, rows: [] };
}

async function querySingleByCandidates(candidates, column, value) {
    for (const table of candidates) {
        const result = await supabase
            .from(table)
            .select("*")
            .eq(column, value)
            .maybeSingle();
        if (!result.error) {
            return { table, row: result.data };
        }
    }

    return { table: null, row: null };
}

async function queryDepartmentName(departmentId) {
    if (!departmentId) return "";

    const result = await supabase
        .from("departments")
        .select("department_name")
        .eq("department_id", departmentId)
        .maybeSingle();

    if (!result.error) {
        return String(result.data?.department_name || "");
    }

    return "";
}

function buildUsersTableUpdate(field, value) {
    const trimmed = String(value ?? "").trim();

    if (field === "firstName") {
        return { name_first: trimmed || null };
    }
    if (field === "lastName") {
        return { name_last: trimmed || null };
    }
    if (field === "middleName") {
        return { name_middle: trimmed || null };
    }
    if (field === "altEmail") {
        return { personal_email: trimmed || null };
    }
    if (field === "teachingYears") {
        return { teaching_experience_years: parseIntegerOrNull(trimmed) };
    }
    if (field === "industryYears") {
        return { industry_experience_years: parseIntegerOrNull(trimmed) };
    }

    return null;
}

function normalizeEducationEntry(entry) {
    if (typeof entry === "string") {
        return {
            level: "Credential",
            levelClass: "edu-bachelor",
            degree: entry,
            school: "",
        };
    }

    const level = String(getFirstValue(entry, ["level", "type"], "Credential"));
    return {
        level,
        levelClass:
            level.toLowerCase().includes("doctor")
                ? "edu-doctorate"
                : level.toLowerCase().includes("master")
                  ? "edu-masters"
                  : "edu-bachelor",
        degree: String(getFirstValue(entry, ["degree", "title", "name"], "Untitled degree")),
        school: String(getFirstValue(entry, ["school", "institution", "meta"], "")),
    };
}

function normalizeEligibilityEntry(entry) {
    return {
        text:
            typeof entry === "string"
                ? entry
                : String(getFirstValue(entry, ["text", "name", "title"], "Eligibility")),
    };
}

function normalizeDoctorateEntry(entry) {
    if (typeof entry === "string") {
        return {
            degree: entry,
            school: "",
        };
    }

    return {
        degree: String(getFirstValue(entry, ["degree", "title", "name"], "Untitled degree")),
        school: String(getFirstValue(entry, ["school", "institution", "meta"], "")),
    };
}

function buildEducationPayload(educationList) {
    return {
        educational_attainment_json: educationList.map((entry) => ({
            level: entry.level,
            degree: entry.degree,
            institution: entry.school,
        })),
        educational_attainment: educationList[0]?.degree || null,
    };
}

function buildEligibilityPayload(eligibilityList) {
    return {
        eligibility_exams_json: eligibilityList.map((entry) => ({
            text: entry.text,
        })),
        eligibility_exams: eligibilityList.map((entry) => entry.text).join("\n") || null,
    };
}

function buildDoctoratePayload(doctoralList) {
    return {
        doctorate: doctoralList.map((entry) => ({
            degree: entry.degree,
            institution: entry.school,
        })),
    };
}

function getStrength(pw) {
    if (!pw) return { label: "", color: "", pct: "0%" };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { label: "Weak", color: "#e74c3c", pct: "25%" };
    if (s === 2) return { label: "Fair", color: "#e67e22", pct: "50%" };
    if (s === 3) return { label: "Good", color: "#f1c40f", pct: "75%" };
    return { label: "Strong", color: "#27ae60", pct: "100%" };
}

// ── Reusable editable field component ──
function EditableField({ label, value, onSave, disabled }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputType = "text";

    const handleSave = () => {
        if (draft.trim() && draft !== value) onSave(draft.trim());
        setEditing(false);
    };
    const handleCancel = () => {
        setDraft(value);
        setEditing(false);
    };

    return (
        <div className="pf-editable-field">
            <div className="pf-label">{label}</div>
            {editing ? (
                <div className="pf-edit-row">
                    <input
                        type={inputType}
                        className="pf-edit-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave();
                            if (e.key === "Escape") handleCancel();
                        }}
                        autoFocus
                    />
                    <button
                        className="pf-edit-btn pf-edit-btn-save"
                        onClick={handleSave}
                    >
                        {" "}
                        <CheckCircle size={13} />
                    </button>
                    <button
                        className="pf-edit-btn pf-edit-btn-cancel"
                        onClick={handleCancel}
                    >
                        {" "}
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div className="pf-edit-row">
                    <div className="pf-value" style={{ flex: 1 }}>
                        {value}
                    </div>
                    {!disabled && (
                        <button
                            className="pf-edit-btn pf-edit-btn-pencil"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function NumberField({ label, value, onSave, disabled, min = 0 }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));

    const handleSave = () => {
        const normalized = draft.trim() === "" ? "" : String(Math.max(min, Number.parseInt(draft, 10) || 0));
        onSave(normalized);
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft(value === null || value === undefined ? "" : String(value));
        setEditing(false);
    };

    return (
        <div className="pf-editable-field">
            <div className="pf-label">{label}</div>
            {editing ? (
                <div className="pf-edit-row">
                    <input
                        type="number"
                        min={min}
                        className="pf-edit-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave();
                            if (e.key === "Escape") handleCancel();
                        }}
                        autoFocus
                    />
                    <button className="pf-edit-btn pf-edit-btn-save" onClick={handleSave}>
                        <CheckCircle size={13} />
                    </button>
                    <button className="pf-edit-btn pf-edit-btn-cancel" onClick={handleCancel}>
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div className="pf-edit-row">
                    <div className="pf-value" style={{ flex: 1 }}>
                        {value ?? ""}
                    </div>
                    {!disabled && (
                        <button
                            className="pf-edit-btn pf-edit-btn-pencil"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Education Modal Component ──
function EducationModal({ isOpen, onClose, onSubmit, isLoading, initialData = null }) {
    const [level, setLevel] = useState("Bachelor's");
    const [degree, setDegree] = useState("");
    const [institution, setInstitution] = useState("");
    const [yearGraduated, setYearGraduated] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setLevel(initialData.level || "Bachelor's");
            setDegree(initialData.degree || "");
            setInstitution(initialData.institution || initialData.school || "");
            setYearGraduated((initialData.yearGraduated || "").slice(0,4));
        } else {
            setLevel("Bachelor's");
            setDegree("");
            setInstitution("");
            setYearGraduated("");
        }
    }, [isOpen, initialData]);

    const handleSubmit = () => {
        setError("");
        if (!degree.trim()) {
            setError("Degree title is required.");
            return;
        }
        if (!institution.trim()) {
            setError("Institution is required.");
            return;
        }
        if (yearGraduated && !/^\d{4}$/.test(yearGraduated)) {
            setError("Year must be in YYYY format.");
            return;
        }

        onSubmit({
            level,
            degree: degree.trim(),
            institution: institution.trim(),
            yearGraduated: yearGraduated.trim(),
        });

        // Reset form
        setLevel("Bachelor's");
        setDegree("");
        setInstitution("");
        setYearGraduated("");
    };

    if (!isOpen) return null;

    return (
        <div className="pf-modal-overlay" onClick={onClose}>
            <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pf-modal-header">
                    <div className="pf-modal-icon">
                        <GraduationCap size={18} />
                    </div>
                    <div className="pf-modal-title">{initialData ? 'Edit Educational Attainment' : 'Add Educational Attainment'}</div>
                    <button
                        className="pf-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="pf-modal-body">
                    {error && <div className="pf-modal-error">{error}</div>}

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Degree Level
                            <span className="pf-modal-label-required">*</span>
                        </label>
                        <select
                            className="pf-modal-select"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                        >
                            <option value="Bachelor's">Bachelor's Degree</option>
                            <option value="Master's">Master's Degree</option>
                            <option value="Doctorate">Doctorate/PhD</option>
                            <option value="Professional">Professional License</option>
                            <option value="Certificate">Certificate/Diploma</option>
                        </select>
                    </div>

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Degree / Title
                            <span className="pf-modal-label-required">*</span>
                        </label>
                        <input
                            type="text"
                            className="pf-modal-input"
                            placeholder="e.g., Bachelor of Science in Computer Science"
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                        />
                    </div>

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Institution / School
                            <span className="pf-modal-label-required">*</span>
                        </label>
                        <input
                            type="text"
                            className="pf-modal-input"
                            placeholder="e.g., Gordon College"
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                        />
                    </div>

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Year Graduated
                        </label>
                        <input
                            type="text"
                            className="pf-modal-input"
                            placeholder="YYYY (e.g., 2014)"
                            value={yearGraduated}
                            onChange={(e) =>
                                setYearGraduated(e.target.value.slice(0, 4))
                            }
                            maxLength="4"
                        />
                    </div>
                </div>
                <div className="pf-modal-footer">
                    <button
                        className="pf-modal-btn pf-modal-btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="pf-modal-btn pf-modal-btn-save"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save changes' : 'Add Education')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Eligibility Modal Component ──
function EligibilityModal({ isOpen, onClose, onSubmit, isLoading, initialData = null }) {
    const [examName, setExamName] = useState("");
    const [datePassed, setDatePassed] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setExamName(initialData.examName || initialData.text || "");
            setDatePassed(initialData.datePassed || "");
        } else {
            setExamName("");
            setDatePassed("");
        }
    }, [isOpen, initialData]);

    const handleSubmit = () => {
        setError("");
        if (!examName.trim()) {
            setError("Exam/License name is required.");
            return;
        }
        if (datePassed && !/^\d{4}-\d{2}-\d{2}$/.test(datePassed)) {
            setError("Date must be in YYYY-MM-DD format.");
            return;
        }

        let textEntry = examName.trim();
        if (datePassed) {
            const dateObj = new Date(datePassed);
            const formattedDate = dateObj.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
            });
            textEntry += ` — Passed ${formattedDate}`;
        }

        onSubmit({
            text: textEntry,
            examName: examName.trim(),
            datePassed: datePassed.trim(),
        });

        // Reset form
        setExamName("");
        setDatePassed("");
    };

    if (!isOpen) return null;

    return (
        <div className="pf-modal-overlay" onClick={onClose}>
            <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pf-modal-header">
                    <div className="pf-modal-icon">
                        <ClipboardList size={18} />
                    </div>
                    <div className="pf-modal-title">{initialData ? 'Edit Eligibility or License' : 'Add Eligibility or License'}</div>
                    <button
                        className="pf-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="pf-modal-body">
                    {error && <div className="pf-modal-error">{error}</div>}

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Exam / License Name
                            <span className="pf-modal-label-required">*</span>
                        </label>
                        <input
                            type="text"
                            className="pf-modal-input"
                            placeholder="e.g., Civil Service Professional (CSC)"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                        />
                    </div>

                    <div className="pf-modal-field">
                        <label className="pf-modal-label">
                            Date Passed
                        </label>
                        <input
                            type="date"
                            className="pf-modal-input"
                            value={datePassed}
                            onChange={(e) => setDatePassed(e.target.value)}
                        />
                    </div>
                </div>
                <div className="pf-modal-footer">
                    <button
                        className="pf-modal-btn pf-modal-btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="pf-modal-btn pf-modal-btn-save"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save changes' : 'Add Eligibility')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DoctoralModal({ isOpen, onClose, onSubmit, isLoading, initialData = null }) {
                        const [degree, setDegree] = useState("");
                        const [institution, setInstitution] = useState("");
                        const [yearGraduated, setYearGraduated] = useState("");
                        const [error, setError] = useState("");

                        useEffect(() => {
                            if (!isOpen) return;
                            if (initialData) {
                                setDegree(initialData.degree || "");
                                setInstitution(initialData.institution || initialData.school || initialData.school || "");
                                setYearGraduated((initialData.yearGraduated || "").slice(0,4));
                            } else {
                                setDegree("");
                                setInstitution("");
                                setYearGraduated("");
                            }
                        }, [isOpen, initialData]);

                        const handleSubmit = () => {
                            setError("");
                            if (!degree.trim()) {
                                setError("Degree title is required.");
                                return;
                            }
                            if (!institution.trim()) {
                                setError("Institution is required.");
                                return;
                            }
                            if (yearGraduated && !/^\d{4}$/.test(yearGraduated)) {
                                setError("Year must be in YYYY format.");
                                return;
                            }

                            onSubmit({
                                degree: degree.trim(),
                                institution: institution.trim(),
                                yearGraduated: yearGraduated.trim(),
                            });

                            // Reset form
                            setDegree("");
                            setInstitution("");
                            setYearGraduated("");
                        };

                        if (!isOpen) return null;

                        return (
                            <div className="pf-modal-overlay" onClick={onClose}>
                                <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                                    <div className="pf-modal-header">
                                        <div className="pf-modal-icon">
                                            <GraduationCap size={18} />
                                        </div>
                                        <div className="pf-modal-title">{initialData ? 'Edit Doctorate Degree' : 'Add Doctorate Degree'}</div>
                                        <button
                                            className="pf-modal-close"
                                            onClick={onClose}
                                            aria-label="Close"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="pf-modal-body">
                                        {error && <div className="pf-modal-error">{error}</div>}

                                        <div className="pf-modal-field">
                                            <label className="pf-modal-label">
                                                Degree / Title
                                                <span className="pf-modal-label-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="pf-modal-input"
                                                placeholder="e.g., Doctor of Philosophy in Computer Science"
                                                value={degree}
                                                onChange={(e) => setDegree(e.target.value)}
                                            />
                                        </div>

                                        <div className="pf-modal-field">
                                            <label className="pf-modal-label">
                                                Institution / University
                                                <span className="pf-modal-label-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="pf-modal-input"
                                                placeholder="e.g., University of the Philippines"
                                                value={institution}
                                                onChange={(e) => setInstitution(e.target.value)}
                                            />
                                        </div>

                                        <div className="pf-modal-field">
                                            <label className="pf-modal-label">
                                                Year Graduated
                                            </label>
                                            <input
                                                type="text"
                                                className="pf-modal-input"
                                                placeholder="YYYY (e.g., 2020)"
                                                value={yearGraduated}
                                                onChange={(e) =>
                                                    setYearGraduated(e.target.value.slice(0, 4))
                                                }
                                                maxLength="4"
                                            />
                                        </div>
                                    </div>
                                    <div className="pf-modal-footer">
                                        <button
                                            className="pf-modal-btn pf-modal-btn-cancel"
                                            onClick={onClose}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="pf-modal-btn pf-modal-btn-save"
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save changes' : 'Add Doctorate')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

export default function Profile({ user }) {
    const { refreshProfile } = useAuth();
    const userId = user?.user_id ?? user?.id ?? null;
    const userEmail = user?.domain_email ?? user?.email ?? null;

    // Initialize state from user prop if available
    const [profileEditOpen, setProfileEditOpen] = useState(DEFAULT_PROFILE_EDIT_OPEN);
    const [profileEditWindowResolved, setProfileEditWindowResolved] = useState(false);
    const [profileEditWindowLabel, setProfileEditWindowLabel] = useState("");
    const [activeCycleRow, setActiveCycleRow] = useState(null);
    const [memberSince, setMemberSince] = useState(formatShortDate(user?.created_at, ""));
    const [lastName, setLastName] = useState(getFirstValue(user, PROFILE_LAST_NAME_KEYS, ""));
    const [firstName, setFirstName] = useState(getFirstValue(user, PROFILE_FIRST_NAME_KEYS, ""));
    const [middleName, setMiddleName] = useState(getFirstValue(user, PROFILE_MIDDLE_NAME_KEYS, ""));
    const [altEmail, setAltEmail] = useState(user?.personal_email || user?.alternate_email || user?.alt_email || "");
    const [department, setDepartment] = useState(user?.department_name || "");
    const [currentRank, setCurrentRank] = useState(user?.current_rank || user?.rank || "");
    const [natureOfAppointment, setNatureOfAppointment] = useState(user?.nature_of_appointment || user?.appointment_type || "");
    const [lastPromotionDate, setLastPromotionDate] = useState(formatShortDate(user?.date_of_last_promotion || user?.last_promotion_date, ""));
    const [teachingYears, setTeachingYears] = useState(String(user?.teaching_experience_years ?? user?.teaching_years ?? user?.years_teaching ?? ""));
    const [industryYears, setIndustryYears] = useState(String(user?.industry_experience_years ?? user?.industry_years ?? user?.years_industry ?? ""));
    const [performanceChip, setPerformanceChip] = useState(user?.current_rank || "");

    // Parse education from user prop
    const parseUserEducation = () => {
        const education = parseArrayOrLines(
            getFirstValue(
                user,
                ["educational_attainment_json", "educational_attainment", "education", "education_history"],
                [],
            )
        );
        if (education.length > 0) {
            return education.map(normalizeEducationEntry).filter(Boolean);
        }
        return [];
    };

    // Parse eligibility from user prop
    const parseUserEligibility = () => {
        const eligibility = parseArrayOrLines(
            getFirstValue(
                user,
                ["eligibility_exams_json", "eligibility_exams", "eligibilities", "licenses"],
                [],
            )
        );
        if (eligibility.length > 0) {
            return eligibility.map(normalizeEligibilityEntry);
        }
        return [];
    };

    const [eduList, setEduList] = useState(parseUserEducation());
    const [eligList, setEligList] = useState(parseUserEligibility());

    // Change password states
        // Parse doctorate from user prop
        const parseUserDoctorate = () => {
            const doctorate = parseArrayOrLines(
                getFirstValue(user, ["doctorate", "doctoral_degree", "phd_records"], [])
            );
            if (doctorate.length > 0) {
                return doctorate.map(normalizeDoctorateEntry).filter(Boolean);
            }
            return [];
        };

        const [doctoralList, setDoctoralList] = useState(parseUserDoctorate());
    const [cpCurrent, setCpCurrent] = useState("");
    const [cpNew, setCpNew] = useState("");
    const [cpConfirm, setCpConfirm] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpError, setCpError] = useState("");
    const [toasts, setToasts] = useState([]);

    // Modal states
    const [eduModalOpen, setEduModalOpen] = useState(false);
    const [eligModalOpen, setEligModalOpen] = useState(false);
    const [isSubmittingEdu, setIsSubmittingEdu] = useState(false);
    const [isSubmittingElig, setIsSubmittingElig] = useState(false);
    const [doctoralModalOpen, setDoctoralModalOpen] = useState(false);
    const [isSubmittingDoctoral, setIsSubmittingDoctoral] = useState(false);
    const [editEduIndex, setEditEduIndex] = useState(null);
    const [editEligIndex, setEditEligIndex] = useState(null);
    const [editDoctoralIndex, setEditDoctoralIndex] = useState(null);

    const strength = getStrength(cpNew);
    const passwordsMatch = cpNew.length > 0 && cpNew === cpConfirm;

    const pushToast = (kind, message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((prev) => [...prev, { id, kind, message }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, TOAST_TTL_MS);
    };

    const applyText = (nextValue, setState) => {
        if (nextValue !== undefined && nextValue !== null && String(nextValue).trim() !== "") {
            setState(String(nextValue));
        }
    };

    useEffect(() => {
        if (!user) return;

        applyText(getFirstValue(user, PROFILE_LAST_NAME_KEYS, null), setLastName);
        applyText(getFirstValue(user, PROFILE_FIRST_NAME_KEYS, null), setFirstName);
        applyText(getFirstValue(user, PROFILE_MIDDLE_NAME_KEYS, null), setMiddleName);
        applyText(user?.personal_email ?? user?.alternate_email ?? user?.alt_email, setAltEmail);
        applyText(user?.current_rank ?? user?.rank, setCurrentRank);
        applyText(user?.nature_of_appointment ?? user?.appointment_type, setNatureOfAppointment);
        applyText(user?.teaching_experience_years ?? user?.teaching_years ?? user?.years_teaching, setTeachingYears);
        applyText(user?.industry_experience_years ?? user?.industry_years ?? user?.years_industry, setIndustryYears);
        if (user?.date_of_last_promotion || user?.last_promotion_date) {
            setLastPromotionDate(
                formatShortDate(user?.date_of_last_promotion ?? user?.last_promotion_date, ""),
            );
        }

        if (user?.created_at) {
            setMemberSince(formatShortDate(user.created_at, ""));
        }

        void queryDepartmentName(user?.department_id ?? null).then((label) => {
            if (label) setDepartment(label);
        });

        const userEducation = parseUserEducation();
        if (userEducation.length > 0) {
            setEduList(userEducation);
        }

        const userEligibility = parseUserEligibility();
        if (userEligibility.length > 0) {
            setEligList(userEligibility);
        }

        const userDoctorate = parseUserDoctorate();
        if (userDoctorate.length > 0) {
            setDoctoralList(userDoctorate);
        }
    }, [user]);

    const applyProfileFieldLocally = (field, value) => {
        if (field === "firstName") setFirstName(value);
        if (field === "lastName") setLastName(value);
        if (field === "middleName") setMiddleName(value);
        if (field === "altEmail") setAltEmail(value);
        if (field === "teachingYears") setTeachingYears(value);
        if (field === "industryYears") setIndustryYears(value);
    };


    useEffect(() => {
        let isActive = true;
        setProfileEditWindowResolved(false);

        const hydrateProfile = async () => {
            // Parallelize expensive probes: cycles + user row
            const cyclePromise = queryRowsWithTableFromCandidates(CYCLE_TABLE_CANDIDATES, 50);

            const userFetchPromise = (async () => {
                if (userId && isNumericId(userId)) {
                    const r = await supabase.from(USER_TABLE).select("*").eq("user_id", parseIntegerOrNull(userId)).maybeSingle();
                    return r.error ? null : r.data;
                }
                if (userEmail) {
                    const r = await supabase.from(USER_TABLE).select("*").eq("domain_email", userEmail).maybeSingle();
                    return r.error ? null : r.data;
                }
                return null;
            })();

            const [cycleResult, userRow] = await Promise.all([cyclePromise, userFetchPromise]);

            if (isActive && cycleResult) {
                const activeCycle = (cycleResult.rows || []).find((row) => {
                    const status = normalizeStatus(getFirstValue(row, ["status", "cycle_status"], ""));
                    return ["open", "active", "in_progress", "in progress"].includes(status);
                });

                if (activeCycle) {
                    const editState = resolveProfileEditWindow(activeCycle);
                    setProfileEditOpen(editState.isOpen);
                    setProfileEditWindowLabel(editState.windowLabel);
                    setActiveCycleRow(activeCycle);
                } else {
                    setProfileEditOpen(false);
                    setProfileEditWindowLabel("");
                    setActiveCycleRow(null);
                }
            }
            if (isActive) setProfileEditWindowResolved(true);

            // Apply userRow if found
            if (isActive && userRow) {
                applyText(getFirstValue(userRow, PROFILE_LAST_NAME_KEYS, null), setLastName);
                applyText(getFirstValue(userRow, PROFILE_FIRST_NAME_KEYS, null), setFirstName);
                applyText(getFirstValue(userRow, PROFILE_MIDDLE_NAME_KEYS, null), setMiddleName);
                setAltEmail(String(getFirstValue(userRow, ["personal_email", "alternate_email", "alt_email"], "")));
                setDepartment(String(getFirstValue(userRow, ["department_name", "department", "dept"], "")));
                setCurrentRank(String(getFirstValue(userRow, ["current_rank", "rank", "faculty_rank"], "")));
                setNatureOfAppointment(String(getFirstValue(userRow, ["nature_of_appointment", "appointment_type"], "")));
                setLastPromotionDate(
                    formatShortDate(
                        getFirstValue(userRow, ["date_of_last_promotion", "last_promotion_date"]),
                        "",
                    ),
                );
                setTeachingYears(String(getFirstValue(userRow, ["teaching_experience_years", "teaching_years", "years_teaching"], "")));
                setIndustryYears(String(getFirstValue(userRow, ["industry_experience_years", "industry_years", "years_industry"], "")));
                setMemberSince(
                    formatShortDate(
                        getFirstValue(userRow, ["created_at", "member_since", "date_created"]),
                        "",
                    ),
                );

                const fallbackDepartment = await queryDepartmentName(getFirstValue(userRow, ["department_id"], null));
                if (fallbackDepartment) setDepartment(fallbackDepartment);

                const education = parseArrayOrLines(getFirstValue(userRow, ["educational_attainment_json", "educational_attainment", "education", "education_history"], []));
                if (education.length > 0) setEduList(education.map(normalizeEducationEntry).filter(Boolean));

                const eligibility = parseArrayOrLines(getFirstValue(userRow, ["eligibility_exams_json", "eligibility_exams", "eligibilities", "licenses"], []));
                if (eligibility.length > 0) setEligList(eligibility.map(normalizeEligibilityEntry));

                const doctorate = parseArrayOrLines(getFirstValue(userRow, ["doctorate", "doctoral_degree", "phd_records"], []));
                if (doctorate.length > 0) setDoctoralList(doctorate.map(normalizeDoctorateEntry));
            }

            // Fetch Area IV performance rows without probing optional columns that may not exist.
            const useNumeric = isNumericId(userId);
            const areaResult = await queryPlainRowsWithTableFromCandidates(AREA_SUBMISSION_TABLE_CANDIDATES, 100);

            // process area submissions
            if (isActive && areaResult && Array.isArray(areaResult.rows) && areaResult.rows.length > 0) {
                const areaRows = areaResult.rows.filter((row) => {
                    const rowUserId = String(getFirstValue(row, ["user_id", "faculty_id", "uid"], ""));
                    const rowEmail = String(getFirstValue(row, ["email", "domain_email", "user_email"], ""));
                    const areaId = String(getFirstValue(row, ["area_id", "area", "areaId"], ""));
                    const forUser = useNumeric ? (rowUserId && rowUserId === String(userId)) : (userEmail && rowEmail === String(userEmail));
                    return forUser && (areaId === "IV" || areaId === "Area IV" || areaId === "IV-auto");
                });

                if (areaRows.length > 0) {
                    const row = areaRows[0];
                    const score = getFirstValue(row, ["csv_total_average_rate", "rating", "score"], null);
                    const label = getFirstValue(row, ["rating_label", "rating_text", "performance_level"], "Outstanding");
                    if (score) setPerformanceChip(`${score} · ${label}`);
                }
            }
        };

        void hydrateProfile();

        return () => {
            isActive = false;
        };
    }, [userEmail, userId]);

    useEffect(() => {
        if (!activeCycleRow) return;

        const syncEditWindow = () => {
            const editState = resolveProfileEditWindow(activeCycleRow);
            setProfileEditOpen(editState.isOpen);
            setProfileEditWindowLabel(editState.windowLabel);
        };

        syncEditWindow();
        const interval = window.setInterval(syncEditWindow, 30000);

        return () => {
            window.clearInterval(interval);
        };
    }, [activeCycleRow]);

    // ── Handlers ──

    const handleFieldSave = async (field, value) => {
        const updatePayload = buildUsersTableUpdate(field, value);
        if (!updatePayload) {
            pushToast("error", "This field cannot be saved yet.");
            return;
        }

        const useNumeric = isNumericId(userId);
        const userFilterColumn = useNumeric ? "user_id" : "domain_email";
        const userFilterValue = useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId);
        const { error } = await supabase
            .from(USER_TABLE)
            .update(updatePayload)
            .eq(userFilterColumn, userFilterValue);

        if (error) {
            pushToast("error", error.message || "Unable to save profile change.");
            return;
        }

        applyProfileFieldLocally(field, value);
        await refreshProfile();
        pushToast("success", "Profile updated successfully.");
    };

    const handleAddEdu = async (eduData) => {
        setIsSubmittingEdu(true);
        try {
            const newEntry = {
                level: eduData.level,
                levelClass:
                    eduData.level.toLowerCase().includes("doctor")
                        ? "edu-doctorate"
                        : eduData.level.toLowerCase().includes("master")
                          ? "edu-masters"
                          : "edu-bachelor",
                degree: eduData.degree,
                school: eduData.yearGraduated
                    ? `${eduData.institution} · ${eduData.yearGraduated}`
                    : eduData.institution,
            };

            const nextList = [...eduList, newEntry];
            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildEducationPayload(nextList))
                .eq(useNumeric ? "user_id" : "domain_email", useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast("error", error.message || "Unable to save education entry.");
                return;
            }

            setEduList(nextList);
            await refreshProfile();
            pushToast("success", "Degree entry added successfully.");
            setEduModalOpen(false);
            setEditEduIndex(null);
        } finally {
            setIsSubmittingEdu(false);
        }
    };

    const handleUpdateEdu = async (index, eduData) => {
        setIsSubmittingEdu(true);
        try {
            const updated = eduList.map((e, i) => (i === index ? {
                level: eduData.level,
                levelClass: eduData.level.toLowerCase().includes('doctor') ? 'edu-doctorate' : (eduData.level.toLowerCase().includes('master') ? 'edu-masters' : 'edu-bachelor'),
                degree: eduData.degree,
                school: eduData.yearGraduated ? `${eduData.institution} · ${eduData.yearGraduated}` : eduData.institution,
            } : e));

            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildEducationPayload(updated))
                .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast('error', error.message || 'Unable to update education entry.');
                return;
            }

            setEduList(updated);
            await refreshProfile();
            pushToast('success', 'Degree updated successfully.');
            setEduModalOpen(false);
            setEditEduIndex(null);
        } finally {
            setIsSubmittingEdu(false);
        }
    };

    const handleDeleteEdu = async (index) => {
        if (!window.confirm('Delete this degree entry?')) return;
        const nextList = eduList.filter((_, i) => i !== index);
        const useNumeric = isNumericId(userId);
        const { error } = await supabase
            .from(USER_TABLE)
            .update(buildEducationPayload(nextList))
            .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

        if (error) {
            pushToast('error', error.message || 'Unable to delete degree entry.');
            return;
        }

        setEduList(nextList);
        await refreshProfile();
        pushToast('success', 'Degree removed.');
    };

    const handleAddElig = async (eligData) => {
        setIsSubmittingElig(true);
        try {
            const newEntry = {
                text: eligData.text,
            };

            const nextList = [...eligList, newEntry];
            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildEligibilityPayload(nextList))
                .eq(useNumeric ? "user_id" : "domain_email", useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast("error", error.message || "Unable to save eligibility entry.");
                return;
            }

            setEligList(nextList);
            await refreshProfile();
            pushToast("success", "Eligibility entry added successfully.");
            setEligModalOpen(false);
            setEditEligIndex(null);
        } finally {
            setIsSubmittingElig(false);
        }
    };

    const handleUpdateElig = async (index, eligData) => {
        setIsSubmittingElig(true);
        try {
            const updated = eligList.map((e, i) => (i === index ? { text: eligData.text } : e));
            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildEligibilityPayload(updated))
                .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast('error', error.message || 'Unable to update eligibility entry.');
                return;
            }

            setEligList(updated);
            await refreshProfile();
            pushToast('success', 'Eligibility updated successfully.');
            setEligModalOpen(false);
            setEditEligIndex(null);
        } finally {
            setIsSubmittingElig(false);
        }
    };

    const handleDeleteElig = async (index) => {
        if (!window.confirm('Delete this eligibility entry?')) return;
        const nextList = eligList.filter((_, i) => i !== index);
        const useNumeric = isNumericId(userId);
        const { error } = await supabase
            .from(USER_TABLE)
            .update(buildEligibilityPayload(nextList))
            .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

        if (error) {
            pushToast('error', error.message || 'Unable to delete eligibility entry.');
            return;
        }

        setEligList(nextList);
        await refreshProfile();
        pushToast('success', 'Eligibility removed.');
    };

    const handleAddDoctoral = async (doctoralData) => {
        setIsSubmittingDoctoral(true);
        try {
            const newEntry = {
                degree: doctoralData.degree,
                school: doctoralData.yearGraduated
                    ? `${doctoralData.institution} · ${doctoralData.yearGraduated}`
                    : doctoralData.institution,
            };

            const nextList = [...doctoralList, newEntry];
            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildDoctoratePayload(nextList))
                .eq(useNumeric ? "user_id" : "domain_email", useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast("error", error.message || "Unable to save doctorate entry.");
                return;
            }

            setDoctoralList(nextList);
            await refreshProfile();
            pushToast("success", "Doctorate degree added successfully.");
            setDoctoralModalOpen(false);
            setEditDoctoralIndex(null);
        } finally {
            setIsSubmittingDoctoral(false);
        }
    };

    const handleUpdateDoctoral = async (index, doctoralData) => {
        setIsSubmittingDoctoral(true);
        try {
            const updated = doctoralList.map((d, i) => (i === index ? { degree: doctoralData.degree, school: doctoralData.yearGraduated ? `${doctoralData.institution} · ${doctoralData.yearGraduated}` : doctoralData.institution } : d));
            const useNumeric = isNumericId(userId);
            const { error } = await supabase
                .from(USER_TABLE)
                .update(buildDoctoratePayload(updated))
                .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

            if (error) {
                pushToast('error', error.message || 'Unable to update doctorate entry.');
                return;
            }

            setDoctoralList(updated);
            await refreshProfile();
            pushToast('success', 'Doctorate updated successfully.');
            setDoctoralModalOpen(false);
            setEditDoctoralIndex(null);
        } finally {
            setIsSubmittingDoctoral(false);
        }
    };

    const handleDeleteDoctoral = async (index) => {
        if (!window.confirm('Delete this doctorate entry?')) return;
        const nextList = doctoralList.filter((_, i) => i !== index);
        const useNumeric = isNumericId(userId);
        const { error } = await supabase
            .from(USER_TABLE)
            .update(buildDoctoratePayload(nextList))
            .eq(useNumeric ? 'user_id' : 'domain_email', useNumeric ? parseIntegerOrNull(userId) : (userEmail || userId));

        if (error) {
            pushToast('error', error.message || 'Unable to delete doctorate entry.');
            return;
        }

        setDoctoralList(nextList);
        await refreshProfile();
        pushToast('success', 'Doctorate removed.');
    };

    const handleCpSubmit = async () => {
        setCpError("");
        if (!cpCurrent || !cpNew || !cpConfirm) {
            setCpError("Please complete all password fields.");
            return;
        }
        if (cpNew.length < 8) {
            setCpError("New password must be at least 8 characters long.");
            return;
        }
        if (cpNew !== cpConfirm) {
            setCpError("New password and confirmation do not match.");
            return;
        }

        try {
            const {
                data: { user: sessionUser },
            } = await supabase.auth.getUser();

            const accountEmail = user?.email || sessionUser?.email;
            if (!accountEmail) {
                throw new Error("No account email available for verification.");
            }

            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: accountEmail,
                password: cpCurrent,
            });
            if (verifyError) {
                setCpError("Current password is incorrect.");
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: cpNew,
            });
            if (updateError) throw updateError;

            setCpSuccess(true);
            setTimeout(() => {
                setCpSuccess(false);
                setCpCurrent("");
                setCpNew("");
                setCpConfirm("");
            }, 4000);
        } catch {
            setCpError(
                "Unable to update password right now. Please try again.",
            );
        }
    };

    return (
        <>
            <style>{styles}</style>

            {/* ── HERO ── */}
            <div className="pf-hero">
                {/* Static avatar icon */}
                <div className="pf-avatar-wrap">
                    <div className="pf-hero-avatar">
                        <User size={34} />
                    </div>
                </div>

                <div className="pf-hero-info">
                    <div className="pf-hero-tag">
                        Faculty Profile
                    </div>
                    <div className="pf-hero-name">
                        {`${firstName} ${lastName}`.trim() || user?.displayName || ""}
                    </div>
                    <div className="pf-hero-chips">
                        <span className="pf-chip">
                            <School size={12} /> {currentRank}
                        </span>
                        <span className="pf-chip">
                            <Building2 size={12} /> {department}
                        </span>
                        <span className="pf-chip">
                            <Mail size={12} />{" "}
                            {user?.email || userEmail || ""}
                        </span>
                        <span className="pf-chip gold">
                            <Star size={12} /> {performanceChip}
                        </span>
                    </div>
                </div>

                <div className="pf-status-box">
                    <div className="psb-label">Account Status</div>
                    <div className="psb-active">
                        <BadgeCheck size={14} /> Active
                    </div>
                    <div className="psb-label" style={{ marginTop: 10 }}>
                        Member Since
                    </div>
                    <div className="psb-sub">{memberSince}</div>
                </div>
            </div>

            {/* Profile edit window closed notice */}
            {profileEditWindowResolved && !profileEditOpen && (
                <div
                    className="pf-notice"
                    style={{
                        background: "#fdf8ec",
                        border: "1px solid rgba(201,168,76,0.35)",
                        color: "#7d5a10",
                        marginBottom: 18,
                    }}
                >
                    <Lock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p>
                        <strong>Profile editing is currently closed.</strong> HR
                        has not yet opened the profile edit window for this
                        ranking period. You will be notified when you can update
                        your information.
                        {profileEditWindowLabel ? ` ${profileEditWindowLabel}` : ""}
                    </p>
                </div>
            )}

            {/* ── ROW 1: Personal Info + Experience ── */}
            <div className="pf-grid-2">
                {/* Personal Info */}
                <div className="pf-card">
                    <div className="pf-card-header">
                        <div className="pf-card-icon">
                            <User size={16} />
                        </div>
                        <div className="pf-card-title">
                            Personal Information
                        </div>
                        <span className="pf-card-editable-badge">
                            <Pencil size={10} /> Partially editable
                        </span>
                    </div>
                    <div className="pf-fields">
                        <div className="pf-row">
                            <EditableField
                                label="Last Name"
                                value={lastName}
                                onSave={(v) => handleFieldSave("lastName", v)}
                                disabled={!profileEditOpen}
                            />
                            <EditableField
                                label="First Name"
                                value={firstName}
                                onSave={(v) => handleFieldSave("firstName", v)}
                                disabled={!profileEditOpen}
                            />
                        </div>
                        <EditableField
                            label="Middle Name"
                            value={middleName}
                            onSave={(v) => handleFieldSave("middleName", v)}
                            disabled={!profileEditOpen}
                        />
                        <div className="pf-row">
                            <div className="pf-item">
                                <div className="pf-label">
                                    <Mail size={11} /> Domain Email
                                </div>
                                <div className="pf-value">
                                    {user?.email || userEmail || ""}
                                </div>
                            </div>
                            <div className="pf-item">
                                <div className="pf-label">
                                    <Building2 size={11} /> Department
                                </div>
                                <div className="pf-value">{department}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Experience */}
                <div className="pf-card">
                    <div className="pf-card-header">
                        <div className="pf-card-icon">
                            <Briefcase size={16} />
                        </div>
                        <div className="pf-card-title">Experience</div>
                        <span className="pf-card-editable-badge">
                            <Pencil size={10} /> Editable
                        </span>
                    </div>
                    <div className="pf-fields">
                        <NumberField
                            label={
                                <>
                                    Teaching Experience{" "}
                                    <span className="pf-label-required">
                                        <Star size={10} /> Required
                                    </span>
                                </>
                            }
                            value={teachingYears}
                            onSave={(v) => handleFieldSave("teachingYears", v)}
                            disabled={!profileEditOpen}
                        />
                        <NumberField
                            label="Industry Experience"
                            value={industryYears}
                            onSave={(v) => handleFieldSave("industryYears", v)}
                            disabled={!profileEditOpen}
                        />
                    </div>
                </div>
            </div>

            {/* ── ROW 2: Rank & Employment — read only ── */}
            <div className="pf-card">
                <div className="pf-card-header">
                    <div className="pf-card-icon">
                        <School size={16} />
                    </div>
                    <div className="pf-card-title">Rank &amp; Employment</div>
                    <span className="pf-card-readonly-badge">
                        <Lock size={10} /> HR managed
                    </span>
                </div>
                <div className="pf-fields">
                    <div className="pf-row">
                        <div className="pf-item">
                            <div className="pf-label">
                                Present Faculty Rank{" "}
                                <span className="pf-label-required">
                                    <Star size={10} /> Required
                                </span>
                            </div>
                            <div className="pf-value">{currentRank}</div>
                        </div>
                        <div className="pf-item">
                            <div className="pf-label">
                                Nature of Appointment
                            </div>
                            <div className="pf-value">{natureOfAppointment}</div>
                        </div>
                        <div className="pf-item">
                            <div className="pf-label">
                                <Calendar size={11} /> Date of Last Promotion
                            </div>
                            <div className="pf-value">{lastPromotionDate}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ROW 3: Education + Eligibility (stacked) ── */}
            <div className="pf-grid-2-asym">
                {/* Educational Attainment — faculty can add entries */}
                <div className="pf-card" style={{ marginBottom: 0 }}>
                    <div className="pf-card-header">
                        <div className="pf-card-icon">
                            <GraduationCap size={16} />
                        </div>
                        <div className="pf-card-title">
                            Educational Attainment
                        </div>
                        <span className="pf-card-editable-badge">
                            <Plus size={10} /> Can add
                        </span>
                    </div>
                    <div className="pf-edu-list">
                        {eduList.map((edu, i) => (
                            <div className="pf-edu-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <span className={`pf-edu-level ${edu.levelClass}`}>
                                    {edu.level}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div className="pf-edu-degree">{edu.degree}</div>
                                    <div className="pf-edu-school"><Building2 size={11} /> {edu.school}</div>
                                </div>
                                {profileEditOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <button className="pf-edit-btn pf-edit-btn-pencil" onClick={() => { setEditEduIndex(i); setEduModalOpen(true); }} title="Edit degree">
                                            <Pencil size={14} />
                                        </button>
                                        <button className="pf-edit-btn pf-edit-btn-cancel" onClick={() => handleDeleteEdu(i)} title="Delete degree">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Add button hidden when profile edit window is closed */}
                        {profileEditOpen && (
                            <button
                                className="pf-edu-add"
                                onClick={() => { setEditEduIndex(null); setEduModalOpen(true); }}
                            >
                                <Plus size={14} /> Add degree or credential
                            </button>
                        )}
                    </div>
                </div>

                {/* Eligibility only — Performance Rating removed from profile */}
                {/* NOTE: Faculty Performance Rating is displayed in the Dashboard (Home.jsx hero) only.
                    It was removed from Profile per midterm feedback — rating should not appear here. */}
                <div className="pf-card" style={{ marginBottom: 0 }}>
                    <div className="pf-card-header">
                        <div className="pf-card-icon">
                            <ClipboardList size={16} />
                        </div>
                        <div className="pf-card-title">
                            Eligibility &amp; Licensure
                        </div>
                        <span className="pf-card-editable-badge">
                            <Plus size={10} /> Can add
                        </span>
                    </div>
                    <div className="pf-elig-list">
                        {eligList.map((e, i) => (
                            <div className="pf-elig-item" key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="pf-elig-dot" />
                                <span className="pf-elig-text" style={{ flex: 1 }}>{e.text}</span>
                                {profileEditOpen && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="pf-edit-btn pf-edit-btn-pencil" onClick={() => { setEditEligIndex(i); setEligModalOpen(true); }} title="Edit eligibility">
                                            <Pencil size={14} />
                                        </button>
                                        <button className="pf-edit-btn pf-edit-btn-cancel" onClick={() => handleDeleteElig(i)} title="Delete eligibility">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Add button hidden when profile edit window is closed */}
                        {profileEditOpen && (
                            <button
                                className="pf-elig-add"
                                onClick={() => { setEditEligIndex(null); setEligModalOpen(true); }}
                            >
                                <Plus size={14} /> Add eligibility or board exam
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Doctorate Degrees (same card style as Education) */}
            <div className="pf-card" style={{ marginBottom: 0 }}>
                <div className="pf-card-header">
                    <div className="pf-card-icon">
                        <GraduationCap size={16} />
                    </div>
                    <div className="pf-card-title">Doctorate Degrees</div>
                    <span className="pf-card-editable-badge">
                        <Plus size={10} /> Can add
                    </span>
                </div>
                <div className="pf-edu-list">
                    {doctoralList.map((d, i) => (
                        <div className="pf-edu-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span className="pf-edu-level edu-doctorate">Doctorate</span>
                            <div style={{ flex: 1 }}>
                                <div className="pf-edu-degree">{d.degree}</div>
                                <div className="pf-edu-school"><Building2 size={12} /> {d.school || ""}</div>
                            </div>
                            {profileEditOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button className="pf-edit-btn pf-edit-btn-pencil" onClick={() => { setEditDoctoralIndex(i); setDoctoralModalOpen(true); }} title="Edit doctorate">
                                        <Pencil size={14} />
                                    </button>
                                    <button className="pf-edit-btn pf-edit-btn-cancel" onClick={() => handleDeleteDoctoral(i)} title="Delete doctorate">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {profileEditOpen && (
                        <button className="pf-edu-add" onClick={() => { setEditDoctoralIndex(null); setDoctoralModalOpen(true); }}>
                            <Plus size={14} /> Add doctorate degree
                        </button>
                    )}
                </div>
            </div>

            {/* ── READ-ONLY NOTICE ── */}
            <div className="pf-notice pf-notice-blue">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <p>
                    Fields marked <strong>HR managed</strong> were set by the{" "}
                    <strong>HR Department</strong> and cannot be edited here.
                    For corrections, contact HR directly.
                </p>
            </div>

            {/* ── DATA PRIVACY PROVISION ── */}
            {/* Added per midterm feedback — required by VPAA */}
            <div className="pf-card">
                <div className="pf-card-header">
                    <div className="pf-card-icon">
                        <Shield size={16} />
                    </div>
                    <div className="pf-card-title">
                        Faculty Data Privacy Provision
                    </div>
                    <span className="pf-card-readonly-badge">
                        <Lock size={10} /> Read only
                    </span>
                </div>
                {/* Privacy acknowledgement is displayed as read-only on this view. */}
                <div className="pf-privacy-body">
                    <p>
                        Gordon College is committed to protecting the privacy
                        and confidentiality of all personal information
                        collected through the <strong>GCFARES</strong> system,
                        in accordance with{" "}
                        <strong>Republic Act No. 10173</strong>, otherwise known
                        as the <em>Data Privacy Act of 2012</em>.
                    </p>

                    <p>By using this system, you acknowledge that:</p>

                    <ul className="pf-privacy-list">
                        <li>
                            Your personal and professional information (name,
                            educational background, employment records) is
                            collected solely for the purpose of faculty ranking
                            and advancement evaluation.
                        </li>
                        <li>
                            Your data will only be accessible to authorized
                            personnel — specifically the{" "}
                            <strong>HR Department</strong> and the{" "}
                            <strong>Office of the VPAA</strong> — for the
                            duration of an active evaluation period.
                        </li>
                        <li>
                            Uploaded documents submitted for evaluation are
                            stored securely and will not be shared outside of
                            the ranking process without your written consent.
                        </li>
                        <li>
                            <strong>Salary information</strong> is classified
                            and is not disclosed within the faculty-facing
                            portal. Only authorized HR personnel may view salary
                            records.
                        </li>
                        <li>
                            You have the right to request access to, correction
                            of, or deletion of your personal data by contacting
                            the MIS Office or the Data Privacy Officer of Gordon
                            College.
                        </li>
                    </ul>

                    <p>
                        For questions or concerns regarding your data, contact
                        the <strong>Gordon College MIS Office</strong> or email{" "}
                        <strong>[dpo@gordoncollege.edu.ph]</strong>.
                    </p>
                </div>
            </div>

            {/* ── CHANGE PASSWORD ── */}
            <div className="pf-card">
                <div className="pf-card-header">
                    <div className="pf-card-icon">
                        <Lock size={16} />
                    </div>
                    <div className="pf-card-title">Change Password</div>
                </div>

                {cpSuccess ? (
                    <div className="pf-cp-success">
                        <CheckCircle size={22} color="#1e8449" />
                        <div>
                            <div
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: "#1e8449",
                                }}
                            >
                                Password updated successfully
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                    marginTop: 2,
                                }}
                            >
                                You can now use your new password to log in.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {cpError && <div className="pf-cp-error">{cpError}</div>}
                        <div className="pf-cp-fields">
                            <div className="pf-cp-field">
                                <label className="pf-label">
                                    Current Password
                                </label>
                                <div className="pf-cp-wrap">
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        className="pf-cp-input"
                                        placeholder="Enter current password"
                                        value={cpCurrent}
                                        onChange={(e) =>
                                            setCpCurrent(e.target.value)
                                        }
                                        autoComplete="current-password"
                                    />
                                    <button
                                        className="pf-cp-eye"
                                        onClick={() =>
                                            setShowCurrent((v) => !v)
                                        }
                                    >
                                        {showCurrent ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="pf-cp-field">
                                <label className="pf-label">New Password</label>
                                <div className="pf-cp-wrap">
                                    <input
                                        type={showNew ? "text" : "password"}
                                        className="pf-cp-input"
                                        placeholder="At least 8 characters"
                                        value={cpNew}
                                        onChange={(e) =>
                                            setCpNew(e.target.value)
                                        }
                                        autoComplete="new-password"
                                    />
                                    <button
                                        className="pf-cp-eye"
                                        onClick={() => setShowNew((v) => !v)}
                                    >
                                        {showNew ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>
                                </div>
                                {cpNew && (
                                    <>
                                        <div className="pf-strength-bar">
                                            <div
                                                className="pf-strength-fill"
                                                style={{
                                                    width: strength.pct,
                                                    background: strength.color,
                                                }}
                                            />
                                        </div>
                                        <div
                                            className="pf-strength-label"
                                            style={{ color: strength.color }}
                                        >
                                            {strength.label}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="pf-cp-field">
                                <label className="pf-label">
                                    Confirm New Password
                                </label>
                                <div className="pf-cp-wrap">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        className="pf-cp-input"
                                        placeholder="Re-enter new password"
                                        value={cpConfirm}
                                        onChange={(e) =>
                                            setCpConfirm(e.target.value)
                                        }
                                        autoComplete="new-password"
                                    />
                                    <button
                                        className="pf-cp-eye"
                                        onClick={() =>
                                            setShowConfirm((v) => !v)
                                        }
                                    >
                                        {showConfirm ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>
                                </div>
                                {cpConfirm && (
                                    <div
                                        className="pf-match-msg"
                                        style={{
                                            color: passwordsMatch
                                                ? "#1e8449"
                                                : "var(--danger)",
                                        }}
                                    >
                                        {passwordsMatch ? (
                                            <>
                                                <CheckCircle size={13} />{" "}
                                                Passwords match
                                            </>
                                        ) : (
                                            "✗ Passwords do not match"
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pf-cp-actions">
                            <button
                                className="pf-cp-cancel"
                                onClick={() => {
                                    setCpCurrent("");
                                    setCpNew("");
                                    setCpConfirm("");
                                    setCpError("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="pf-cp-save"
                                onClick={handleCpSubmit}
                            >
                                Update Password
                            </button>
                        </div>
                    </>
                )}
            </div>

            {toasts.length > 0 && (
                <div className="pf-toast-wrap" role="status" aria-live="polite">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`pf-toast ${toast.kind || "info"}`}
                        >
                            {toast.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Education Modal */}
            <EducationModal
                isOpen={eduModalOpen}
                initialData={editEduIndex !== null ? eduList[editEduIndex] : null}
                onClose={() => { setEduModalOpen(false); setEditEduIndex(null); }}
                onSubmit={(data) => { if (editEduIndex !== null) return handleUpdateEdu(editEduIndex, data); return handleAddEdu(data); }}
                isLoading={isSubmittingEdu}
            />

            {/* Eligibility Modal */}
            <EligibilityModal
                isOpen={eligModalOpen}
                initialData={editEligIndex !== null ? eligList[editEligIndex] : null}
                onClose={() => { setEligModalOpen(false); setEditEligIndex(null); }}
                onSubmit={(data) => { if (editEligIndex !== null) return handleUpdateElig(editEligIndex, data); return handleAddElig(data); }}
                isLoading={isSubmittingElig}
            />

            {/* Doctoral Modal */}
            <DoctoralModal
                isOpen={doctoralModalOpen}
                initialData={editDoctoralIndex !== null ? doctoralList[editDoctoralIndex] : null}
                onClose={() => { setDoctoralModalOpen(false); setEditDoctoralIndex(null); }}
                onSubmit={(data) => { if (editDoctoralIndex !== null) return handleUpdateDoctoral(editDoctoralIndex, data); return handleAddDoctoral(data); }}
                isLoading={isSubmittingDoctoral}
            />
        </>
    );
}
