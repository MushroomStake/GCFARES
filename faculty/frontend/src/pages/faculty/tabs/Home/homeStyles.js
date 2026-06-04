const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
  :root {
    --gc-green:#1a6b3c;--gc-green-dark:#134f2c;--gc-green-light:#228b4e;
    --gc-green-pale:#eef7f2;--gc-gold:#c9a84c;--gc-gold-light:#e8c96b;
    --gc-gold-pale:#fdf8ec;--white:#ffffff;--off-white:#f8f7f4;
    --text-dark:#1a1a1a;--text-mid:#3a4a3e;--text-muted:#6b7c70;
    --border:#dde5df;--danger:#c0392b;--danger-pale:#fdf0ee;
    --blue:#2471a3;--blue-pale:#eaf3fb;
  }
  .hm-hero{background:linear-gradient(135deg,var(--gc-green-dark) 0%,var(--gc-green) 55%,#22704a 100%);border-radius:16px;padding:26px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(26,107,60,0.22);animation:hmFU .5s .1s ease both;}
  .hm-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:rgba(201,168,76,0.09);pointer-events:none;}
  .hm-hero-left{display:flex;align-items:center;position:relative;z-index:1;flex:1;min-width:0;}
  .hm-hero-info{min-width:0;}
  .hm-period-tag{font-size:10.5px;color:var(--gc-gold-light);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:4px;}
  .hm-name{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);font-weight:600;margin-bottom:7px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hm-rank-flow{display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap;}
  .hm-rank-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.22);border-radius:20px;padding:3px 11px;font-size:12px;color:var(--white);font-weight:500;}
  .hm-rank-chip.target{background:rgba(201,168,76,0.22);border-color:rgba(201,168,76,0.45);color:var(--gc-gold-light);}
  .hm-rank-arrow{color:rgba(255,255,255,0.45);display:flex;align-items:center;}
  .hm-status-pill{display:inline-flex;align-items:center;gap:5px;border-radius:12px;padding:3px 11px;font-size:11px;font-weight:600;}
  .hm-status-draft{background:rgba(201,168,76,0.2);border:1px solid rgba(201,168,76,0.4);color:var(--gc-gold-light);}
  .hm-dept-tag{font-size:12px;color:rgba(255,255,255,0.72);display:flex;align-items:center;gap:5px;}
  .hm-hero-right{position:relative;z-index:1;text-align:center;flex-shrink:0;}
  .hm-deadline-ring{width:96px;height:96px;position:relative;margin:0 auto 7px;}
  .hm-deadline-ring svg{width:96px;height:96px;transform:rotate(-90deg);}
  .hm-ring-bg{fill:none;stroke:rgba(255,255,255,0.12);stroke-width:7;}
  .hm-ring-fill{fill:none;stroke:var(--gc-gold);stroke-width:7;stroke-linecap:round;stroke-dasharray:251;stroke-dashoffset:63;}
  .hm-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
  .hm-ring-days{font-size:20px;font-weight:700;color:var(--white);line-height:1;}
  .hm-ring-days-label{font-size:8px;color:rgba(255,255,255,0.55);letter-spacing:1px;text-transform:uppercase;margin-top:2px;}
  .hm-deadline-copy{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;}
  .hm-deadline-label{font-size:10px;color:rgba(255,255,255,0.6);}
  .hm-deadline-date{font-size:12px;font-weight:600;color:var(--gc-gold-light);}
  /* RANK SUMMARY */
  .hm-rank-summary{background:var(--white);border-radius:12px;border:1px solid var(--border);padding:16px 20px;margin-bottom:16px;display:flex;align-items:stretch;box-shadow:0 2px 6px rgba(0,0,0,0.04);overflow:hidden;animation:hmFU .5s .15s ease both;}
  .hm-rs-item{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 20px;gap:4px;}
  .hm-rs-item:first-child{padding-left:0;}.hm-rs-item:last-child{padding-right:0;}
  .hm-rs-divider{width:1px;background:var(--border);flex-shrink:0;}
  .hm-rs-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;}
  .hm-rs-value{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:var(--text-dark);line-height:1.2;display:flex;align-items:center;gap:6px;}
  .hm-rs-sub{font-size:11px;color:var(--text-muted);margin-top:1px;}
  /* AREA LIST PANEL */
  .hm-areas-panel{background:var(--white);border-radius:14px;border:1px solid var(--border);padding:20px;box-shadow:0 2px 6px rgba(0,0,0,0.04);margin-bottom:20px;animation:hmFU .5s .25s ease both;}
  .hm-panel-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:8px;}
  .hm-panel-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:var(--text-dark);}
  .hm-panel-sub{font-size:11.5px;color:var(--text-muted);margin-top:2px;}
  .hm-badge-green{background:var(--gc-green-pale);color:var(--gc-green-dark);font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;white-space:nowrap;}
  /* AREA LIST CARDS */
  .hm-area-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
  .hm-alc{border-radius:12px;border:1.5px solid var(--border);padding:14px 16px;cursor:pointer;transition:all .18s;background:var(--off-white);display:flex;flex-direction:column;gap:6px;}
  .hm-alc:hover{border-color:var(--gc-green);background:var(--gc-green-pale);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,0.07);}
  .hm-alc.s{border-color:#a9dfbf;background:#f8fffe;}
  .hm-alc.p{border-color:var(--gc-gold);background:var(--gc-gold-pale);}
  .hm-alc.a{border-color:rgba(36,113,163,0.3);background:var(--blue-pale);cursor:default;}
  .hm-alc.a:hover{transform:none;border-color:rgba(36,113,163,0.3);background:var(--blue-pale);}
  .hm-alc-top{display:flex;align-items:center;justify-content:space-between;}
  .hm-alc-num{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--text-muted);background:var(--white);border:1px solid var(--border);padding:2px 8px;border-radius:6px;}
  .hm-alc-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;}
  .hm-alc-badge.s{background:#eafaf1;color:#1e8449;}.hm-alc-badge.p{background:var(--gc-gold-pale);color:#7d5a10;}.hm-alc-badge.e{background:#f0f0f0;color:#888;}.hm-alc-badge.a{background:var(--blue-pale);color:var(--blue);}
  .hm-alc-name{font-size:13px;font-weight:600;color:var(--text-dark);line-height:1.3;}
  .hm-alc-bottom{display:flex;align-items:center;justify-content:space-between;}
  .hm-alc-prog-text{font-size:11px;color:var(--text-muted);}
  .hm-alc-maxpts{font-size:10.5px;color:var(--text-muted);}
  .hm-alc-prog-bar{height:3px;background:var(--border);border-radius:4px;overflow:hidden;margin-top:4px;}
  .hm-alc-prog-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gc-green),var(--gc-green-light));transition:width .4s;}
  .hm-alc-hint{font-size:11px;font-weight:600;display:flex;align-items:center;gap:3px;margin-top:2px;}
  .hm-alc-hint.g{color:var(--gc-green);}.hm-alc-hint.b{color:var(--blue);}
  /* DETAIL VIEW */
  .hm-detail-back{display:flex;align-items:center;gap:8px;margin-bottom:16px;animation:hmFU .3s ease both;}
  .hm-back-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid var(--border);background:var(--white);font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:'Source Sans 3',sans-serif;transition:all .15s;}
  .hm-back-btn:hover{border-color:var(--gc-green);color:var(--gc-green);background:var(--gc-green-pale);}
  .hm-breadcrumb{font-size:12.5px;color:var(--text-muted);}
  .hm-breadcrumb strong{color:var(--gc-green-dark);}
  .hm-detail-header{background:linear-gradient(135deg,var(--gc-green-dark),var(--gc-green));border-radius:14px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;animation:hmFU .35s ease both;}
  .hm-dh-num{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gc-gold-light);margin-bottom:5px;}
  .hm-dh-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--white);line-height:1.2;}
  .hm-dh-note{font-size:12px;color:rgba(255,255,255,0.7);margin-top:5px;line-height:1.5;}
  .hm-dh-right{text-align:right;flex-shrink:0;}
  .hm-dh-pts-label{font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
  .hm-dh-pts{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--gc-gold-light);}
  /* PART CARDS */
  .hm-parts-list{display:flex;flex-direction:column;gap:12px;animation:hmFU .4s ease both;}
  .hm-pc{background:var(--white);border-radius:12px;border:1.5px solid var(--border);overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
  .hm-pc.s{border-color:#a9dfbf;}.hm-pc.d{border-color:var(--gc-gold);}.hm-pc.auto{border-color:rgba(36,113,163,0.3);}
  .hm-pc-header{display:flex;align-items:center;gap:10px;padding:13px 16px 11px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
  .hm-pc-label{font-size:13.5px;font-weight:700;color:var(--text-dark);flex:1;line-height:1.3;min-width:0;}
  .hm-pc-pts{font-size:11px;font-weight:700;color:var(--gc-green-dark);background:var(--gc-green-pale);padding:2px 9px;border-radius:7px;white-space:nowrap;flex-shrink:0;}
  .hm-pc-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px;white-space:nowrap;flex-shrink:0;}
  .hm-pc-status.s{background:#eafaf1;color:#1e8449;}.hm-pc-status.d{background:var(--gc-gold-pale);color:#7d5a10;}.hm-pc-status.e{background:#f0f0f0;color:#888;}.hm-pc-status.auto{background:var(--blue-pale);color:var(--blue);}
  .hm-pc-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px;}
  /* What to Submit rubric */
  .hm-pc-rubric{background:var(--off-white);border-radius:8px;padding:12px 14px;border-left:3px solid var(--gc-gold);}
  .hm-pc-rubric-label{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--gc-gold);margin-bottom:8px;}
  .hm-pc-rubric-list{list-style:none;display:flex;flex-direction:column;gap:4px;}
  .hm-pc-rubric-list li{font-size:12px;color:var(--text-mid);line-height:1.55;padding-left:14px;position:relative;}
  .hm-pc-rubric-list li::before{content:'▸';position:absolute;left:0;color:var(--gc-gold);font-size:9.5px;top:2px;}
  .hm-pc-rubric-list li.indent{padding-left:24px;color:var(--text-muted);}
  .hm-pc-rubric-list li.indent::before{left:10px;}
  .hm-required-file{display:flex;align-items:center;gap:8px;flex:0 1 auto;width:fit-content;max-width:min(100%,520px);padding:8px 11px;border:1px dashed rgba(26,107,60,.35);border-radius:8px;background:#f7fbf8;color:var(--text-muted);font-size:12px;}
  .hm-required-file strong{color:var(--gc-green-dark);font-weight:700;white-space:nowrap;flex-shrink:0;}
  .hm-required-file code{font-family:Consolas,'Courier New',monospace;font-size:11.5px;color:#1a1a1a;background:#fff;border:1px solid #dde5df;border-radius:6px;padding:2px 6px;flex:0 1 auto;min-width:0;max-width:min(42ch,44vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  /* Auto info */
  .hm-auto-info{background:var(--blue-pale);border:1px solid rgba(36,113,163,0.2);border-radius:8px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;}
  .hm-auto-info p{font-size:13px;color:var(--blue);line-height:1.6;}
  /* File + controls */
  .hm-pc-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .hm-btn-template{display:flex;align-items:center;gap:5px;padding:8px 13px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid var(--gc-green);background:var(--gc-green-pale);color:var(--gc-green);cursor:pointer;font-family:'Source Sans 3',sans-serif;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-template:hover{background:var(--gc-green);color:var(--white);}
  .hm-file-zone{flex:0 1 auto;min-width:0;width:fit-content;max-width:min(100%,520px);display:flex;align-items:center;gap:7px;background:#f4f7f5;border-radius:8px;padding:8px 11px;font-size:12px;color:var(--text-mid);}
  .hm-file-name{flex:0 1 auto;min-width:0;max-width:min(42ch,44vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;}
  .hm-fab{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:all .15s;flex-shrink:0;}
  .hm-fab-view{background:#e8f4fd;color:var(--blue);}.hm-fab-dl{background:var(--gc-green-pale);color:var(--gc-green);}.hm-fab-del{background:var(--danger-pale);color:var(--danger);}
  .hm-btn-attach{display:flex;align-items:center;gap:5px;padding:8px 13px;border-radius:8px;font-size:12px;font-weight:600;border:1.5px dashed var(--border);background:var(--white);cursor:pointer;font-family:'Source Sans 3',sans-serif;color:var(--text-muted);transition:all .15s;white-space:nowrap;flex:0 0 auto;width:fit-content;}
  .hm-btn-attach:hover{border-color:var(--gc-green);color:var(--gc-green);}
  .hm-btn-replace{display:flex;align-items:center;gap:5px;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:600;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-family:'Source Sans 3',sans-serif;color:var(--text-muted);transition:background .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-replace:hover{background:var(--off-white);}
  .hm-btn-submit{display:flex;align-items:center;gap:5px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:'Source Sans 3',sans-serif;background:linear-gradient(135deg,var(--gc-green),var(--gc-green-light));color:var(--white);box-shadow:0 3px 10px rgba(26,107,60,0.2);transition:opacity .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-submit:hover:not(:disabled){opacity:0.9;}
  .hm-btn-submit:disabled{background:linear-gradient(135deg,#27ae60,#2ecc71);cursor:default;box-shadow:none;}
  .hm-pc-date{font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;}
  /* Error modal */
  .hm-modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.38);display:flex;align-items:center;justify-content:center;padding:18px;z-index:11000;}
  .hm-error-modal{width:min(420px,100%);background:var(--white);border-radius:12px;border:1px solid #f5b7b1;box-shadow:0 18px 45px rgba(0,0,0,.22);overflow:hidden;animation:hmFU .18s ease both;}
  .hm-error-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 10px;}
  .hm-error-modal-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#c0392b;}
  .hm-error-modal-close{width:28px;height:28px;border:none;border-radius:7px;background:#fef2f2;color:#c0392b;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .hm-error-modal-body{padding:0 18px 16px;font-size:13px;line-height:1.55;color:var(--text-mid);}
  .hm-error-modal-file{margin-top:10px;padding:8px 10px;border-radius:8px;background:#f8f7f4;color:#1a1a1a;font-family:Consolas,'Courier New',monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .hm-error-modal-actions{display:flex;justify-content:flex-end;padding:12px 18px 16px;border-top:1px solid #f0f3f1;}
  .hm-error-modal-ok{border:none;border-radius:8px;background:#c0392b;color:#fff;font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;padding:8px 18px;cursor:pointer;}
    /* TOASTS */
    .hm-toast-wrap{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:10000;max-width:min(360px,92vw);}
    .hm-toast{display:flex;align-items:flex-start;gap:8px;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.4;box-shadow:0 10px 22px rgba(0,0,0,0.14);border:1px solid transparent;background:#fff;}
    .hm-toast.success{border-color:#a9dfbf;background:#eafaf1;color:#1e8449;}
    .hm-toast.error{border-color:#f5b7b1;background:#fef2f2;color:#c0392b;}
    .hm-toast.info{border-color:#bcd7ea;background:#eef6fc;color:#1f5f8a;}
  /* RESPONSIVE */
  @media(max-width:900px){
    .hm-area-list{grid-template-columns:1fr;}
    .hm-rank-summary{flex-wrap:wrap;}.hm-rs-divider{display:none;}.hm-rs-item{padding:0;flex:1 1 calc(50% - 12px);}
  }
  @media(max-width:640px){
    .hm-hero{padding:20px;}
    .hm-ring-days{font-size:16px;}.hm-name{font-size:17px;}.hm-rank-flow{gap:5px;}.hm-rank-chip{font-size:11px;padding:2px 8px;}
    .hm-rs-item{flex:1 1 100%;}
    .hm-detail-header{flex-direction:column;align-items:flex-start;gap:8px;}.hm-dh-right{text-align:left;}
    .hm-pc-controls{flex-direction:column;align-items:stretch;}
    .hm-required-file{max-width:100%;}
    .hm-required-file code{max-width:100%;}
    .hm-btn-template,.hm-btn-attach,.hm-btn-replace,.hm-btn-submit{justify-content:center;}
  }
  @media(max-width:411.98px){
    .hm-hero{flex-direction:column;align-items:flex-start;}
    .hm-hero-right{align-self:stretch;display:flex;align-items:center;gap:16px;text-align:left;}
    .hm-deadline-ring{width:72px;height:72px;margin:0;}.hm-deadline-ring svg{width:72px;height:72px;}
    .hm-deadline-copy{align-items:flex-start;text-align:left;gap:3px;}
    .hm-deadline-label,.hm-deadline-date{line-height:1.15;}
  }
  /* ── GROUP HEADER (isGroup parts — Area II) ── */
  .hm-part-group{border:1.5px solid #dde5df;border-radius:14px;overflow:hidden;margin-bottom:0;}
  .hm-pg-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 18px;background:#f8f7f4;border-bottom:1.5px solid #dde5df;}
  .hm-pg-label{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:#1a1a1a;}
  .hm-pg-pts{font-size:12px;font-weight:700;color:#1a6b3c;background:#eef7f2;padding:3px 10px;border-radius:8px;white-space:nowrap;}
  .hm-pg-subparts{display:flex;flex-direction:column;gap:0;}
  .hm-pg-subparts .hm-pc{border-radius:0;border-left:none;border-right:none;border-top:none;border-bottom:1px solid #f0f3f1;margin-bottom:0;}
  .hm-pg-subparts .hm-pc:last-child{border-bottom:none;}
  .hm-pg-subparts .hm-pc.s{border-left:3px solid #1a6b3c;}
  .hm-pg-subparts .hm-pc.d{border-left:3px solid #c9a84c;}
  @keyframes hmFU{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
`;

export default styles;
