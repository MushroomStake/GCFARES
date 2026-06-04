import { ArrowRight, Info } from "lucide-react";
import { getAreaStatus, getProgress } from "../homeUtils.js";

export default function AreaListCard({ area, onClick }) {
    const status = getAreaStatus(area);
    const { done, total } = getProgress(area);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const badgeText =
        status === "submitted"
            ? "Complete"
            : status === "progress"
              ? "In Progress"
              : status === "auto"
                ? "Auto-scored"
                : "Pending";
    const className =
        status === "submitted"
            ? "s"
            : status === "progress"
              ? "p"
              : status === "auto"
                ? "a"
                : "";

    return (
        <div
            className={`hm-alc ${className}`}
            onClick={status !== "auto" ? onClick : undefined}
        >
            <div className="hm-alc-top">
                <span className="hm-alc-num">Area {area.id}</span>
                <span
                    className={`hm-alc-badge ${status === "submitted" ? "s" : status === "progress" ? "p" : status === "auto" ? "a" : "e"}`}
                >
                    {badgeText}
                </span>
            </div>
            <div className="hm-alc-name">{area.name}</div>
            {status !== "auto" && (
                <>
                    <div className="hm-alc-bottom">
                        <span className="hm-alc-prog-text">
                            {done} of {total} part{total !== 1 ? "s" : ""} submitted
                        </span>
                        <span className="hm-alc-maxpts">Max {area.maxPts} pts</span>
                    </div>
                    <div className="hm-alc-prog-bar">
                        <div
                            className="hm-alc-prog-fill"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="hm-alc-hint g">
                        Open Area {area.id} <ArrowRight size={11} />
                    </div>
                </>
            )}
            {status === "auto" && (
                <div className="hm-alc-hint b">
                    <Info size={11} /> Scored by HR · no upload needed · Max {area.maxPts} pts
                </div>
            )}
        </div>
    );
}
