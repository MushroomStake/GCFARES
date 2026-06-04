// SIA/frontend/src/data/fileNames.js

const FILE_NAME_PATTERNS = {
    "I-A": "{lastName}.{firstName}.AreaI.PartA",
    "I-B": "{lastName}.{firstName}.AreaI.PartB",
    "I-C": "{lastName}.{firstName}.AreaI.PartC",
    "I-D": "{lastName}.{firstName}.AreaI.PartD",
    "I-E": "{lastName}.{firstName}.AreaI.PartE",
    "I-F": "{lastName}.{firstName}.AreaI.PartF",
    "I-G": "{lastName}.{firstName}.AreaI.PartG",
    "I-H": "{lastName}.{firstName}.AreaI.PartH",
    "I-I": "{lastName}.{firstName}.AreaI.PartI",
    "I-J": "{lastName}.{firstName}.AreaI.PartJ",
    "I-K": "{lastName}.{firstName}.AreaI.PartK",
    "I-L": "{lastName}.{firstName}.AreaI.PartL",
    "II-A-1": "{lastName}.{firstName}.AreaII.PartA.1",
    "II-A-2": "{lastName}.{firstName}.AreaII.PartA.2",
    "II-A-3": "{lastName}.{firstName}.AreaII.PartA.3",
    "II-A-4": "{lastName}.{firstName}.AreaII.PartA.4",
    "II-B-1": "{lastName}.{firstName}.AreaII.PartB.1",
    "II-B-2": "{lastName}.{firstName}.AreaII.PartB.2",
    "II-B-3": "{lastName}.{firstName}.AreaII.PartB.3",
    "II-C-1": "{lastName}.{firstName}.AreaII.PartC.1",
    "II-C-2": "{lastName}.{firstName}.AreaII.PartC.2",
    "II-D-1": "{lastName}.{firstName}.AreaII.PartD.1",
    "II-D-2": "{lastName}.{firstName}.AreaII.PartD.2",
    "II-D-3": "{lastName}.{firstName}.AreaII.PartD.3",
    "II-D-4": "{lastName}.{firstName}.AreaII.PartD.4",
    "III-A": "{lastName}.{firstName}.AreaIII.PartA",
    "III-B": "{lastName}.{firstName}.AreaIII.PartB",
    "III-C": "{lastName}.{firstName}.AreaIII.PartC",
    "III-D": "{lastName}.{firstName}.AreaIII.PartD",
    "V-A": "{lastName}.{firstName}.AreaV.PartA",
    "V-B": "{lastName}.{firstName}.AreaV.PartB",
    "VI-A": "{lastName}.{firstName}.AreaVI.PartA",
    "VI-B": "{lastName}.{firstName}.AreaVI.PartB",
    "VI-C": "{lastName}.{firstName}.AreaVI.PartC",
    "VI-D": "{lastName}.{firstName}.AreaVI.PartD",
    "VI-E": "{lastName}.{firstName}.AreaVI.PartE",
    "VI-F": "{lastName}.{firstName}.AreaVI.PartF",
    "VI-G": "{lastName}.{firstName}.AreaVI.PartG",
    "VII-A": "{lastName}.{firstName}.AreaVII.PartA",
    "VII-B": "{lastName}.{firstName}.AreaVII.PartB",
    "VII-C": "{lastName}.{firstName}.AreaVII.PartC",
    "VIII-A": "{lastName}.{firstName}.AreaVIII.PartA",
    "IX-A": "{lastName}.{firstName}.AreaIX.PartA",
    "X-A1": "{lastName}.{firstName}.AreaX.PartA1",
    "X-A2": "{lastName}.{firstName}.AreaX.PartA2",
    "X-A3": "{lastName}.{firstName}.AreaX.PartA3",
    "X-A4": "{lastName}.{firstName}.AreaX.PartA4",
};

export const PART_ID_TO_FILENAME_KEY = { ...FILE_NAME_PATTERNS };

function compactNamePart(value, fallback) {
    const compacted = String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");

    return compacted || fallback;
}

export function getRequiredFileName(partId, lastName, firstName) {
    const pattern = FILE_NAME_PATTERNS[partId];
    if (!pattern) return null;

    return pattern
        .replace("{lastName}", compactNamePart(lastName, "LastName"))
        .replace("{firstName}", compactNamePart(firstName, "FirstName"));
}

export default FILE_NAME_PATTERNS;
