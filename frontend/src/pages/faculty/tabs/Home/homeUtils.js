export function getLeafParts(area) {
    return area.parts.flatMap((part) => (part.isGroup ? part.subparts : [part]));
}

export function getAreaStatus(area) {
    const uploadable = getLeafParts(area).filter((part) => !part.auto);
    if (uploadable.length === 0) return "auto";
    if (uploadable.every((part) => part.status === "submitted")) return "submitted";
    if (uploadable.some((part) => part.status === "submitted" || part.status === "draft" || part.status === "draft-local" || part.status === "failed")) {
        return "progress";
    }
    return "empty";
}

export function getProgress(area) {
    const uploadable = getLeafParts(area).filter((part) => !part.auto);
    return {
        done: uploadable.filter((part) => part.status === "submitted").length,
        total: uploadable.length,
    };
}
