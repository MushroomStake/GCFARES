import { useState } from "react";
import { facultyApi } from "../../../../lib/facultyApi";
import {
    TEMPLATE_BUCKET,
    SUBMISSIONS_BUCKET,
    getFirstValue,
    formatDateTime,
    sanitizeFileName,
    isPdfFile,
    resolvePartAreaId,
    lookupDatabaseAreaId,
    toAreaFolderName,
    toPartFolderName,
    stripUndefined,
    getDisplayFileNameFromPath,
    buildTemplatePathCandidatesForPart,
    resolveTargetPositionId,
} from "./homeHelpers.js";

function pickSingleFile(callback) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async () => {
        const file = input.files?.[0] || null;
        document.body.removeChild(input);
        callback(file);
    });

    input.click();
}

export function useHomeActions({
    userId,
    userEmail,
    facultyRecordId,
    databaseAreas,
    periodInfo,
    profileInfo,
    applicationInfo,
    resolvedTables,
    setApplicationInfo,
    pushToast,
    setPartAction,
    patchPartLocal,
    setFileTypeError,
    getFacultyRequiredFileName,
}) {
    const [viewerModalOpen, setViewerModalOpen] = useState(false);
    const [viewerModalFile, setViewerModalFile] = useState(null);
    const [viewerModalTitle, setViewerModalTitle] = useState("");

    const showInvalidFileTypeModal = (file) => {
        setFileTypeError({
            fileName: file?.name || "Selected file",
            message: "Area submissions only accept PDF files. Please choose a .pdf document and try again.",
        });
    };

    const getBackendOrigin = () => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
        return apiBaseUrl.replace(/\/api\/?$/, "");
    };

    const normalizeFileUrl = (url) => {
        if (!url) return null;
        if (/^(https?:|blob:|data:)/i.test(String(url))) {
            try {
                const parsed = new URL(String(url));
                if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && parsed.pathname.includes("/storage/")) {
                    const origin = getBackendOrigin();
                    return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
                }
            } catch {
                // ignore parse errors
            }
            return url;
        }

        const origin = getBackendOrigin();
        const trimmed = String(url).replace(/^\/+/, "");
        return `${origin}/${trimmed}`;
    };

    const openUrl = (url, downloadName = null) => {
        const resolvedUrl = normalizeFileUrl(url);
        if (!resolvedUrl) return;

        if (downloadName) {
            const a = document.createElement("a");
            a.href = resolvedUrl;
            a.download = downloadName;
            a.target = "_blank";
            a.rel = "noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    };

    const getPartFileUrl = async (part) => {
        const directUrl = part.fileUrl;
        if (directUrl && /^(https?:|blob:)/i.test(directUrl)) {
            return directUrl;
        }

        if (!part.storagePath) {
            return null;
        }

        const signed = await facultyApi.storage
            .from(SUBMISSIONS_BUCKET)
            .createSignedUrl(part.storagePath, 3600);

        return signed.data?.signedUrl || null;
    };

    const resolveActivePeriodId = async () => {
        if (periodInfo.id) return periodInfo.id;
        const response = await facultyApi.listCycles();
        const cycles = Array.isArray(response.data) ? response.data : [];

        const openCycle = cycles.find((cycle) => {
            const status = String(cycle?.status || cycle?.state || cycle?.cycle_status || "").toLowerCase();
            return status === "open" || status === "active";
        });

        const chosenCycle = openCycle || cycles[0] || null;
        const resolvedCycleId = getFirstValue(chosenCycle, ["cycle_id", "id"], null);

        console.debug("resolveActivePeriodId: resolved cycle", {
            resolvedCycleId,
            chosenCycleStatus: chosenCycle?.status || chosenCycle?.state || chosenCycle?.cycle_status || null,
            totalCycles: cycles.length,
        });

        return resolvedCycleId;
    };

    const writeSubmissionRow = async ({ part, storagePath, appId }) => {
        const activePeriodId = await resolveActivePeriodId();
        const frontendAreaId = resolvePartAreaId(part);

        let areaId = lookupDatabaseAreaId(frontendAreaId, databaseAreas);
        if (!areaId) {
            throw new Error(`Unable to resolve a database area_id for part ${part.id} (frontend area ${frontendAreaId}).`);
        }

        const submitterId = facultyRecordId ?? (Number.isFinite(Number(userId)) ? Number(userId) : null);
        console.log("writeSubmissionRow: submission context", {
            applicationId: appId,
            cycleId: activePeriodId,
            frontendAreaId,
            areaId,
            partId: part.id,
            userId: submitterId,
            storagePath,
        });
        const base = {
            part_id: part.id,
            area_id: areaId,
            cycle_id: activePeriodId || null,
            file_path: storagePath,
            user_id: submitterId,
        };

        if (appId) base.application_id = appId;
        const payload = stripUndefined(base);
        let saved = null;
        let lastError = null;

        if (part.submissionId) {
            const updated = await facultyApi.updateSubmission(part.submissionId, payload);
            saved = updated.data?.submission || updated.data || null;
            lastError = updated.error || null;
        }

        if (!saved && appId) {
            const existingResult = await facultyApi.listSubmissions({
                application_id: appId,
                part_id: part.id,
                cycle_id: activePeriodId || undefined,
                user_id: submitterId || undefined,
                limit: 50,
            });

            const existingRows = Array.isArray(existingResult.data) ? existingResult.data : [];
            const existing = existingRows.find((row) => {
                const rowAreaId = getFirstValue(row, ["area_id", "areaId", "area"]);
                const rowPartId = getFirstValue(row, ["part_id", "partId"]);
                const rowAppId = getFirstValue(row, ["application_id", "applicationId", "app_id"]);
                return String(rowPartId) === String(part.id)
                    && String(rowAppId) === String(appId)
                    && (!activePeriodId || String(getFirstValue(row, ["cycle_id", "ranking_cycle_id", "cycleId"], "")) === String(activePeriodId))
                    && String(rowAreaId) === String(areaId);
            }) || null;

            if (existing) {
                const submissionId = getFirstValue(existing, ["submission_id", "id"], null);
                if (submissionId) {
                    const updated = await facultyApi.updateSubmission(submissionId, payload);
                    saved = updated.data?.submission || updated.data || null;
                    lastError = updated.error || null;
                }
            }
        }

        if (!saved) {
            const created = await facultyApi.createSubmission(payload);
            saved = created.data?.submission || created.data || null;
            lastError = created.error || null;
        }

        if (!saved) {
            const error = lastError || new Error(`Unable to save submission row for part ${part.id}.`);
            console.error("writeSubmissionRow: submission save failed", {
                partId: part.id,
                frontendAreaId,
                areaId,
                applicationId: appId,
                periodId: activePeriodId,
                error: error?.message || error,
            });
            throw error;
        }

        const savedSubmissionId = getFirstValue(saved, ["submission_id", "id"], null);
        if (savedSubmissionId) {
            const verification = await facultyApi.listSubmissions({
                application_id: appId,
                part_id: part.id,
                cycle_id: activePeriodId || undefined,
                user_id: submitterId || undefined,
                limit: 50,
            });

            const verifiedRows = Array.isArray(verification.data) ? verification.data : [];
            const verified = verifiedRows.find((row) => {
                const rowSubmissionId = getFirstValue(row, ["submission_id", "id"], null);
                const rowAreaId = getFirstValue(row, ["area_id", "areaId", "area"]);
                const rowPartId = getFirstValue(row, ["part_id", "partId"]);
                const rowAppId = getFirstValue(row, ["application_id", "applicationId", "app_id"]);
                const rowUserId = getFirstValue(row, ["user_id", "userId", "faculty_id"]);
                const rowCycleId = getFirstValue(row, ["cycle_id", "ranking_cycle_id", "cycleId"]);

                const matchesSavedId = String(rowSubmissionId || "") === String(savedSubmissionId);
                const matchesContext = String(rowAppId || "") === String(appId)
                    && String(rowPartId || "") === String(part.id)
                    && String(rowAreaId || "") === String(areaId)
                    && String(rowUserId || "") === String(submitterId || "")
                    && (!activePeriodId || String(rowCycleId || "") === String(activePeriodId));

                return matchesSavedId || matchesContext;
            }) || null;

            if (verification.error || !verified) {
                const verificationError = verification.error || new Error("Submission row was not found after save verification.");
                console.error("writeSubmissionRow: verification failed", {
                    partId: part.id,
                    frontendAreaId,
                    areaId,
                    applicationId: appId,
                    periodId: activePeriodId,
                    submissionId: savedSubmissionId,
                    error: verificationError?.message || verificationError,
                });
                throw verificationError;
            }

            console.debug("writeSubmissionRow: submission saved", {
                submissionId: savedSubmissionId,
                partId: part.id,
                frontendAreaId,
                areaId,
                applicationId: appId,
                periodId: activePeriodId,
                userId: submitterId,
            });

            pushToast("success", `Part submitted successfully (submission #${savedSubmissionId}).`);

            return verified;
        }

        return saved;
    };

    const ensureApplicationExists = async () => {
        const activePeriodId = await resolveActivePeriodId();
        const resolvedFacultyId = facultyRecordId ?? (Number.isFinite(Number(userId)) ? Number(userId) : null);

        if (applicationInfo.id) return applicationInfo.id;

        if (resolvedFacultyId !== null) {
            try {
                const existingApplications = await facultyApi.listApplications({
                    faculty_id: resolvedFacultyId,
                    cycle_id: activePeriodId || undefined,
                    limit: 1,
                });

                const appRows = Array.isArray(existingApplications.data)
                    ? existingApplications.data
                    : Array.isArray(existingApplications.data?.data)
                        ? existingApplications.data.data
                        : [];

                const existingApplication = appRows[0] || null;
                if (!existingApplications.error && existingApplication) {
                    const appId = getFirstValue(existingApplication, ["application_id", "id"], null);
                    if (appId) {
                        setApplicationInfo((prev) => ({ ...prev, id: appId }));
                        return appId;
                    }
                }
            } catch (e) {
                console.warn("ensureApplicationExists: existing application lookup failed", e?.message || e);
            }
        }

        if (!activePeriodId || resolvedFacultyId === null) {
            console.warn("ensureApplicationExists: missing active period or faculty id", {
                activePeriodId,
                resolvedFacultyId,
            });
            pushToast("error", "Unable to create the application record because no active ranking period was found.");
            return null;
        }

        const targetPositionId = await resolveTargetPositionId(profileInfo.applyingFor);
        if (!targetPositionId) {
            pushToast("error", "Unable to resolve a target position for this application. Please check the faculty profile setup.");
            return null;
        }

        const appNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const payload = {
            application_number: appNumber,
            faculty_id: resolvedFacultyId,
            target_position_id: targetPositionId,
            cycle_id: activePeriodId,
            status: "Draft",
            current_rank_at_time: profileInfo.currentRank || null,
        };

        const created = await facultyApi.createApplication(payload);
        const data = created.data?.application || created.data || null;
        const error = created.error || null;

        if (error || !data) {
            console.error("ensureApplicationExists: application insert failed", error?.message || error, payload);
            pushToast("error", `Application creation failed: ${error?.message || "unknown database error"}`);
            return null;
        }

        if (data) {
            const appId = data.application_id || data.id || null;
            if (appId) {
                setApplicationInfo((prev) => ({ ...prev, id: appId, status: "Draft" }));
                return appId;
            }
        }

        return null;
    };

    const persistSubmissionRow = async (part, storagePath) => {
        let appId = applicationInfo.id;
        if (!appId) {
            appId = await ensureApplicationExists();
        }

        if (!appId) {
            pushToast("error", "No application record was found for this account. Contact HR to create the application first.");
            return null;
        }

        const saved = await writeSubmissionRow({ part, storagePath, appId });
        if (!saved) {
            const error = new Error("Upload was saved to storage, but the submission row could not be registered.");
            pushToast("error", error.message);
            throw error;
        }

        return saved;
    };

    const uploadFileForPart = async (part, file, nextStatus) => {
        const areaId = resolvePartAreaId(part);
        const periodSegment = periodInfo.id || "current-period";
        const userSegment = userId || userEmail || "anonymous";
        const areaFolder = toAreaFolderName(areaId);
        const partFolder = toPartFolderName(part);
        const requiredBaseName = getFacultyRequiredFileName(part.id);
        const cleanName = sanitizeFileName(requiredBaseName ? `${requiredBaseName}.pdf` : file.name);
        const storagePath = `Faculty/${areaFolder}/${partFolder}/${periodSegment}/${userSegment}/${Date.now()}_${cleanName}`;

        const uploadResult = await facultyApi.storage
            .from(SUBMISSIONS_BUCKET)
            .upload(storagePath, file, { upsert: true });
        if (uploadResult.error) {
            throw uploadResult.error;
        }

        const signed = await facultyApi.storage
            .from(SUBMISSIONS_BUCKET)
            .createSignedUrl(storagePath, 3600);
        const fileUrl = signed.data?.signedUrl || null;
        const nowText = formatDateTime(new Date().toISOString()) || part.date;

        const saved = await persistSubmissionRow(part, storagePath);
        const nextResolvedStatus = saved ? nextStatus : "failed";

        patchPartLocal(part.id, (prev) => ({
            ...prev,
            status: nextResolvedStatus,
            file: file.name,
            date: nowText,
            fileUrl,
            storagePath,
            submissionId: getFirstValue(saved, ["submission_id", "id"], prev.submissionId || null),
        }));

        return { storagePath, fileUrl, saved };
    };

    const saveDraftLocally = (part, file) => {
        const previewUrl = file ? URL.createObjectURL(file) : null;
        patchPartLocal(part.id, (prev) => ({
            ...prev,
            status: "draft-local",
            file: file ? file.name : prev.file,
            fileObject: file || null,
            fileUrl: previewUrl || prev.fileUrl,
            storagePath: null,
        }));
    };

    const handleDownloadTemplate = async (part) => {
        setPartAction(part.id, "template");
        try {
            const areaId = resolvePartAreaId(part);
            const templatesResult = await facultyApi.listTemplates({
                area_id: areaId,
                part_id: part.id,
                limit: 20,
            });

            const templateRows = Array.isArray(templatesResult.data)
                ? templatesResult.data
                : Array.isArray(templatesResult.data?.data)
                    ? templatesResult.data.data
                    : [];

            const templateRow = templateRows.find((row) => {
                const activeValue = getFirstValue(row, ["is_active", "active"], true);
                return activeValue === true || activeValue === 1 || activeValue === "1" || String(activeValue).toLowerCase() === "true";
            }) || templateRows[0] || null;

            if (templateRow?.storage_path) {
                const signed = await facultyApi.storage
                    .from(templateRow.storage_bucket || TEMPLATE_BUCKET)
                    .createSignedUrl(templateRow.storage_path, 600);

                if (!signed.error && signed.data?.signedUrl) {
                    openUrl(signed.data.signedUrl);
                    pushToast("success", "Template download is ready.");
                    return;
                }
            }

            const templatePaths = buildTemplatePathCandidatesForPart(part);
            for (const templatePath of templatePaths) {
                const signed = await facultyApi.storage
                    .from(TEMPLATE_BUCKET)
                    .createSignedUrl(templatePath, 600);

                if (!signed.error && signed.data?.signedUrl) {
                    openUrl(signed.data.signedUrl);
                    pushToast("success", "Template download is ready.");
                    return;
                }
            }

            pushToast("error", "Template file is not available yet for this part.");
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleViewFile = async (part) => {
        setPartAction(part.id, "view");
        try {
            const url = await getPartFileUrl(part);
            if (!url) {
                pushToast("error", "Unable to locate the uploaded file for this part.");
                return;
            }

            setViewerModalFile(url);
            setViewerModalTitle(part.file || part.id || "Uploaded File");
            setViewerModalOpen(true);
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleDownloadFile = async (part) => {
        setPartAction(part.id, "download");
        try {
            const url = await getPartFileUrl(part);
            if (!url) {
                pushToast("error", "Unable to locate the uploaded file for this part.");
                return;
            }
            openUrl(url, part.file || `${part.id}.pdf`);
            pushToast("success", "File download started.");
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleAttachFile = (part) => {
        pickSingleFile(async (file) => {
            if (!file) return;
            if (!isPdfFile(file)) {
                showInvalidFileTypeModal(file);
                return;
            }

            setPartAction(part.id, "attach");
            try {
                saveDraftLocally(part, file);
                pushToast("success", "Draft attached locally. Click Submit to upload.");
            } catch (e) {
                console.error(e);
                pushToast("error", "Unable to attach draft locally.");
            }
            setPartAction(part.id, null);
        });
    };

    const handleReplaceFile = (part) => {
        if (part.status === "submitted") {
            setPartAction(part.id, "resubmit");
            try {
                patchPartLocal(part.id, (prev) => ({
                    ...prev,
                    status: "draft",
                }));
                pushToast("success", "Submission moved back to draft state. You can resubmit it now.");
            } finally {
                setPartAction(part.id, null);
            }
            return;
        }

        pickSingleFile(async (file) => {
            if (!file) return;
            if (!isPdfFile(file)) {
                showInvalidFileTypeModal(file);
                return;
            }

            setPartAction(part.id, "replace");
            try {
                if (part.storagePath) {
                    const uploadResult = await uploadFileForPart(part, file, part.status || "draft");
                    const saved = uploadResult?.saved || null;
                    if (saved) {
                        patchPartLocal(part.id, (prev) => ({
                            ...prev,
                            submissionId:
                                getFirstValue(saved, ["submission_id", "id"], null) ||
                                prev.submissionId ||
                                null,
                        }));
                    }
                    pushToast("success", "File replaced on storage.");
                } else {
                    saveDraftLocally(part, file);
                    pushToast("success", "Local draft replaced. Click Submit to upload.");
                }
            } catch (e) {
                console.error(e);
                pushToast("error", "File replacement failed. Please try again.");
            }
            setPartAction(part.id, null);
        });
    };

    const closeViewerModal = () => {
        setViewerModalOpen(false);
        setViewerModalFile(null);
        setViewerModalTitle("");
    };

    const handleRemoveDraft = async (part) => {
        if (part.status !== "draft" && part.status !== "draft-local") return;

        setPartAction(part.id, "remove");
        try {
            const isLocalDraft = part.status === "draft-local" || (!part.storagePath && part.fileObject);

            if (isLocalDraft) {
                if (part.fileUrl && String(part.fileUrl).startsWith("blob:")) {
                    URL.revokeObjectURL(part.fileUrl);
                }

                patchPartLocal(part.id, (prev) => ({
                    ...prev,
                    status: "empty",
                    file: null,
                    fileObject: null,
                    date: null,
                    fileUrl: null,
                    storagePath: null,
                    submissionId: null,
                }));
                pushToast("success", "Draft removed.");
                return;
            }

            if (!part.submissionId) {
                patchPartLocal(part.id, (prev) => ({
                    ...prev,
                    status: "empty",
                    file: null,
                    fileObject: null,
                    date: null,
                    fileUrl: null,
                    storagePath: null,
                    submissionId: null,
                }));
                pushToast("success", "Draft removed.");
                return;
            }

            const result = await facultyApi.deleteSubmission(part.submissionId);
            if (result.error) {
                pushToast("error", "Unable to remove draft right now.");
                return;
            }

            const draftLabel = part.file || part.id || "Draft";
            patchPartLocal(part.id, (prev) => ({
                ...prev,
                status: "draft",
                file: draftLabel,
                fileObject: null,
                date: null,
                fileUrl: prev.fileUrl || null,
                storagePath: prev.storagePath || part.storagePath || null,
                submissionId: null,
            }));
            pushToast("success", "Submission returned to draft state.");
        } catch {
            pushToast("error", "Unable to remove draft right now.");
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleSubmitPart = async (part) => {
        if (!part) return;
        const isLocalDraft = Boolean(part.fileObject) && !part.storagePath;
        const isRemoteDraft = part.status === "draft" && part.storagePath;
        const hasAttachedDraft = Boolean(part.fileObject || part.storagePath);
        if (!isLocalDraft && !isRemoteDraft && part.status !== "draft-local" && !hasAttachedDraft) return;

        setPartAction(part.id, "submit");
        try {
            const nowIso = new Date().toISOString();
            console.debug("handleSubmitPart: submit requested", {
                partId: part.id,
                status: part.status,
                hasAttachedDraft,
                isLocalDraft,
                isRemoteDraft,
                applicationId: applicationInfo.id,
                cycleId: await resolveActivePeriodId(),
            });

            if (isLocalDraft) {
                const uploadResult = await uploadFileForPart(part, part.fileObject, "submitted");
                let saved = uploadResult?.saved || null;
                if (!saved) {
                    saved = await persistSubmissionRow(part, uploadResult.storagePath);
                }
                if (saved) {
                    patchPartLocal(part.id, (prev) => ({
                        ...prev,
                        submissionId:
                            getFirstValue(saved, ["submission_id", "id"], null) ||
                            prev.submissionId ||
                            null,
                        status: "submitted",
                    }));
                } else {
                    patchPartLocal(part.id, (prev) => ({
                        ...prev,
                        status: "failed",
                    }));
                    throw new Error("Submission row was not saved.");
                }
            } else if (isRemoteDraft) {
                const saved = await persistSubmissionRow(part, part.storagePath);
                if (!saved) {
                    throw new Error("Submission row was not saved.");
                }

                patchPartLocal(part.id, (prev) => ({
                    ...prev,
                    status: "submitted",
                    date: formatDateTime(nowIso) || prev.date,
                    submissionId:
                        getFirstValue(saved, ["submission_id", "id"], null) ||
                        prev.submissionId ||
                        null,
                }));
            } else if (part.status === "draft-local") {
                throw new Error("No local file to upload");
            }
        } catch (e) {
            console.error(e);
            pushToast("error", e?.message || "Unable to submit this part right now.");
            patchPartLocal(part.id, (prev) => ({
                ...prev,
                    status: "failed",
            }));
        } finally {
            setPartAction(part.id, null);
        }
    };

    return {
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
    };
}

