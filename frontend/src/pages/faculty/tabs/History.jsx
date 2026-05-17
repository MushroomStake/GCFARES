// SIA/frontend/src/pages/faculty/tabs/History.jsx

import { useCallback, useEffect, useState } from "react";
import { portalApi } from "../../../lib/portalApi";

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const css = `
  @keyframes histFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hist-panel {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #dde5df;
    padding: 24px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    margin-bottom: 20px;
    animation: histFadeUp 0.45s ease both;
  }
  .hist-panel:last-child { margin-bottom: 0; }
  .hist-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 16px;
  }
  @media (max-width: 900px) { .hist-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .hist-grid { grid-template-columns: 1fr; } }

  .hc {
    border: 1.5px solid #dde5df;
    border-radius: 12px;
    padding: 18px;
    background: #f8f7f4;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .hc:hover { border-color: #1a6b3c; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
  .hc.open  { border-color: #1a6b3c; background: #eef7f2; }

  .hc-tag {
    font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: #6b7c70; margin-bottom: 8px;
  }
  .hc.open .hc-tag { color: #1a6b3c; }

  .hc-title {
    font-family: 'Playfair Display', serif;
    font-size: 14px; font-weight: 600;
    color: #1a1a1a; margin-bottom: 6px; line-height: 1.3;
  }
  .hc-meta { font-size: 11.5px; color: #6b7c70; margin-bottom: 10px; line-height: 1.5; }

  .hc-row { display: flex; align-items: center; justify-content: space-between; }

  .hc-badge {
    font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px;
  }
  .hcb-published { background: #eafaf1; color: #1e8449; }
  .hcb-open      { background: #1a6b3c; color: #fff; }
  .hcb-draft     { background: #fdf8ec; color: #7d5a10; }
  .hcb-closed    { background: #f5f5f5; color: #888; }


  .open-pill {
    position: absolute; top: 14px; right: 14px;
    background: #1a6b3c; color: #fff;
    font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
    padding: 2px 8px; border-radius: 8px; text-transform: uppercase;
  }
`;

// Intentionally no mock rows here so History only shows live data.


const CYCLE_TABLE_CANDIDATES = "ranking_cycles"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

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

function formatShortDate(value, fallback = "Unknown") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

async function queryRowsFromTableCandidates(tableCandidates, limit = 80) {
    for (const table of tableCandidates) {
        const ordered = await portalApi
            .from(table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (!ordered.error && Array.isArray(ordered.data)) {
            return { table, rows: ordered.data };
        }

        const plain = await portalApi.from(table).select("*").limit(limit);
        if (!plain.error && Array.isArray(plain.data)) {
            return { table, rows: plain.data };
        }
    }

    return { table: null, rows: [] };
}

function mapStatusToCard(statusText, isOpen) {
    const status = String(statusText || "").toLowerCase();
    if (isOpen || status.includes("open")) {
        return { status: "open", statusLabel: "In Progress", isOpen: true };
    }
    if (
        status.includes("publish") ||
        status.includes("complete") ||
        status.includes("closed")
    ) {
        return { status: "published", statusLabel: "Published", isOpen: false };
    }
    if (status.includes("draft") || status.includes("pending")) {
        return { status: "draft", statusLabel: "Draft", isOpen: false };
    }
    return { status: "closed", statusLabel: "Closed", isOpen: false };
}

function toPeriodCards(periodRows) {
    if (!Array.isArray(periodRows) || periodRows.length === 0) {
        return [];
    }

    return periodRows.map((period, index) => {
        const periodId = getFirstValue(period, ["cycle_id", "id"]);
        const title = String(
            getFirstValue(period, ["title", "cycle", "cycle_name", "name"], `Period ${index + 1}`),
        );
        const startDate = getFirstValue(period, ["start_date", "start_at", "created_at"]);
        const deadlineDate = getFirstValue(period, ["deadline", "deadline_at", "submission_deadline"]);
        const publishedAt = getFirstValue(period, ["published_at", "closed_at", "updated_at"]);
        const statusBits = mapStatusToCard(
            getFirstValue(period, ["status", "state"], ""),
            Boolean(getFirstValue(period, ["is_open", "submission_open", "open"], false)),
        );

        return {
            id: periodId || `period-${index}`,
            tag: statusBits.isOpen ? "Current Period" : "Completed",
            title,
            meta: [
                `Started: ${formatShortDate(startDate, "Unknown")}`,
                statusBits.isOpen
                    ? `Deadline: ${formatShortDate(deadlineDate, "TBA")}`
                    : `Published: ${formatShortDate(publishedAt || deadlineDate, "TBA")}`,
            ],
            status: statusBits.status,
            statusLabel: statusBits.statusLabel,
            isOpen: statusBits.isOpen,
        };
    });
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PeriodCard({ period }) {
    const badgeClass = {
        open:      "hcb-open",
        published: "hcb-published",
        draft:     "hcb-draft",
        closed:    "hcb-closed",
    }[period.status] || "hcb-closed";

    return (
        <div className={`hc${period.isOpen ? " open" : ""}`}>
            {period.isOpen && <span className="open-pill">Open</span>}
            <div className="hc-tag">{period.tag}</div>
            <div className="hc-title">{period.title}</div>
            <div className="hc-meta">
                {period.meta.map((m, i) => <span key={i}>{m}<br /></span>)}
            </div>
            <div className="hc-row">
                <span className={`hc-badge ${badgeClass}`}>{period.statusLabel}</span>
            </div>
        </div>
    );
}

// â”€â”€â”€ Main Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function History({ cycles }) {
    const [periodData, setPeriodData] = useState(cycles || []);
    const [isLoading, setIsLoading] = useState(!cycles);
    const [resolvedCycleTable, setResolvedCycleTable] = useState(CYCLE_TABLE_CANDIDATES[0] || "ranking_cycles");

    const [showAll, setShowAll] = useState(false);
    const visiblePeriods = showAll ? periodData : periodData.slice(0, 3);

    const refreshHistory = useCallback(async () => {
        const periodResult = await queryRowsFromTableCandidates(CYCLE_TABLE_CANDIDATES, 40);
        if (periodResult.table) {
            setResolvedCycleTable(periodResult.table);
        }
        setPeriodData(toPeriodCards(periodResult.rows));
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let isActive = true;

        const hydrateHistory = async () => {
            if (cycles) {
                if (!isActive) return;
                setPeriodData(cycles);
                setIsLoading(false);
                return;
            }

            await refreshHistory();
        };

        void hydrateHistory();

        return () => {
            isActive = false;
        };
    }, [cycles, refreshHistory]);

    useEffect(() => {
        if (!resolvedCycleTable) return;

        const channel = portalApi
            .channel(`faculty-history-cycles-${resolvedCycleTable}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: resolvedCycleTable,
                },
                () => {
                    void refreshHistory();
                },
            )
            .subscribe();

        if (!cycles) {
            void refreshHistory();
        }

        return () => {
            portalApi.removeChannel(channel);
        };
    }, [cycles, refreshHistory, resolvedCycleTable]);

    return (
        <>
            {/* Inject styles once */}
            <style>{css}</style>

            {/* Ranking Period History */}
            <div className="hist-panel">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>
                            Ranking History
                        </div>
                        <div style={{ fontSize: 12.5, color: "#6b7c70", marginTop: 3 }}>
                            All ranking periods you have participated in or that are currently open
                        </div>
                    </div>
                    <span style={{ background: "#eef7f2", color: "#1a6b3c", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, whiteSpace: "nowrap" }}>
                        {periodData.length} Period{periodData.length !== 1 ? "s" : ""}
                    </span>
                </div>

                <div className="hist-grid">
                    {visiblePeriods.length > 0 ? (
                        visiblePeriods.map((c) => <PeriodCard key={c.id} period={c} />)
                    ) : (
                        <div style={{ gridColumn: "1 / -1", color: "#6b7c70", fontSize: 13, fontStyle: "italic", padding: "6px 2px" }}>
                            {isLoading
                                ? "Loading ranking period history..."
                                : "No ranking periods found for your account yet."}
                        </div>
                    )}
                </div>

                {periodData.length > 3 && (
                    <div style={{ marginTop: 14, textAlign: "right" }}>
                        <button
                            onClick={() => setShowAll(p => !p)}
                            style={{ background: "none", border: "none", color: "#1a6b3c", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                            {showAll ? "Show less" : "See more"}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
