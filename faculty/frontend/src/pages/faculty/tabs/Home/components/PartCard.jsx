import {
    Calendar,
    CheckCircle,
    Download,
    Eye,
    FileText,
    Lock,
    Paperclip,
    RefreshCw,
    Send,
    X,
} from "lucide-react";

export default function PartCard({
    part,
    submissionOpen,
    getBusyAction,
    onDownloadTemplate,
    onAttachFile,
    onReplaceFile,
    onRemoveDraft,
    onSubmitPart,
    onViewFile,
    onDownloadFile,
    getRequiredName,
}) {
    if (part.isGroup) {
        return (
            <div className="hm-part-group">
                <div className="hm-pg-header">
                    <span className="hm-pg-label">{part.label}</span>
                    <span className="hm-pg-pts">{part.pts}</span>
                </div>
                <div className="hm-pg-subparts">
                    {part.subparts.map((subpart) => (
                        <PartCard
                            key={subpart.id}
                            part={subpart}
                            submissionOpen={submissionOpen}
                            getBusyAction={getBusyAction}
                            onDownloadTemplate={onDownloadTemplate}
                            onAttachFile={onAttachFile}
                            onReplaceFile={onReplaceFile}
                            onRemoveDraft={onRemoveDraft}
                            onSubmitPart={onSubmitPart}
                            onViewFile={onViewFile}
                            onDownloadFile={onDownloadFile}
                            getRequiredName={getRequiredName}
                        />
                    ))}
                </div>
            </div>
        );
    }

    const hasAttachedDraft = Boolean(part.fileObject || part.storagePath);
    const isSubmitted = part.status === "submitted";
    const isDraft = part.status === "draft" || part.status === "draft-local" || part.status === "failed" || hasAttachedDraft;
    const isEditableDraft = part.status === "draft" || part.status === "draft-local" || part.status === "failed";
    const hasVisibleFile = Boolean(part.file || hasAttachedDraft || isSubmitted);
    const sc = part.auto
        ? "auto"
        : part.status === "submitted"
            ? "s"
            : part.status === "failed"
                ? "d"
            : isDraft
                ? "d"
                : "e";
    const statusLabel = part.auto
        ? "Auto-scored"
        : part.status === "submitted"
            ? "✓ Submitted"
            : part.status === "failed"
                ? "Submission Failed"
            : isDraft
                ? "Draft"
                : "Pending";
    const partBusyAction = getBusyAction?.(part.id) || null;
    const isBusy = Boolean(partBusyAction);
    const requiredName = getRequiredName?.(part.id) || null;
    const requiredDisplayName = requiredName ? `${requiredName}.pdf` : null;
    const requiredFileChip = requiredDisplayName ? (
        <div className="hm-required-file" title={requiredDisplayName}>
            <strong>Required filename</strong>
            <code>{requiredDisplayName}</code>
        </div>
    ) : null;

    return (
        <div className={`hm-pc ${sc}`}>
            <div className="hm-pc-header">
                <span className="hm-pc-label">{part.label}</span>
                <span className="hm-pc-pts">{part.pts}</span>
                <span className={`hm-pc-status ${sc}`}>{statusLabel}</span>
            </div>
            <div className="hm-pc-body">
                <div className="hm-pc-rubric">
                    <div className="hm-pc-rubric-label">What to Submit · Scoring Criteria</div>
                    <ul className="hm-pc-rubric-list">
                        {part.what.map((line, index) => (
                            <li key={index} className={line.startsWith("  •") ? "indent" : ""}>
                                {line.startsWith("  •") ? line.replace("  •", "").trim() : line}
                            </li>
                        ))}
                    </ul>
                </div>

                {requiredFileChip}

                {part.auto ? (
                    <div className="hm-auto-info">
                        <Lock
                            size={15}
                            color="var(--blue)"
                            style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <p>
                            <strong>No file upload needed.</strong> HR scores this area automatically from the student evaluation CSV each semester. Your rating will appear here once HR uploads the CSV for this ranking period.
                        </p>
                    </div>
                ) : !submissionOpen ? (
                    <>
                        <div className="hm-pc-controls">
                            <button
                                type="button"
                                className="hm-btn-template"
                                onClick={() => onDownloadTemplate(part)}
                                disabled={isBusy}
                            >
                                <Download size={12} /> Download Template
                            </button>

                            {hasVisibleFile && (
                                <div className="hm-file-zone">
                                    <FileText size={12} />
                                    <span className="hm-file-name">{part.file || "Attached draft"}</span>
                                    <button
                                        type="button"
                                        className="hm-fab hm-fab-view"
                                        title="View"
                                        onClick={() => onViewFile(part)}
                                        disabled={isBusy}
                                    >
                                        <Eye size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        className="hm-fab hm-fab-dl"
                                        title="Download"
                                        onClick={() => onDownloadFile(part)}
                                        disabled={isBusy}
                                    >
                                        <Download size={11} />
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                className="hm-btn-submit"
                                disabled
                                style={{ opacity: 0.45, cursor: "not-allowed" }}
                            >
                                <Lock size={12} /> Submissions Closed
                            </button>
                        </div>

                        <div
                            className="hm-auto-info"
                            style={{
                                marginTop: 10,
                                background: "#fdf8ec",
                                borderColor: "#e8c96b",
                            }}
                        >
                            <Lock
                                size={15}
                                color="#b7950b"
                                style={{ flexShrink: 0, marginTop: 2 }}
                            />
                            <p style={{ color: "#7d5a10" }}>
                                <strong>Submissions are currently closed.</strong> The ranking period has not been opened by HR yet, or the submission deadline has passed. You will be notified when the next ranking period opens.
                            </p>
                        </div>

                        {part.date && (
                            <div className="hm-pc-date">
                                <Calendar size={11} /> Submitted {part.date}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="hm-pc-controls">
                            <button
                                type="button"
                                className="hm-btn-template"
                                onClick={() => onDownloadTemplate(part)}
                                disabled={isBusy}
                            >
                                <Download size={12} /> Download Template
                            </button>

                            {hasVisibleFile ? (
                                <>
                                    <div className="hm-file-zone">
                                        <FileText size={12} />
                                        <span className="hm-file-name">{part.file || "Attached draft"}</span>
                                        <button
                                            type="button"
                                            className="hm-fab hm-fab-view"
                                            title="View"
                                            onClick={() => onViewFile(part)}
                                            disabled={isBusy}
                                        >
                                            <Eye size={11} />
                                        </button>
                                        <button
                                            type="button"
                                            className="hm-fab hm-fab-dl"
                                            title="Download"
                                            onClick={() => onDownloadFile(part)}
                                            disabled={isBusy}
                                        >
                                            <Download size={11} />
                                        </button>
                                        {isEditableDraft && hasVisibleFile && (
                                            <button
                                                type="button"
                                                className="hm-fab hm-fab-del"
                                                title="Remove draft"
                                                onClick={() => onRemoveDraft(part)}
                                                disabled={isBusy}
                                            >
                                                <X size={11} />
                                            </button>
                                        )}
                                    </div>
                                    {isSubmitted && (
                                        <button
                                            type="button"
                                            className="hm-btn-replace"
                                            onClick={() => onReplaceFile(part)}
                                            disabled={isBusy}
                                        >
                                            <RefreshCw size={11} /> Resubmit
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="hm-btn-attach"
                                    onClick={() => onAttachFile(part)}
                                    disabled={isBusy}
                                >
                                    <Paperclip size={12} /> Attach File
                                </button>
                            )}

                            {isSubmitted ? (
                                <button type="button" className="hm-btn-submit" disabled>
                                    <CheckCircle size={12} /> Submitted
                                </button>
                            ) : part.status === "failed" ? (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    onClick={() => onSubmitPart(part)}
                                    disabled={isBusy}
                                >
                                    <Send size={12} /> Retry Submit
                                </button>
                            ) : isDraft ? (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    onClick={() => onSubmitPart(part)}
                                    disabled={isBusy}
                                >
                                    <Send size={12} /> {part.submissionId ? "Resubmit Part" : "Submit Part"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    disabled
                                    style={{ opacity: 0.4, cursor: "not-allowed" }}
                                >
                                    <Send size={12} /> Submit Part
                                </button>
                            )}
                        </div>

                        {part.date && (
                            <div className="hm-pc-date">
                                <Calendar size={11} /> Submitted {part.date}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
