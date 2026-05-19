import { ChevronLeft } from "lucide-react";
import PartCard from "./PartCard.jsx";
import AreaListCard from "./AreaListCard.jsx";

export default function HomeDetail({
    view,
    currentArea,
    areasData,
    openArea,
    backToList,
    submissionOpen,
    getBusyAction,
    handleDownloadTemplate,
    handleAttachFile,
    handleReplaceFile,
    handleRemoveDraft,
    handleSubmitPart,
    handleViewFile,
    handleDownloadFile,
    getRequiredName,
}) {
    return view === "list" ? (
        <div className="hm-areas-panel">
            <div className="hm-panel-header">
                <div>
                    <div className="hm-panel-title">Career Advancement Areas</div>
                    <div className="hm-panel-sub">Click an area to open it. Each Part inside has its own template download and submission slot.</div>
                </div>
                <span className="hm-badge-green">{areasData.length} Areas</span>
            </div>
            <div className="hm-area-list">
                {areasData.map((area) => (
                    <AreaListCard key={area.id} area={area} onClick={() => openArea(area.id)} />
                ))}
            </div>
        </div>
    ) : currentArea ? (
        <div>
            <div className="hm-detail-back">
                <button className="hm-back-btn" onClick={backToList}>
                    <ChevronLeft size={15} /> Back to Areas
                </button>
                <span className="hm-breadcrumb">
                    Dashboard &rsaquo; <strong>Area {currentArea.id} — {currentArea.name}</strong>
                </span>
            </div>
            <div className="hm-detail-header">
                <div>
                    <div className="hm-dh-num">Area {currentArea.id}</div>
                    <div className="hm-dh-name">{currentArea.name}</div>
                    <div className="hm-dh-note">{currentArea.note}</div>
                </div>
                <div className="hm-dh-right">
                    <div className="hm-dh-pts-label">Max Points</div>
                    <div className="hm-dh-pts">{currentArea.maxPts}.00</div>
                </div>
            </div>
            <div className="hm-parts-list">
                {currentArea.parts.map((part) => (
                    <PartCard
                        key={part.id}
                        part={part}
                        submissionOpen={submissionOpen}
                        getBusyAction={getBusyAction}
                        onDownloadTemplate={handleDownloadTemplate}
                        onAttachFile={handleAttachFile}
                        onReplaceFile={handleReplaceFile}
                        onRemoveDraft={handleRemoveDraft}
                        onSubmitPart={handleSubmitPart}
                        onViewFile={handleViewFile}
                        onDownloadFile={handleDownloadFile}
                        getRequiredName={getRequiredName}
                    />
                ))}
            </div>
        </div>
    ) : null;
}
