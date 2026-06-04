import { School, TrendingUp } from "lucide-react";
import { compressSequentialApplyingFor } from "../homeHelpers.js";

export default function HomeSummary({ profileInfo, applicationInfo }) {
    return (
        <div className="hm-rank-summary">
            <div className="hm-rs-item">
                <div className="hm-rs-label">Current Rank</div>
                <div className="hm-rs-value">
                    <School size={14} color="var(--gc-green)" /> {profileInfo.currentRank}
                </div>
            </div>
            <div className="hm-rs-divider" />
            <div className="hm-rs-item">
                <div className="hm-rs-label">Applying For</div>
                <div className="hm-rs-value">
                    <TrendingUp size={14} color="var(--gc-green)" /> {compressSequentialApplyingFor(profileInfo.applyingFor || applicationInfo.targetRank)}
                </div>
                <div className="hm-rs-sub">This period&apos;s target</div>
            </div>
        </div>
    );
}
