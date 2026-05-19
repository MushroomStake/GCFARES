import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { facultyApi } from "../../../lib/facultyApi";
import HomeHero from "./Home/components/HomeHero.jsx";
import HomeSummary from "./Home/components/HomeSummary.jsx";
import HomeDetail from "./Home/components/HomeDetail.jsx";
import DEFAULT_AREAS_DATA from "./Home/data/areasData.js";
import styles from "./Home/homeStyles.js";
import { useHomeActions } from "./Home/homeActions.js";
import {
    APPLICATION_LOG_TABLE_CANDIDATES,
    APPLICATION_TABLE_CANDIDATES,
    AREA_SUBMISSION_TABLE_CANDIDATES,
    DEFAULT_DEADLINE_LABEL,
    DEFAULT_PERIOD_LABEL,
    getFirstValue,
    formatDateTime,
    TOAST_TTL_MS,
    buildToast,
    normalizeSubmissionStatus,
} from "./Home/homeHelpers.js";
import { getRequiredFileName } from "../../../data/fileNames";

function applySubmissionRowsToAreas(baseAreas, submissionRows) {
    const rowsByPartId = new Map();

    for (const row of Array.isArray(submissionRows) ? submissionRows : []) {
        const partId = String(getFirstValue(row, ["part_id", "partId"], "")).trim();
        if (!partId) continue;
        rowsByPartId.set(partId, row);
    }

    const applyToPart = (part) => {
        const submission = rowsByPartId.get(String(part.id || "").trim());
        if (!submission) {
            if (part.isGroup && Array.isArray(part.subparts)) {
                return {
                    ...part,
                    subparts: part.subparts.map(applyToPart),
                };
            }
            return part;
        }

        const status = normalizeSubmissionStatus(submission);
        const filePath = getFirstValue(submission, ["file_path", "storage_path", "path", "object_path"], null);
        const fileUrl = getFirstValue(submission, ["file_url", "url"], null);
        const submissionId = getFirstValue(submission, ["submission_id", "id"], null);
        const dateValue = getFirstValue(submission, ["uploaded_at", "submitted_at", "created_at"], null);

        if (part.isGroup && Array.isArray(part.subparts)) {
            return {
                ...part,
                status,
                file: filePath ? String(filePath).split(/[\\/]/).pop() : part.file,
                date: formatDateTime(dateValue) || part.date,
                fileUrl: fileUrl || part.fileUrl || null,
                storagePath: filePath || part.storagePath || null,
                submissionId,
                subparts: part.subparts.map(applyToPart),
            };
        }

        return {
            ...part,
            status,
            file: filePath ? String(filePath).split(/[\\/]/).pop() : part.file,
            date: formatDateTime(dateValue) || part.date,
            fileUrl: fileUrl || part.fileUrl || null,
            storagePath: filePath || part.storagePath || null,
            submissionId,
        };
    };

    return baseAreas.map((area) => ({
        ...area,
        parts: area.parts.map((part) => applyToPart(part)),
    }));
}

export default function Home({ user }) {
    const userId = user?.id || user?.user_id || null;
    const userEmail = user?.email || null;
    const [facultyRecordId, setFacultyRecordId] = useState(Number.isFinite(Number(userId)) ? Number(userId) : null);
    const [searchParams, setSearchParams] = useSearchParams();

    const [view, setView] = useState("list");
    const [openAreaId, setOpenAreaId] = useState(null);
    const [areasData, setAreasData] = useState(DEFAULT_AREAS_DATA);
    const [databaseAreas, setDatabaseAreas] = useState([]);
    const [submissionOpen] = useState(true);
    const [periodInfo] = useState({
        id: null,
        label: DEFAULT_PERIOD_LABEL,
        deadlineLabel: DEFAULT_DEADLINE_LABEL,
        daysLeft: 0,
    });
    const [profileInfo] = useState(() => ({
        currentRank: String(user?.current_rank || user?.rank || "Not set"),
        department: String(user?.department_name || user?.department || "Not set"),
        firstName: String(user?.name_first || user?.first_name || user?.given_name || "FirstName"),
        lastName: String(user?.name_last || user?.last_name || user?.surname || "LastName"),
        applyingFor: String(user?.applying_for_json || user?.applying_for || user?.target_rank || "Not set"),
        status: String(user?.status || "unknown"),
    }));
    const [applicationInfo, setApplicationInfo] = useState({
        id: null,
        targetRank: "Not set",
        status: "Not started",
    });
    const [partActionMap, setPartActionMap] = useState({});
    const [toasts, setToasts] = useState([]);
    const [fileTypeError, setFileTypeError] = useState(null);

    useEffect(() => {
        try {
            const areaParam = searchParams.get("area");
            if (areaParam) {
                setOpenAreaId(areaParam);
                setView("detail");
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch {
            // ignore
        }
    }, [searchParams]);

    useEffect(() => {
        let active = true;

        const hydrateHomeState = async () => {
            const resolvedFacultyId = facultyRecordId ?? (Number.isFinite(Number(userId)) ? Number(userId) : null);
            if (resolvedFacultyId === null) return;

            const appResult = await facultyApi.listApplications({
                faculty_id: resolvedFacultyId,
                limit: 1,
            });

            if (!active) return;

            const appRows = Array.isArray(appResult.data)
                ? appResult.data
                : Array.isArray(appResult.data?.data)
                    ? appResult.data.data
                    : [];

            if (!appResult.error && appRows.length > 0) {
                const appRow = appRows[0];
                const appId = getFirstValue(appRow, ["application_id", "id"], null);
                const targetPositionId = getFirstValue(appRow, ["target_position_id"], null);
                let targetRank = applicationInfo.targetRank;

                if (targetPositionId) {
                    const positionResult = await facultyApi.listPositions();
                    const positionRows = Array.isArray(positionResult.data)
                        ? positionResult.data
                        : Array.isArray(positionResult.data?.data)
                            ? positionResult.data.data
                            : [];
                    const matchedPosition = positionRows.find((row) => String(getFirstValue(row, ["position_id", "id"], "")) === String(targetPositionId));

                    if (!positionResult.error && matchedPosition?.position_name) {
                        targetRank = String(matchedPosition.position_name);
                    }
                }

                setApplicationInfo((prev) => ({
                    ...prev,
                    id: appId,
                    status: String(appRow.status || prev.status || "Draft"),
                    targetRank,
                }));

                const submissionResult = await facultyApi.listSubmissions({ application_id: appId });

                const submissionRows = Array.isArray(submissionResult.data)
                    ? submissionResult.data
                    : Array.isArray(submissionResult.data?.data)
                        ? submissionResult.data.data
                        : [];

                if (active && !submissionResult.error && submissionRows.length > 0) {
                    setAreasData((prev) => applySubmissionRowsToAreas(prev, submissionRows));
                }
            } else {
                const submissionResult = await facultyApi.listSubmissions({ faculty_id: resolvedFacultyId });

                const submissionRows = Array.isArray(submissionResult.data)
                    ? submissionResult.data
                    : Array.isArray(submissionResult.data?.data)
                        ? submissionResult.data.data
                        : [];

                if (active && !submissionResult.error && submissionRows.length > 0) {
                    const appId = getFirstValue(submissionRows[0], ["application_id", "id"], null);
                    if (appId) {
                        setApplicationInfo((prev) => ({
                            ...prev,
                            id: appId,
                            status: "Draft",
                        }));
                    }

                    setAreasData((prev) => applySubmissionRowsToAreas(prev, submissionRows));
                }
            }
        };

        void hydrateHomeState();

        return () => {
            active = false;
        };
    }, [facultyRecordId, userId]);

    useEffect(() => {
        let active = true;

        const loadAreas = async () => {
            const result = await facultyApi.listAreas();
            if (!active) return;

            const rows = Array.isArray(result.data)
                ? result.data
                : Array.isArray(result.data?.data)
                    ? result.data.data
                    : [];

            if (!result.error && rows.length > 0) {
                setDatabaseAreas(rows);
            }
        };

        void loadAreas();

        return () => {
            active = false;
        };
    }, []);

    const getFacultyRequiredFileName = (partId) =>
        getRequiredFileName(partId, profileInfo.lastName, profileInfo.firstName);

    const setPartAction = (partId, action) => {
        setPartActionMap((prev) => {
            const next = { ...prev };
            if (!action) {
                delete next[partId];
            } else {
                next[partId] = action;
            }
            return next;
        });
    };

    const getBusyAction = (partId) => partActionMap[partId] || null;

    const pushToast = (kind, message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((prev) => [...prev, buildToast(id, kind, message)]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, TOAST_TTL_MS);
    };

    const showInvalidFileTypeModal = (file) => {
        setFileTypeError({
            fileName: file?.name || "Selected file",
            message: "Area submissions only accept PDF files. Please choose a .pdf document and try again.",
        });
    };

    const patchPartLocal = (partId, updater) => {
        setAreasData((prev) =>
            prev.map((area) => ({
                ...area,
                parts: area.parts.map((part) => (part.id === partId ? updater(part) : part)),
            })),
        );
    };

    const {
        viewerModalOpen,
        viewerModalFile,
        viewerModalTitle,
        closeViewerModal,
        handleDownloadTemplate,
        handleViewFile,
        handleDownloadFile,
        handleAttachFile,
        handleReplaceFile,
        handleRemoveDraft,
        handleSubmitPart,
    } = useHomeActions({
        userId,
        userEmail,
        facultyRecordId,
        databaseAreas,
        periodInfo,
        profileInfo,
        applicationInfo,
        resolvedTables: {
            applications: APPLICATION_TABLE_CANDIDATES[0] || "applications",
            areaSubmissions: AREA_SUBMISSION_TABLE_CANDIDATES[0] || "area_submissions",
            applicationLogs: APPLICATION_LOG_TABLE_CANDIDATES[0] || "application_logs",
        },
        setApplicationInfo,
        pushToast,
        setPartAction,
        patchPartLocal,
        setFileTypeError,
        getFacultyRequiredFileName,
    });

    const openArea = (id) => {
        setOpenAreaId(id);
        setView("detail");
        try {
            const next = new URLSearchParams(searchParams.toString());
            next.set("area", String(id));
            setSearchParams(next, { replace: false });
        } catch {
            // ignore
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const backToList = () => {
        setView("list");
        setOpenAreaId(null);
        try {
            const next = new URLSearchParams(searchParams.toString());
            next.delete("area");
            setSearchParams(next, { replace: false });
        } catch {
            // ignore
        }
    };

    const currentArea = areasData.find((area) => area.id === openAreaId);

    return (
        <>
            <style>{styles}</style>

            <HomeHero
                periodInfo={periodInfo}
                submissionOpen={submissionOpen}
                profileInfo={profileInfo}
                userDisplayName={user?.displayName}
            />

            <HomeSummary profileInfo={profileInfo} applicationInfo={applicationInfo} />

            <HomeDetail
                view={view}
                currentArea={currentArea}
                areasData={areasData}
                openArea={openArea}
                backToList={backToList}
                submissionOpen={submissionOpen}
                getBusyAction={getBusyAction}
                handleDownloadTemplate={handleDownloadTemplate}
                handleAttachFile={handleAttachFile}
                handleReplaceFile={handleReplaceFile}
                handleRemoveDraft={handleRemoveDraft}
                handleSubmitPart={handleSubmitPart}
                handleViewFile={handleViewFile}
                handleDownloadFile={handleDownloadFile}
                getRequiredName={getFacultyRequiredFileName}
            />

            {toasts.length > 0 && (
                <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 80, display: "grid", gap: 8 }}>
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            style={{
                                minWidth: 260,
                                maxWidth: 360,
                                padding: "10px 12px",
                                borderRadius: 12,
                                background: toast.kind === "error" ? "#fee2e2" : toast.kind === "success" ? "#dcfce7" : "#eff6ff",
                                color: "#111827",
                                boxShadow: "0 10px 24px rgba(0,0,0,.12)",
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{toast.kind.toUpperCase()}</div>
                            <div style={{ fontSize: 13, lineHeight: 1.35 }}>{toast.message}</div>
                        </div>
                    ))}
                </div>
            )}

            {viewerModalOpen && (
                <div className="hm-modal-backdrop" role="presentation">
                    <div className="hm-error-modal" role="dialog" aria-modal="true" aria-labelledby="hm-viewer-title" style={{ width: "min(92vw, 900px)" }}>
                        <div className="hm-error-modal-head">
                            <div className="hm-error-modal-title" id="hm-viewer-title">
                                <Info size={16} /> {viewerModalTitle || "File preview"}
                            </div>
                            <button type="button" className="hm-error-modal-close" onClick={closeViewerModal} aria-label="Close viewer">
                                <X size={15} />
                            </button>
                        </div>
                        <div style={{ minHeight: 360, background: "#f8fafc" }}>
                            {viewerModalFile && String(viewerModalFile).toLowerCase().endsWith(".pdf") ? (
                                <iframe src={viewerModalFile} title={viewerModalTitle || "Uploaded file"} style={{ width: "100%", height: 420, border: "none", background: "white" }} />
                            ) : viewerModalFile ? (
                                <div style={{ padding: 24 }}>
                                    <p style={{ marginBottom: 12 }}>Preview is not available for this file type.</p>
                                    <button type="button" className="hm-btn-template" onClick={() => handleDownloadFile?.({ fileUrl: viewerModalFile, file: viewerModalTitle || "document" })}>Download file</button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {fileTypeError && (
                <div className="hm-modal-backdrop" role="presentation">
                    <div className="hm-error-modal" role="alertdialog" aria-modal="true" aria-labelledby="hm-file-type-error-title">
                        <div className="hm-error-modal-head">
                            <div className="hm-error-modal-title" id="hm-file-type-error-title">
                                <Info size={16} /> Invalid file type
                            </div>
                            <button type="button" className="hm-error-modal-close" onClick={() => setFileTypeError(null)} aria-label="Close">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="hm-error-modal-body">
                            <div>{fileTypeError.message}</div>
                            <div className="hm-error-modal-file" title={fileTypeError.fileName}>
                                {fileTypeError.fileName}
                            </div>
                        </div>
                        <div className="hm-error-modal-actions">
                            <button type="button" className="hm-error-modal-ok" onClick={() => setFileTypeError(null)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
