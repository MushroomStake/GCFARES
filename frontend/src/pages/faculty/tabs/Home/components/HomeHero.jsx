import { Building2, Lock, School, TrendingUp } from "lucide-react";

export default function HomeHero({ periodInfo, submissionOpen, profileInfo, userDisplayName }) {
    return (
        <>
            <div className="hm-hero">
                <div className="hm-hero-left">
                    <div className="hm-hero-info">
                        <div className="hm-period-tag">
                            {periodInfo.label} · {submissionOpen ? "Open Period" : "Submissions Closed"}
                        </div>
                        <div className="hm-name">
                            {`${profileInfo.firstName} ${profileInfo.lastName}`.trim() || userDisplayName || "Faculty Member"}
                        </div>
                        <div className="hm-dept-tag">
                            <Building2 size={12} /> {profileInfo.department}
                        </div>
                    </div>
                </div>
                <div className="hm-hero-right">
                    {submissionOpen ? (
                        <>
                            <div className="hm-deadline-ring">
                                <svg viewBox="0 0 96 96">
                                    <circle className="hm-ring-bg" cx="48" cy="48" r="40" />
                                    <circle className="hm-ring-fill" cx="48" cy="48" r="40" />
                                </svg>
                                <div className="hm-ring-center">
                                    <span className="hm-ring-days">{periodInfo.daysLeft}</span>
                                    <span className="hm-ring-days-label">Days Left</span>
                                </div>
                            </div>
                            <div className="hm-deadline-copy">
                                <div className="hm-deadline-label">Submission Deadline</div>
                                <div className="hm-deadline-date">{periodInfo.deadlineLabel}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="hm-deadline-ring" style={{ opacity: 0.55 }}>
                                <svg viewBox="0 0 96 96">
                                    <circle className="hm-ring-bg" cx="48" cy="48" r="40" />
                                </svg>
                                <div className="hm-ring-center">
                                    <Lock size={22} color="rgba(255,255,255,0.7)" />
                                </div>
                            </div>
                            <div className="hm-deadline-copy">
                                <div className="hm-deadline-label">Submissions</div>
                                <div className="hm-deadline-date" style={{ color: "rgba(255,255,255,0.6)" }}>Closed</div>
                                {profileInfo.status !== "ranking" && profileInfo.status !== "unknown" && (
                                    <div className="hm-deadline-note" style={{ marginTop: 6, fontSize: 12, opacity: 0.86 }}>
                                        Your account is not currently marked as For Ranking.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
