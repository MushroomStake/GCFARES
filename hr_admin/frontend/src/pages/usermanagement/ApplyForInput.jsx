import React, { useState, useRef, useEffect } from 'react';

function collapseRanges(selected = [], options = []) {
  const idxMap = new Map();
  options.forEach((o, i) => idxMap.set(o, i));
  const indices = (selected || []).map(s => idxMap.get(s)).filter(n => typeof n === 'number').sort((a,b)=>a-b);
  const groups = [];
  let i = 0;
  
  while (i < indices.length) {
    let start = indices[i];
    let end = start;
    
    while (i + 1 < indices.length && indices[i+1] === end + 1) { i++; end = indices[i]; }
    
    const blockItems = [];
    for (let k = start; k <= end; k++) blockItems.push({ idx: k, text: options[k] });
    
    const prefixGroups = [];
    let currentPrefix = null;
    let currentGroup = [];
    
    for (const item of blockItems) {
      const split = item.text.lastIndexOf(' ');
      const prefix = split === -1 ? item.text : item.text.slice(0, split);
      
      if (prefix !== currentPrefix) {
        if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
        currentPrefix = prefix;
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    }
    if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
    
    for (const pg of prefixGroups) {
      const first = pg.items[0];
      const last = pg.items[pg.items.length - 1];
      const splitF = first.text.lastIndexOf(' ');
      const splitL = last.text.lastIndexOf(' ');
      const sufF = splitF === -1 ? first.text : first.text.slice(splitF + 1);
      const sufL = splitL === -1 ? last.text : last.text.slice(splitL + 1);
      
      let label;
      if (pg.items.length > 1) {
        label = `${pg.prefix} ${sufF}-${sufL}`;
      } else {
        label = first.text;
      }
      groups.push({ start: first.idx, end: last.idx, label });
    }
    
    i++;
  }
  
  return groups;
}

export default function ApplyForInput({ options = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const toggleOption = (opt) => {
    let next = [...(value || [])];
    if (next.includes(opt)) {
      next = next.filter(v => v !== opt);
    } else {
      next.push(opt);
    }
    onChange && onChange(next);
  };

  const removeRange = (group) => {
    if (!group) return;
    let next = (value || []).slice();
    if (group.start == null) {
      next = next.filter(v => v !== group.label);
    } else {
      const rem = [];
      for (let k = group.start; k <= group.end; k++) rem.push(options[k]);
      next = next.filter(v => !rem.includes(v));
    }
    onChange && onChange(next);
  };

  const groups = collapseRanges(value || [], options || []);
  const unselected = options.filter(o => !value?.includes(o));

  return (
    <div className="apply-for-input" ref={containerRef}>
      <div className="apply-for-tags">
        {groups.map((g, idx) => (
          <span key={idx} className="apply-for-tag" style={{ background: '#1e6e38', color: '#fff', padding: '6px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '500' }}>
            {g.label}
            <button type="button" className="apply-for-tag-remove" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#fff', fontWeight: '700', fontSize: '1rem', borderRadius: '4px' }} onClick={() => removeRange(g)}>×</button>
          </span>
        ))}
      </div>
      
      <button
        type="button"
        className="apply-for-trigger"
        style={{ background: open ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', alignSelf: 'flex-start' }}
        onClick={() => setOpen(prev => !prev)}
      >
        {open ? 'Done' : '+ Add Rank'}
      </button>

      {open && unselected.length > 0 && (
        <div className="apply-for-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 30, maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
          {unselected.map(opt => (
            <label
              key={opt}
              className="apply-for-option"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', fontSize: '0.8rem', color: '#1f2937', borderBottom: '1px solid #f0f0f0' }}
              onMouseDown={(e) => e.stopPropagation()} /* prevent document click handler from closing dropdown */
            >
              <input
                type="checkbox"
                checked={value?.includes(opt)}
                onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
                readOnly
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1e6e38' }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
      {open && unselected.length === 0 && (
        <div className="apply-for-dropdown apply-for-empty" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 30, padding: '16px 12px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' }}>
          All ranks selected
        </div>
      )}
    </div>
  );
}
