import { facultyApi } from "../../../../lib/facultyApi";
import { getLeafParts } from "./homeUtils.js";

export const DEFAULT_SUBMISSION_OPEN = false;
export const DEFAULT_PERIOD_LABEL = "No active ranking period";
export const DEFAULT_DEADLINE_LABEL = "TBA";
export const TEMPLATE_BUCKET = "documents";
export const SUBMISSIONS_BUCKET = "documents";
export const TOAST_TTL_MS = 3200;
export const AREA_TABLE_CANDIDATES = "areas"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const AREA_PART_TABLE_CANDIDATES = "area_part_templates"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const CYCLE_TABLE_CANDIDATES = "ranking_cycles"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const PROFILE_TABLE_CANDIDATES = "users"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const APPLICATION_TABLE_CANDIDATES = "applications"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const POSITION_TABLE_CANDIDATES = "positions"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const AREA_SUBMISSION_TABLE_CANDIDATES = "area_submissions"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const APPLICATION_LOG_TABLE_CANDIDATES = "application_logs"
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export function getFirstValue(source, keys, fallback = null) {
    if (!source) return fallback;
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return fallback;
}

export function getDisplayFileNameFromPath(pathValue) {
    if (!pathValue) return null;
    const rawName = String(pathValue)
        .split("?")[0]
        .split("#")[0]
        .split(/[\\/]/)
        .pop();
    if (!rawName) return null;

    try {
        return decodeURIComponent(rawName).replace(/^\d{10,}_/, "") || null;
    } catch {
        return rawName.replace(/^\d{10,}_/, "") || null;
    }
}

export const ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function compressSequentialApplyingFor(value) {
    let items = value;
    if (typeof items === "string") {
        const trimmed = items.trim();
        if (!trimmed) {
            items = [];
        } else {
            try {
                const parsed = JSON.parse(trimmed);
                items = Array.isArray(parsed) ? parsed : trimmed.split(/\s*,\s*/);
            } catch {
                items = trimmed.split(/\s*,\s*/);
            }
        }
    }

    items = Array.isArray(items)
        ? items
        : String(items || "")
            .split(/\s*,\s*/)
            .map((entry) => entry.trim())
            .filter(Boolean);

    if (items.length <= 1) {
        return items[0] || "";
    }

    const parsed = items.map((item) => {
        const match = item.match(/^(.*?)(I{1,3}|IV|V|VI{0,3}|IX|X)$/i);
        if (!match) return null;
        return {
            prefix: match[1].trim(),
            numeral: match[2].toUpperCase(),
        };
    });

    if (parsed.some((entry) => !entry)) {
        return items.join(", ");
    }

    const prefix = parsed[0].prefix;
    if (!parsed.every((entry) => entry.prefix === prefix)) {
        return items.join(", ");
    }

    const indices = parsed.map((entry) => ROMAN_ORDER.indexOf(entry.numeral));
    if (indices.some((index) => index === -1)) {
        return items.join(", ");
    }

    const sortedIndices = [...indices].sort((a, b) => a - b);
    for (let index = 1; index < sortedIndices.length; index += 1) {
        if (sortedIndices[index] !== sortedIndices[index - 1] + 1) {
            return items.join(", ");
        }
    }

    const firstNumeral = ROMAN_ORDER[sortedIndices[0]];
    const lastNumeral = ROMAN_ORDER[sortedIndices[sortedIndices.length - 1]];
    return `${prefix} ${firstNumeral}-${lastNumeral}`.replace(/\s+/g, " ").trim();
}

export function isColumnOrTableError(error) {
    const message = String(error?.message || "").toLowerCase();
    return (
        message.includes("does not exist") ||
        message.includes("column") ||
        message.includes("relation")
    );
}

export function toBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "t", "yes", "y", "open"].includes(normalized)) {
            return true;
        }
        if (["false", "f", "no", "n", "closed"].includes(normalized)) {
            return false;
        }
    }
    return fallback;
}

export function formatLongDate(value, fallback) {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function formatDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function formatMysqlDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function getMutationCount(result) {
    return Number(getFirstValue(result, ["updated", "deleted", "affected", "count"], 0) || 0);
}

export function toDaysLeft(deadlineValue, fallback = 15) {
    if (!deadlineValue) return fallback;
    const date = new Date(deadlineValue);
    if (Number.isNaN(date.getTime())) return fallback;

    const diffMs = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 86400000));
}

export function normalizeSubmissionStatus(row) {
    const statusRaw = String(
        getFirstValue(row, ["status", "submission_status", "state"], ""),
    )
        .trim()
        .toLowerCase();

    if (statusRaw.includes("submit")) return "submitted";
    if (statusRaw.includes("draft") || statusRaw.includes("pending")) {
        return "draft";
    }

    const submittedAt = getFirstValue(row, [
        "submitted_at",
        "submittedAt",
        "date_submitted",
        "uploaded_at",
        "uploadedAt",
    ]);
    if (submittedAt) return "submitted";

    const fileName = getFirstValue(row, [
        "file_name",
        "filename",
        "name",
        "original_file_name",
    ]);
    const fileUrl = getFirstValue(row, ["file_url", "url", "path"]);
    if (fileName || fileUrl || getFirstValue(row, ["file_path", "storage_path", "object_path"], null)) return "submitted";

    return "empty";
}

export function parseTimestamp(row) {
    const raw = getFirstValue(row, [
        "updated_at",
        "submitted_at",
        "uploaded_at",
        "created_at",
    ]);
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
}

export function toFriendlyLabel(value) {
    return String(value || "")
        .replace(/[_-]/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stripUndefined(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined),
    );
}

export function inferAreaIdFromPartId(partId) {
    if (!partId) return null;
    return String(partId).split("-")[0] || null;
}

export function resolvePartAreaId(part) {
    return part?.areaId || inferAreaIdFromPartId(part?.id);
}

export function lookupDatabaseAreaId(frontendAreaId, areasData) {
    if (!frontendAreaId) {
        return null;
    }

    const frontendNum = normalizeDbAreaId(frontendAreaId);
    if (!frontendNum) {
        console.warn('[lookupDatabaseAreaId] unable to normalize frontend area id:', frontendAreaId);
        return null;
    }

    if (!Array.isArray(areasData) || areasData.length === 0) {
        if (frontendNum >= 4 && frontendNum <= 13) {
            return frontendNum;
        }

        const fallbackAreaId = frontendNum + 3;
        console.debug('[lookupDatabaseAreaId] using schema fallback area id:', {
            frontendAreaId,
            frontendNum,
            fallbackAreaId,
        });
        return fallbackAreaId;
    }

    for (const area of areasData) {
        const areaName = String(area.area_name || area.name || '');
        const dbAreaId = area.area_id || area.id;

        const romanPatternWithColon = `AREA ${frontendAreaId}:`;
        const numPatternWithColon = `AREA ${frontendNum}:`;

        if (areaName.includes(romanPatternWithColon) || areaName.includes(numPatternWithColon)) {
            return dbAreaId;
        }
    }

    console.warn('[lookupDatabaseAreaId] âœ— no match found. looking for patterns:', {
        roman: `AREA ${frontendAreaId}:`,
        numeric: `AREA ${frontendNum}:`
    });
    if (frontendNum >= 1 && frontendNum <= 10) {
        const fallbackAreaId = frontendNum + 3;
        console.debug('[lookupDatabaseAreaId] falling back to schema offset mapping:', {
            frontendAreaId,
            frontendNum,
            fallbackAreaId,
        });
        return fallbackAreaId;
    }

    console.warn('[lookupDatabaseAreaId] available areas:', areasData.map(a => ({
        area_id: a.area_id || a.id,
        name: (a.area_name || a.name || '').slice(0, 50)
    })));
    return null;
}

export function normalizeDbAreaId(areaId) {
    const raw = String(areaId || '').trim();
    if (!raw) return null;

    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric > 0) {
        return numeric;
    }

    const romanValue = romanToNumber(raw);
    if (romanValue) {
        return romanValue;
    }

    return null;
}

export function sanitizeFileName(fileName) {
    return String(fileName || "document")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 120);
}

export function isPdfFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function romanToNumber(value) {
    const normalized = String(value || "").trim().toUpperCase();
    const map = {
        I: 1,
        II: 2,
        III: 3,
        IV: 4,
        V: 5,
        VI: 6,
        VII: 7,
        VIII: 8,
        IX: 9,
        X: 10,
    };
    return map[normalized] || null;
}

export function toAreaFolderName(areaId) {
    const raw = String(areaId || "").trim();
    if (!raw) return "Area 00";

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
        return `Area ${String(numeric).padStart(2, "0")}`;
    }

    const romanValue = romanToNumber(raw);
    if (romanValue) {
        return `Area ${String(romanValue).padStart(2, "0")}`;
    }

    return `Area ${raw}`;
}

export function toPartFolderName(part) {
    const labelMatch = String(part?.label || "").match(/Part\s+([A-Za-z](?:\.\d+)?)/i);
    if (labelMatch?.[1]) {
        return `Part ${labelMatch[1].toUpperCase()}`;
    }

    const partId = String(part?.id || "").trim();
    const tokens = partId.split("-").filter(Boolean);
    if (tokens.length >= 2) {
        const token = tokens.length >= 3 ? `${tokens[1]}.${tokens[2]}` : tokens[1];
        return `Part ${token.toUpperCase()}`;
    }

    return "Part Unknown";
}

export function normalizePartFolderName(value) {
    const match = String(value || "").match(/Part\s+([A-Za-z](?:\.\d+)?)/i);
    return match?.[1] ? match[1].toUpperCase() : "";
}

export function getPartFolderNameFromPath(pathValue) {
    if (!pathValue) return "";
    const pathSegments = String(pathValue)
        .split(/[\\/]/)
        .map((segment) => {
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        });

    return pathSegments.find((segment) => /^Part\s+[A-Za-z](?:\.\d+)?$/i.test(segment)) || "";
}

export function getAreaNumberFromPath(pathValue) {
    if (!pathValue) return null;
    const match = String(pathValue).match(/(?:^|[\\/])Area\s+(\d+)(?:[\\/]|$)/i);
    if (!match?.[1]) return null;

    const areaNumber = Number(match[1]);
    return Number.isInteger(areaNumber) && areaNumber > 0 ? areaNumber : null;
}

export function buildTemplatePathForPart(part) {
    const areaId = resolvePartAreaId(part);
    if (!areaId || !part?.id) return null;
    return `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/template.xlsx`;
}

export function buildTemplatePathCandidatesForPart(part) {
    const areaId = resolvePartAreaId(part);
    if (!areaId || !part?.id) return [];

    return [
        `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/template.xlsx`,
        `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/Template.xlsx`,
        `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/template.XLSX`,
        `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/${part.id}_template.xlsx`,
        `template.xlsx`,
    ];
}

export function normalizeWhatList(raw) {
    if (Array.isArray(raw)) {
        return raw
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    if (typeof raw === "string") {
        return raw
            .split(/\r?\n|\|\|/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    return [];
}

export function toSortOrder(row, fallback = 0) {
    const value = Number(
        getFirstValue(row, [
            "sort_order",
            "display_order",
            "sequence",
            "order",
            "position",
            "idx",
        ]),
    );
    return Number.isFinite(value) ? value : fallback;
}

export function makePartFromRow(row, areaId) {
    const id = String(
        getFirstValue(row, ["part_id", "subpart_id", "code", "id"], ""),
    ).trim();
    if (!id) return null;

    const label = String(
        getFirstValue(row, ["label", "name", "title", "part_label"], id),
    );
    const pts = String(
        getFirstValue(row, ["pts", "points", "score", "max_points"], ""),
    );
    const what = normalizeWhatList(
        getFirstValue(row, [
            "what",
            "rubric",
            "criteria",
            "requirements",
            "description_lines",
        ]),
    );

    return {
        id,
        label,
        pts,
        what,
        auto: toBoolean(getFirstValue(row, ["auto", "is_auto"]), false),
        isGroup: toBoolean(
            getFirstValue(row, ["is_group", "group", "is_header"]),
            false,
        ),
        areaId,
        status: "empty",
        file: null,
        date: null,
        _parentId: getFirstValue(row, [
            "parent_part_id",
            "parent_id",
            "group_part_id",
            "group_id",
        ]),
        _sortOrder: toSortOrder(row, 0),
    };
}

export function stripPartMeta(part) {
    const { _parentId, _sortOrder, ...clean } = part;
    return clean;
}

export function withAreaIds(areas) {
    return areas.map((area) => ({
        ...area,
        parts: area.parts.map((part) => {
            if (part.isGroup) {
                return {
                    ...part,
                    areaId: part.areaId || area.id,
                    subparts: (part.subparts || []).map((subpart) => ({
                        ...subpart,
                        areaId: subpart.areaId || area.id,
                    })),
                };
            }

            return {
                ...part,
                areaId: part.areaId || area.id,
            };
        }),
    }));
}

export async function queryAllByTableCandidates(candidates) {
    for (const table of candidates) {
        const fallback = await facultyApi.from(table).select("*");
        if (!fallback.error && Array.isArray(fallback.data)) {
            return fallback.data;
        }
    }

    return [];
}

export function buildAreasFromRows(areaRows, partRows) {
    if (!Array.isArray(areaRows) || areaRows.length === 0) {
        return [];
    }

    const resolved = areaRows
        .map((row, idx) => {
            const areaId = String(
                getFirstValue(row, ["area_id", "code", "id", "area_code"], ""),
            ).trim();
            if (!areaId) return null;

            const inlineParts = getFirstValue(row, ["parts", "part_definitions"]);
            if (Array.isArray(inlineParts) && inlineParts.length > 0) {
                const mappedInlineParts = inlineParts
                    .map((part, partIdx) => {
                        const mapped = makePartFromRow(part, areaId);
                        if (!mapped) return null;
                        return { ...mapped, _sortOrder: toSortOrder(part, partIdx) };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a._sortOrder - b._sortOrder)
                    .map((part) => stripPartMeta(part));

                return {
                    id: areaId,
                    name: String(
                        getFirstValue(row, ["name", "title", "area_name"], `Area ${areaId}`),
                    ),
                    maxPts: Number(
                        getFirstValue(row, ["max_points", "max_pts", "maxPts"], 0),
                    ),
                    note: String(getFirstValue(row, ["note", "description"], "")),
                    parts: mappedInlineParts,
                    _sortOrder: toSortOrder(row, idx),
                };
            }

            const ownRows = (Array.isArray(partRows) ? partRows : []).filter((partRow) => {
                const partAreaId = String(
                    getFirstValue(partRow, ["area_id", "area", "area_code", "parent_area_id"], ""),
                ).trim();
                return partAreaId && partAreaId === areaId;
            });

            const mappedParts = ownRows
                .map((partRow, partIdx) => {
                    const mapped = makePartFromRow(partRow, areaId);
                    if (!mapped) return null;
                    return { ...mapped, _sortOrder: toSortOrder(partRow, partIdx) };
                })
                .filter(Boolean)
                .sort((a, b) => a._sortOrder - b._sortOrder);

            const byId = new Map(mappedParts.map((part) => [part.id, part]));
            const topLevel = [];
            for (const part of mappedParts) {
                const parentId = part._parentId ? String(part._parentId) : "";
                if (parentId && byId.has(parentId)) {
                    const parent = byId.get(parentId);
                    parent.isGroup = true;
                    parent.subparts = parent.subparts || [];
                    parent.subparts.push(stripPartMeta(part));
                } else {
                    topLevel.push(part);
                }
            }

            const cleanTopLevel = topLevel
                .sort((a, b) => a._sortOrder - b._sortOrder)
                .map((part) => {
                    if (part.isGroup && Array.isArray(part.subparts)) {
                        const sortedSubparts = part.subparts
                            .map((subpart, subIdx) => ({
                                ...subpart,
                                _sortOrder: toSortOrder(subpart, subIdx),
                            }))
                            .sort((a, b) => a._sortOrder - b._sortOrder)
                            .map((subpart) => stripPartMeta(subpart));
                        return {
                            ...stripPartMeta(part),
                            subparts: sortedSubparts,
                        };
                    }
                    return stripPartMeta(part);
                });

            return {
                id: areaId,
                name: String(
                    getFirstValue(row, ["name", "title", "area_name"], `Area ${areaId}`),
                ),
                maxPts: Number(
                    getFirstValue(row, ["max_points", "max_pts", "maxPts"], 0),
                ),
                note: String(getFirstValue(row, ["note", "description"], "")),
                parts: cleanTopLevel,
                _sortOrder: toSortOrder(row, idx),
            };
        })
        .filter((area) => area && Array.isArray(area.parts) && area.parts.length > 0)
        .sort((a, b) => a._sortOrder - b._sortOrder)
        .map((area) => {
            const clean = { ...area };
            delete clean._sortOrder;
            return clean;
        });

    return withAreaIds(resolved);
}

export function buildToast(id, kind, message) {
    return { id, kind, message };
}
// Note: The following helpers were removed because the Home page no longer
// performs mount-time client bootstrap and these helpers were only used by that flow:
// - fetchAreaDefinitions
// - buildAreaIdMapping
// - mergeAreasWithSubmissions
// - mergePartWithSubmission
// - pickUserFilterCandidates
// - queryRowsFromTableCandidates
// Keep queryLatestPeriodFromCandidates and other query helpers used by actions.

export async function querySingleByCandidates(table, selectClause, candidates) {
    function isNumericIdLocal(val) {
        if (val === null || val === undefined) return false;
        return /^\d+$/.test(String(val).trim());
    }

    for (const [column, value] of candidates) {
        if (["user_id", "faculty_id", "uid"].includes(column) && !isNumericIdLocal(value)) {
            continue;
        }

        const result = await facultyApi
            .from(table)
            .select(selectClause)
            .eq(column, value)
            .maybeSingle();

        if (!result.error) return result.data;
        if (!isColumnOrTableError(result.error)) continue;
    }
    return null;
}

export async function queryDepartmentName(departmentId) {
    if (!departmentId) return "";

    const result = await facultyApi
        .from("departments")
        .select("department_name")
        .eq("department_id", departmentId)
        .maybeSingle();

    if (!result.error) {
        return String(result.data?.department_name || "");
    }

    return "";
}

export async function queryRowsByCandidates(table, selectClause, candidates) {
    for (const [column, value] of candidates) {
        try {
            console.debug(`queryRowsByCandidates: probing table=${table} column=${column} value=${value}`);

            if (["user_id", "faculty_id", "uid"].includes(column) && !/^\d+$/.test(String(value || '').trim())) {
                console.debug(`queryRowsByCandidates: skipping column=${column} value=${value} (non-numeric)`);
                continue;
            }

            const result = await facultyApi
                .from(table)
                .select(selectClause)
                .eq(column, value);

            if (!result.error && Array.isArray(result.data)) {
                console.debug(`queryRowsByCandidates: matched table=${table} column=${column} rows=${(result.data||[]).length}`);
                return result.data;
            }

            if (result.error) {
                console.debug(`queryRowsByCandidates: table=${table} column=${column} error=`, result.error?.message || result.error);
            }

            if (!isColumnOrTableError(result.error)) continue;
        } catch (e) {
            console.debug(`queryRowsByCandidates: exception for table=${table} column=${column}`, e?.message || e);
        }
    }
    return [];
}

export async function querySingleFromTableCandidates(tableCandidates, selectClause, candidates) {
    for (const table of tableCandidates) {
        const row = await querySingleByCandidates(table, selectClause, candidates);
        if (row) {
            return { table, row };
        }
    }

    return { table: null, row: null };
}

export async function queryRowsFromTableCandidates(tableCandidates, selectClause, candidates) {
    for (const table of tableCandidates) {
        const rows = await queryRowsByCandidates(table, selectClause, candidates);
        if (rows.length > 0) {
            return { table, rows };
        }
    }

    return { table: null, rows: [] };
}

export async function queryLatestPeriodFromCandidates(tableCandidates) {
    const response = await facultyApi.listCycles();
    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length === 0) {
        return { table: null, row: null };
    }

    const sortedRows = [...rows].sort((a, b) => {
        const aTime = new Date(a?.created_at || a?.updated_at || 0).getTime();
        const bTime = new Date(b?.created_at || b?.updated_at || 0).getTime();
        return bTime - aTime;
    });

    return { table: CYCLE_TABLE_CANDIDATES[0] || "ranking_cycles", row: sortedRows[0] || null };
}

export async function querySingleByColumnCandidates(tableCandidates, selectClause, columnCandidates, value) {
    if (!value) return { table: null, row: null };

    for (const table of tableCandidates) {
        for (const column of columnCandidates) {
            const result = await facultyApi
                .from(table)
                .select(selectClause)
                .eq(column, value)
                .maybeSingle();

            if (!result.error) {
                return { table, row: result.data || null };
            }

            if (!isColumnOrTableError(result.error)) {
                continue;
            }
        }
    }

    return { table: null, row: null };
}

function collectApplyingForCandidates(value) {
    const candidateNames = [];

    if (Array.isArray(value)) {
        for (const entry of value) {
            if (typeof entry === "string" && entry.trim()) {
                candidateNames.push(entry.trim());
            }
        }
        return candidateNames;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return candidateNames;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return collectApplyingForCandidates(parsed);
            }
        } catch {
            // Fall back to comma-separated values below.
        }

        return trimmed
            .split(/\s*,\s*/)
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return candidateNames;
}

export async function resolveTargetPositionId(applyingFor, fallbackPositionId = null) {
    const candidateNames = collectApplyingForCandidates(applyingFor);
    const positionsResult = await facultyApi.listPositions();
    const positions = Array.isArray(positionsResult.data) ? positionsResult.data : [];

    for (const positionName of candidateNames) {
        const activeMatch = positions.find((position) => {
            const isActive = Number(position?.is_active ?? 0) === 1;
            const name = String(position?.position_name || position?.name || "").trim().toLowerCase();
            return isActive && name === String(positionName).trim().toLowerCase();
        });

        if (activeMatch?.position_id) {
            return Number(activeMatch.position_id);
        }
    }

    const firstActivePosition = positions.find((position) => Number(position?.is_active ?? 0) === 1);
    if (firstActivePosition?.position_id) {
        return Number(firstActivePosition.position_id);
    }

    const firstPosition = positions[0];
    if (firstPosition?.position_id) {
        return Number(firstPosition.position_id);
    }

    return fallbackPositionId ? Number(fallbackPositionId) : null;
}
