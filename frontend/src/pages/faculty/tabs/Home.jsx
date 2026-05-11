
// 📄 SIA/frontend/src/pages/faculty/tabs/Home.jsx
//
// ── SUBMISSION MODEL ─────────────────────────────────────────────────────────
// REVISED (John Carlo, class rep):
//   • First-level numbered items (A.1, A.2, A.3, B.1 ...) = SEPARATE upload +
//     submit each. They represent distinct document categories.
//   • Sub-criteria (A.1.1, A.1.2 ...) = RUBRIC BULLETS grouped inside their
//     parent numbered item — NOT separate uploads.
//   • Letter Parts (A, B, C ...) that CONTAIN numbered sub-items become GROUP
//     HEADERS only — no upload at the letter-Part level itself.
//   • Letter Parts with NO numbered sub-items (most areas outside II) remain
//     a single "compile into one PDF" submission slot.
//
//   Areas using the group-header model: Area II (Parts A, B, C, D).
//   All other areas retain one upload per letter Part.
//
// ── REVISIONS ────────────────────────────────────────────────────────────────
// • Area II restructured: A/B/C/D are group headers; A.1/A.2/etc. are
//   separate submission slots; A.1.1/A.1.2/etc. are rubric bullets.
// • Submission window flag (DEFAULT_SUBMISSION_OPEN) gates upload/submit controls.
// • 2-level nav: Area list → Area detail with Part cards / group headers.
// • Score breakdown removed (HR-only), Ranking Summary added.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import {
    Send,
    FileText,
    Eye,
    Download,
    RefreshCw,
    Paperclip,
    CheckCircle,
    X,
    School,
    Star,
    Building2,
    ArrowRight,
    Calendar,
    TrendingUp,
    ChevronLeft,
    Info,
    Lock,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getRequiredFileName } from "../../../data/fileNames";
import { useSearchParams } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// AREAS DATA
// Each `part` = one template download + one file upload + one submit button
// `what` bullets = the scoring rubric criteria for that Part (sub-items)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION WINDOW FLAG
// Default fallback used until ranking period data is hydrated from Supabase.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SUBMISSION_OPEN = false;

const AREAS_DATA = [
    // ── AREA I ─────────────────────────────────────────────────────────────────
    {
        id: "I",
        name: "Educational Qualifications",
        maxPts: 85,
        note: "Only the highest qualifying level is scored per group. Submit one file per applicable Part.",
        parts: [
            {
                id: "I-A",
                label: "Part A — Associate Courses / Program (2 years)",
                pts: "25.00",
                what: [
                    "Official Transcript of Records (TOR) showing completion of a 2-year Associate program",
                    "Diploma or Certificate of Completion (front and back)",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-B",
                label: "Part B — Bachelor's Degree (4–5 years)",
                pts: "45.00",
                what: [
                    "Official TOR showing completion of a 4 or 5-year Bachelor's program",
                    "Diploma (front and back)",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-C",
                label: "Part C — Diploma Course (above Bachelor's Degree)",
                pts: "46.00",
                what: [
                    "Certificate of completion from the institution offering the post-baccalaureate diploma course",
                    "Must be a program taken after a Bachelor's degree",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-D",
                label: "Part D — Master's Program (units only, no degree yet)",
                pts: "47.00 – 55.00",
                what: [
                    "Official TOR showing earned MA/MS units (no degree conferred yet)",
                    "Scoring by unit count: D.1 = 6–12 units → 47 pts · D.2 = 13–18 → 49 · D.3 = 19–24 → 51 · D.4 = 25–30 → 53 · D.5 = 31+ → 55 pts",
                    "Attach the TOR that shows the highest applicable unit count",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-E",
                label: "Part E — Master's Comprehensive Exam Passed",
                pts: "58.00",
                what: [
                    "Official certification from the school/university that you passed the Master's Comprehensive Examination",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-F",
                label: "Part F — Master's Degree (non-thesis)",
                pts: "60.00",
                what: [
                    "Diploma of completion for a non-thesis Master's program",
                    "Official TOR showing all units completed and degree conferred",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-G",
                label: "Part G — Master's Thesis Defended",
                pts: "62.00",
                what: [
                    "Certificate of Thesis Defense from the institution",
                    "Approved thesis title page or cover page signed by the panel",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-H",
                label: "Part H — Master's Degree (additional 2 pts for a second degree)",
                pts: "65.00",
                what: [
                    "Diploma for a second Master's degree",
                    "Official TOR of the additional Master's program",
                    "The base score is from Part F or G; the additional degree adds 2 pts",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-I",
                label: "Part I — LLB and MD (passed bar / board exam)",
                pts: "65.00",
                what: [
                    "Diploma for LLB or MD program",
                    "Proof of passing the bar (SC order) or medical board exam (PRC Certificate of Registration)",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-J",
                label: "Part J — Doctoral Program (units only, no degree yet)",
                pts: "67.00 – 75.00",
                what: [
                    "Official TOR showing earned doctoral units (no degree conferred yet)",
                    "Scoring by unit count: J.1 = 9–18 units → 67 pts · J.2 = 19–27 → 69 · J.3 = 28–36 → 71 · J.4 = 37–45 → 73 · J.5 = 46+ → 75 pts",
                    "Attach the TOR showing the highest applicable unit count",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-K",
                label: "Part K — Doctoral Comprehensive Exam Passed",
                pts: "80.00",
                what: [
                    "Official certification from the school/university that you passed the Doctoral Comprehensive Examination",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "I-L",
                label: "Part L — Doctorate Degree (additional 5 pts for a second doctorate)",
                pts: "85.00",
                what: [
                    "Diploma showing the Doctorate degree was conferred",
                    "Dissertation defense certificate or equivalent",
                    "For a second Doctorate: attach a separate diploma and TOR — the additional degree adds 5 pts",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA II ────────────────────────────────────────────────────────────────
    // REVISED: Parts A/B/C/D are now GROUP HEADERS (isGroup: true).
    // Each first-level numbered item (A.1, A.2, A.3...) is a separate submission.
    // Sub-criteria (A.1.1, A.1.2...) are rubric bullets inside each subpart.
    {
        id: "II",
        name: "Research and Publications",
        maxPts: 20,
        note: "Part A (Publications) capped at 10 pts · Part B (Research) capped at 10 pts · Parts C and D are add-ons. Each numbered item (A.1, A.2 ...) requires its own file upload.",
        parts: [
            // ── Part A — Publications ─────────────────────────────────────────
            {
                id: "II-A",
                label: "Part A — Publications",
                pts: "Max 10.00",
                isGroup: true,
                subparts: [
                    {
                        id: "II-A-1",
                        label: "A.1 — Published Books",
                        pts: "up to 2.00 pts / book",
                        what: [
                            "A.1.1 No. of Authors — Single author: 1.25 · Co-authored: 0.75 · Three or more: 0.25",
                            "A.1.2 Designation of Writer — Lead Author: 0.75 · Co-author: 0.50",
                            "A.1.3 Level — International: 1.00 · National/Regional: 0.75 · Institutional: 0.50",
                            "Required: front cover/title page, abstract, proof of publication (ISBN, DOI, publisher certificate). Indicate: no. of authors, your designation, and publication level.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-A-2",
                        label: "A.2 — Published Research",
                        pts: "up to 2.00 pts / output",
                        what: [
                            "A.2.1 No. of Authors — Single author: 1.25 · Co-authored: 0.75 · Three or more: 0.25",
                            "A.2.2 Designation of Writer — Lead Author: 0.75 · Co-author: 0.50",
                            "A.2.3 Level — International: 1.00 · National/Regional: 0.75 · Institutional: 0.50",
                            "Required: journal volume/issue/page, DOI or publisher certificate. Indicate: no. of authors, your designation, and level.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-A-3",
                        label: "A.3 — Monograph",
                        pts: "up to 1.00 pt / output",
                        what: [
                            "A.3.1 No. of Authors — Single: 0.75 · Co-authored: 0.50 · Three or more: 0.25",
                            "A.3.2 Designation of Writer — Lead Author: 0.50 · Co-author: 0.25",
                            "A.3.3 Level — International: 0.75 · National/Regional: 0.50 · Institutional: 0.25",
                            "Required: title page, abstract, proof of publication. Indicate: no. of authors, your designation, and level.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-A-4",
                        label: "A.4 — Published Thesis/Dissertation (from another institution)",
                        pts: "3.00 pts flat",
                        what: [
                            "A.4 For a thesis or dissertation published and originating from another institution: 3.00 pts flat.",
                            "Required: front cover, abstract, and proof of publication from the awarding institution.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                ],
            },
            // ── Part B — Research ─────────────────────────────────────────────
            {
                id: "II-B",
                label: "Part B — Research",
                pts: "Max 10.00",
                isGroup: true,
                subparts: [
                    {
                        id: "II-B-1",
                        label: "B.1 — Institutional Materials (books, manuals, modules)",
                        pts: "1.50 pts / output",
                        what: [
                            "B.1.1 No. of Researchers — Single: 1.25 · Two or more: 0.75",
                            "B.1.2 Designation — Lead researcher: 0.75 · Co-researcher: 0.50",
                            "B.1.3 Level — External: 0.50 · Institutional: 0.25",
                            "Required: title page, abstract, endorsement or certification from the Research Office or Dean. Indicate: no. of researchers, your designation, and level.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-B-2",
                        label: "B.2 — Unpublished Research",
                        pts: "0.75 pts / output",
                        what: [
                            "B.2.1 No. of Researchers — Single: 0.75 · Two or more: 0.50",
                            "B.2.2 Designation — Lead researcher: 0.50 · Co-researcher: 0.25",
                            "B.2.3 Level — External: 0.50 · Institutional: 0.25",
                            "Required: title page, abstract, and certification that the research is unpublished. Indicate: no. of researchers, your designation, and level.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-B-3",
                        label: "B.3 — Development of a Complete Set of Instructional Materials",
                        pts: "1.25 pts flat",
                        what: [
                            "B.3 For the development of a complete set of instructional materials: 1.25 pts flat.",
                            "Required: copy of the instructional materials and certification or endorsement from the Dean or Department Head.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                ],
            },
            // ── Part C — Editor of a Professional Journal ─────────────────────
            {
                id: "II-C",
                label: "Part C — Editor of a Professional Journal (add-on)",
                pts: "0.50 – 1.25",
                isGroup: true,
                subparts: [
                    {
                        id: "II-C-1",
                        label: "C.1 — Editor-in-Chief / Honorary Editor-in-Chief",
                        pts: "0.75 – 1.25",
                        what: [
                            "C.1.1 Level — External: 0.75 · Institutional: 0.50",
                            "C.1.2 Type of Publication — Refereed: 1.25 · Non-refereed: 0.75",
                            "Required: certificate or letter of appointment, front page of the journal showing your name and role.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-C-2",
                        label: "C.2 — Member of the Editorial Board",
                        pts: "0.50 – 1.25",
                        what: [
                            "C.2.1 Level — External: 0.75 · Institutional: 0.50",
                            "C.2.2 Type of Publication — Refereed: 1.25 · Non-refereed: 0.75",
                            "Required: certificate or letter of appointment, front page of the journal showing your name and board role.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                ],
            },
            // ── Part D — Creative Works ───────────────────────────────────────
            {
                id: "II-D",
                label: "Part D — Creative Works (add-on, Max. 5 points)",
                pts: "Max 5.00",
                isGroup: true,
                subparts: [
                    {
                        id: "II-D-1",
                        label: "D.1 — Poems, Newspaper/Magazine Articles, Illustrations, Maps, Photography, Advertisements",
                        pts: "0.75 pts base",
                        what: [
                            "D.1.1 Level — International: 1.75 · National: 0.75 · Institutional: 0.50",
                            "D.1.2 No. of Authors — Single: 1.25 · Co-authored: 0.75 · Three or more: 0.50",
                            "Required: documentation of the work (published copy, scan, or program proceedings). Indicate: type of creative work, level, and number of authors.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-D-2",
                        label: "D.2 — Short Stories, Lectures, Sermons, Addresses",
                        pts: "1.25 pts base",
                        what: [
                            "D.2.1 Level — International: 1.50 · National: 0.75 · Institutional: 0.50",
                            "D.2.2 No. of Authors — Single: 1.25 · Co-authored: 0.75 · Three or more: 0.50",
                            "Required: published copy or official documentation. Indicate: level and number of authors.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-D-3",
                        label: "D.3 — Computer Programs, Paintings, Novels (non-fiction)",
                        pts: "1.50 pts base",
                        what: [
                            "D.3.1 Level — International: 1.50 · National: 0.75 · Institutional: 0.50",
                            "D.3.2 No. of Authors — Single: 1.00 · Co-authored: 0.75 · Three or more: 0.50",
                            "Required: documentation or published record of the work. Indicate: level and number of authors.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                    {
                        id: "II-D-4",
                        label: "D.4 — Poster / Oral Presentation",
                        pts: "1.00 pt base",
                        what: [
                            "D.4.1 Level — International: 1.50 · National: 1.00 · Institutional: 0.25",
                            "D.4.2 No. of Authors — Single: 1.00 · Co-authored: 0.75 · Three or more: 0.50",
                            "Required: program proceedings or certificate of presentation. Indicate: level and number of authors.",
                        ],
                        status: "empty",
                        file: null,
                        date: null,
                    },
                ],
            },
        ],
    },

    // ── AREA III ───────────────────────────────────────────────────────────────
    {
        id: "III",
        name: "Teaching Experience and Professional Services",
        maxPts: 20,
        note: "Administrative designation (Part C) requires at least 1 full year of continuous service. Submit one file per Part.",
        parts: [
            {
                id: "III-A",
                label: "Part A — Teaching Experience in Gordon College",
                pts: "1.00 / yr (full-time) · 0.25 / yr (part-time)",
                what: [
                    "A.1 Full-time teaching in Gordon College: 1.00 pt per year",
                    "A.2 Part-time teaching in Gordon College: 0.25 pt per year",
                    "Required documents: Service Record from Gordon College HR, or Certificate of Employment specifying full-time or part-time designation and years covered.",
                    "Compile Part A.1 and A.2 records into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "III-B",
                label: "Part B — Teaching Experience in Other Institutions",
                pts: "0.50 / yr (full-time) · 0.25 / yr (part-time)",
                what: [
                    "B.1 Full-time teaching in other institutions: 0.50 pt per year",
                    "B.2 Part-time teaching in other institutions: 0.25 pt per year",
                    "Required documents: Certificate of Employment from each institution outside Gordon College, indicating full-time or part-time status and period covered.",
                    "Compile all other-institution records into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "III-C",
                label: "Part C — Administrative Designation (at least 1 year of service)",
                pts: "0.25 – 3.00 / yr",
                what: [
                    "C.1 President — Within Gordon College: 3.00/yr · Outside GC: 1.50/yr",
                    "C.2 Vice President — Within Gordon College: 2.50/yr · Outside GC: 1.25/yr",
                    "C.3 Dean / Head / Principal / Director — Within GC: 2.00/yr · Outside GC: 1.00/yr",
                    "C.4 Program Coordinator — Within GC: 1.00/yr · Outside GC: 0.50/yr",
                    "C.5 Area / Subject Coordinator — Within GC: 0.50/yr · Outside GC: 0.25/yr",
                    "Required documents: Special Order or appointment letter specifying the role and duration. Must show at least 1 full year of continuous service in the designated role.",
                    "Compile all administrative appointment documents into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "III-D",
                label: "Part D — Industry Experience (aligned to field, full-time)",
                pts: "0.25 / yr",
                what: [
                    "D. For every year of industry experience aligned to the field of specialization, as full-time: 0.25 pt per year",
                    "Required documents: Certificate of Employment from the industry employer specifying the position and period, and that it was full-time.",
                    "The position must be relevant and aligned to your academic field of specialization.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA IV ────────────────────────────────────────────────────────────────
    {
        id: "IV",
        name: "Performance Evaluation",
        maxPts: 10,
        note: "Auto-scored by HR Department. No file submission required from faculty.",
        parts: [
            {
                id: "IV-auto",
                label: "Auto-scored by HR Department",
                pts: "1.00 – 10.00",
                auto: true,
                what: [
                    "No submission needed — HR scores this area from the student evaluation CSV uploaded each semester.",
                    "Rating scale: 1.00–1.39 = 1 pt (Poor) · 1.40–1.79 = 2 pts · 1.80–2.19 = 3 pts · 2.20–2.59 = 4 pts",
                    "2.60–2.99 = 5 pts (Satisfactory) · 3.00–3.39 = 6 pts · 3.40–3.79 = 7 pts · 3.80–4.19 = 8 pts",
                    "4.20–4.59 = 9 pts (Very Satisfactory) · 4.60–5.00 = 10 pts (Outstanding)",
                    "Contact the HR Department if you believe your student evaluation data is incorrect.",
                ],
                status: "auto",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA V ─────────────────────────────────────────────────────────────────
    {
        id: "V",
        name: "Training and Seminars",
        maxPts: 10,
        note: "Submit one compiled PDF per Part. Include all certificates for that Part in one file.",
        parts: [
            {
                id: "V-A",
                label: "Part A — Training Courses",
                pts: "1.00 – 5.00 per training",
                what: [
                    "A.1 International training course: 5.00 pts per training",
                    "A.2 National training course: 4.00 pts per training",
                    "A.3 Regional training course: 3.00 pts per training",
                    "A.4 Local training course: 2.00 pts per training",
                    "A.5 Institutional training course: 1.00 pt per training",
                    "Required documents: Certificates of Completion or Attendance for each training course attended. Compile all training certificates into one organized PDF, grouped by level.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "V-B",
                label: "Part B — Conferences, Seminars, and Workshops",
                pts: "1.00 – 5.00 per event",
                what: [
                    "B.1 International conference/seminar/workshop: 5.00 pts per event",
                    "B.2 National conference/seminar/workshop: 4.00 pts per event",
                    "B.3 Regional conference/seminar/workshop: 3.00 pts per event",
                    "B.4 Local conference/seminar/workshop: 2.00 pts per event",
                    "B.5 Institutional conference/seminar/workshop: 1.00 pt per event",
                    "Required documents: Certificates of Participation or Attendance for each event. Compile all conference and seminar certificates into one organized PDF, grouped by level.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA VI ────────────────────────────────────────────────────────────────
    {
        id: "VI",
        name: "Expert Services Rendered",
        maxPts: 20,
        note: "Submit one file per applicable Part. Only submit Parts that apply to you.",
        parts: [
            {
                id: "VI-A",
                label: "Part A — Short-term Consultancy / Expert Service",
                pts: "1.00 – 5.00",
                what: [
                    "A.1 International level: 5.00 pts · A.2 National: 4.00 pts · A.3 Regional: 3.00 pts · A.4 Local: 2.00 pts · A.5 Institutional: 1.00 pt",
                    "Required documents: Contract, Memorandum of Agreement (MOA), or Certificate of Service as consultant or expert. Indicate the level of the engagement.",
                    "Compile all applicable consultancy documents into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-B",
                label: "Part B — Coordinator / Lecturer / Resource Person",
                pts: "1.00 – 5.00",
                what: [
                    "B.1 International level: 5.00 pts · B.2 National: 4.00 pts · B.3 Regional: 3.00 pts · B.4 Local: 2.00 pts · B.5 Institutional: 1.00 pt",
                    "Required documents: Certificate of Service as coordinator, lecturer, or resource person from the organizing body. Indicate the level of the event.",
                    "Compile all applicable certificates into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-C",
                label: "Part C — Adviser in Dissertation / Thesis",
                pts: "0.25 – 1.00 per advisee",
                what: [
                    "C.1 Doctoral Dissertation: 1.00 pt per advisee",
                    "C.2 Masteral Thesis: 0.50 pt per advisee",
                    "C.3 Undergraduate Thesis (conducted outside Gordon College): 0.25 pt per advisee",
                    "Required documents: Certificate of Advisership issued by the institution for each advisee. Compile all advisership certificates into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-D",
                label: "Part D — Reviewer / Examiner (PRC or Civil Service Commission)",
                pts: "1.00 per service",
                what: [
                    "D. For certified services as reviewer or examiner for the Professional Regulatory Commission (PRC) or the Civil Service Commission: 1.00 pt per certified service.",
                    "Required documents: Certificate from PRC or CSC confirming your service as reviewer or examiner.",
                    "Compile all certificates into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-E",
                label: "Part E — Expert Service in Accreditation Work",
                pts: "1.00 per service",
                what: [
                    "E. For expert services as member of Board of Directors, Technical Committee, or Consultant Group in accreditation work: 1.00 pt per service.",
                    "Required documents: Certificate of Service or appointment letter confirming your role in accreditation-related work.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-F",
                label: "Part F — Expert Service in Trade Skill Certification",
                pts: "1.00 per service",
                what: [
                    "F. For every expert service in trade skill certification: 1.00 pt per service.",
                    "Required documents: Certificate confirming your expert service in trade skill certification.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VI-G",
                label: "Part G — Service in Curricular / Extra-Curricular Activities",
                pts: "1.00 / yr",
                what: [
                    "G. For every year of service in curricular or extra-curricular activities: 1.00 pt per year.",
                    "Required documents: Certificate or Special Order of assignment specifying the role and duration of service.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA VII ───────────────────────────────────────────────────────────────
    {
        id: "VII",
        name: "Involvement in Professional Organizations",
        maxPts: 10,
        note: "Submit one file per Part. Compile all relevant membership/appointment documents into one PDF per Part.",
        parts: [
            {
                id: "VII-A",
                label: "Part A — Professional Organizations",
                pts: "1.00 – 5.00",
                what: [
                    "A. International level — Officer: 5.00 pts · Member: 2.00 pts",
                    "B. National level — Officer: 4.00 pts · Member: 2.00 pts",
                    "C. Regional level — Officer: 3.00 pts · Member: 1.00 pt",
                    "Required documents: Membership ID, certificate of membership, or certificate of appointment as officer. Indicate the level and your role (Officer or Member).",
                    "Compile all professional organization documents into one organized PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VII-B",
                label: "Part B — Civic Organizations",
                pts: "Officer 1.00 · Member 0.50",
                what: [
                    "A. Officer: 1.00 pt",
                    "B. Member: 0.50 pt",
                    "Required documents: Membership ID or certificate of membership/officership in a civic organization. Indicate your role (Officer or Member).",
                    "Compile all civic organization documents into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "VII-C",
                label: "Part C — Scholarship / Fellowship",
                pts: "1.00 – 5.00",
                what: [
                    "A. International — Doctorate: 5.00 pts · Masteral: 4.00 pts · Non-degree: 3.00 pts",
                    "B. National / Regional — Doctorate: 3.00 pts · Masteral: 2.00 pts · Non-degree: 1.00 pt",
                    "C. Local / Institutional — Doctorate: 2.00 pts · Masteral: 1.00 pt",
                    "Required documents: Award letter, certificate, or official documentation of scholarship or fellowship received. Indicate the level and type (Doctorate, Masteral, or Non-degree).",
                    "Compile all scholarship/fellowship documents into one PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA VIII ──────────────────────────────────────────────────────────────
    {
        id: "VIII",
        name: "Awards of Distinction",
        maxPts: 10,
        note: "Awards must be in recognition of achievements in your area of specialization, profession, or faculty assignment. Submit one compiled PDF for Part A.",
        parts: [
            {
                id: "VIII-A",
                label: "Part A — Awards of Distinction Received",
                pts: "1.00 – 5.00 per award",
                what: [
                    "A. International level: 5.00 pts per award",
                    "B. National level: 4.00 pts per award",
                    "C. Regional level: 3.00 pts per award",
                    "D. Local level: 2.00 pts per award",
                    "E. Institutional level: 1.00 pt per award",
                    "Required documents: Award certificate, plaque citation, trophy documentation, or official publication/news citation. Must be received in recognition of achievements in your area of specialization or faculty assignment.",
                    "Compile all award documents into one organized PDF, grouped by level (A–E).",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA IX ────────────────────────────────────────────────────────────────
    {
        id: "IX",
        name: "Community Outreach",
        maxPts: 5,
        note: "Submit one compiled PDF for Part A covering all levels of community outreach participation.",
        parts: [
            {
                id: "IX-A",
                label: "Part A — Participation in Service-Oriented Projects",
                pts: "3.00 – 5.00",
                what: [
                    "A.1 International project: 5.00 pts",
                    "A.2 National project: 4.00 pts",
                    "A.3 Regional / Local / Institutional project: 3.00 pts base (1 additional pt per additional project at this level)",
                    "Required documents: Certificate of Participation or Completion from the organizing body for each community service project. Indicate the level (International, National, or Regional/Local/Institutional).",
                    "Compile all community outreach certificates into one organized PDF.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },

    // ── AREA X ─────────────────────────────────────────────────────────────────
    {
        id: "X",
        name: "Professional Examination (PRC, CSC & TESDA)",
        maxPts: 10,
        note: "Submit a separate file for each applicable Part.",
        parts: [
            {
                id: "X-A1",
                label: "Part A.1 — Board / Professional Examinations (PRC-regulated)",
                pts: "10.00",
                what: [
                    "A.1 For every relevant licensure and other professional examination:",
                    "Applicable: Accounting, Customs Broker, Engineering, Nursing, Midwifery, Medicine, Law, Teacher's Board, and all other PRC-regulated professions — 10.00 pts",
                    "Required documents: PRC ID or Certificate of Registration showing the board or professional examination passed.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "X-A2",
                label: "Part A.2 — Civil Service Eligibility",
                pts: "3.00 – 7.00",
                what: [
                    "A.2.1 Career Executive Service Officer (CESO): 7.00 pts",
                    "A.2.2 Professional License (CSC Professional level): 5.00 pts",
                    "A.2.3 Sub-Professional License: 3.00 pts",
                    "Required documents: CSC Certificate of Eligibility specifying the level (CESO, Professional, or Sub-Professional).",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "X-A3",
                label: "Part A.3 — Other Trade Certificates (NC II and above — TESDA)",
                pts: "3.00",
                what: [
                    "A.3 Other Trade Certificates (NC II onwards): 3.00 pts",
                    "Required documents: Official TESDA National Certificate (NC II or higher) from the certifying body. Compile multiple TESDA certificates into one PDF if applicable.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
            {
                id: "X-A4",
                label: "Part A.4 — Specialty Certification (International / Local)",
                pts: "3.00",
                what: [
                    "A.4.1 International or Local specialty certification: 3.00 pts",
                    "Required documents: Official certificate from the certifying body showing the specialty certification granted.",
                ],
                status: "empty",
                file: null,
                date: null,
            },
        ],
    },
];

const DEFAULT_AREAS_DATA = withAreaIds(AREAS_DATA);

// ── Helpers ──

// Flattens an area's parts: if a part is a group header (isGroup), returns its
// subparts instead. This gives the flat list of actual submission slots.
function getLeafParts(area) {
    return area.parts.flatMap((p) => (p.isGroup ? p.subparts : [p]));
}

function getAreaStatus(area) {
    const uploadable = getLeafParts(area).filter((p) => !p.auto);
    if (uploadable.length === 0) return "auto";
    if (uploadable.every((p) => p.status === "submitted")) return "submitted";
    if (
        uploadable.some((p) => p.status === "submitted" || p.status === "draft")
    )
        return "progress";
    return "empty";
}
function getProgress(area) {
    const uploadable = getLeafParts(area).filter((p) => !p.auto);
    return {
        done: uploadable.filter((p) => p.status === "submitted").length,
        total: uploadable.length,
    };
}

const DEFAULT_PERIOD_LABEL = "No active ranking period";
const DEFAULT_DEADLINE_LABEL = "TBA";
const TEMPLATE_BUCKET =
    import.meta.env.VITE_SUPABASE_TEMPLATE_BUCKET || "documents";
const SUBMISSIONS_BUCKET =
    import.meta.env.VITE_SUPABASE_SUBMISSIONS_BUCKET || "documents";
const TOAST_TTL_MS = 3200;
const AREA_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_AREA_TABLE_CANDIDATES ||
    "areas,ranking_areas,area_definitions"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const AREA_PART_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_AREA_PART_TABLE_CANDIDATES ||
    "areaparts,area_parts,ranking_parts,area_criteria"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const CYCLE_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_CYCLE_TABLE_CANDIDATES ||
    "ranking_cycles,rankingcycles,cycles"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const PROFILE_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_PROFILE_TABLE_CANDIDATES ||
    "users,profiles,faculty_profiles"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const APPLICATION_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_APPLICATION_TABLE_CANDIDATES ||
    "applications,ranking_applications,faculty_applications"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const POSITION_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_POSITION_TABLE_CANDIDATES ||
    "positions,rank_positions"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const AREA_SUBMISSION_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_AREA_SUBMISSION_TABLE_CANDIDATES ||
    "area_submissions,areasubmissions,submissions"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const APPLICATION_LOG_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_APPLICATION_LOG_TABLE_CANDIDATES ||
    ""  // Skip application_logs queries - table schema incompatible
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

function getFirstValue(source, keys, fallback = null) {
    if (!source) return fallback;
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return fallback;
}

function getDisplayFileNameFromPath(pathValue) {
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

const ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function compressSequentialApplyingFor(value) {
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

function isColumnOrTableError(error) {
    const message = String(error?.message || "").toLowerCase();
    return (
        message.includes("does not exist") ||
        message.includes("column") ||
        message.includes("relation")
    );
}

function toBoolean(value, fallback = false) {
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

function formatLongDate(value, fallback) {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatDateTime(value) {
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

function toDaysLeft(deadlineValue, fallback = 15) {
    if (!deadlineValue) return fallback;
    const date = new Date(deadlineValue);
    if (Number.isNaN(date.getTime())) return fallback;

    const diffMs = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 86400000));
}

function normalizeSubmissionStatus(row) {
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
    ]);
    if (submittedAt) return "submitted";

    const fileName = getFirstValue(row, [
        "file_name",
        "filename",
        "name",
        "original_file_name",
    ]);
    const fileUrl = getFirstValue(row, ["file_url", "url", "path"]);
    if (fileName || fileUrl) return "draft";

    return "empty";
}

function parseTimestamp(row) {
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

function toFriendlyLabel(value) {
    return String(value || "")
        .replace(/[_-]/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripUndefined(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined),
    );
}

function inferAreaIdFromPartId(partId) {
    if (!partId) return null;
    return String(partId).split("-")[0] || null;
}

function resolvePartAreaId(part) {
    return part?.areaId || inferAreaIdFromPartId(part?.id);
}

/**
 * Look up the actual database area_id from the frontend area identifier.
 * The frontend uses Roman numerals (I, II, III, etc.) or numeric codes (1, 2, 3, etc.),
 * but the database may store different IDs. This function matches the frontend identifier
 * (e.g., "I") to the real database area_id by checking the loaded areasData.
 *
 * @param {string} frontendAreaId - The frontend area identifier (e.g., "I", "II", "1", etc.)
 * @param {Array} areasData - The loaded areas data from the database
 * @returns {number|null} The actual database area_id, or null if not found
 */
function lookupDatabaseAreaId(frontendAreaId, areasData) {
    if (!frontendAreaId || !Array.isArray(areasData) || areasData.length === 0) {
        return null;
    }

    const frontendNum = normalizeDbAreaId(frontendAreaId); // Convert "I" to 1, "II" to 2, etc.
    if (!frontendNum) {
        console.warn('[lookupDatabaseAreaId] unable to normalize frontend area id:', frontendAreaId);
        return null;
    }



    // Try to match using the area name field (could be area_name or name depending on DB schema)
    for (const area of areasData) {
        const areaName = String(area.area_name || area.name || '');
        const dbAreaId = area.area_id || area.id;

        // Build the pattern to search for, e.g., "AREA I:" (with colon to avoid matching "AREA II")
        const romanPatternWithColon = `AREA ${frontendAreaId}:`;
        const numPatternWithColon = `AREA ${frontendNum}:`;

        if (areaName.includes(romanPatternWithColon) || areaName.includes(numPatternWithColon)) {
            return dbAreaId;
        }
    }

    console.warn('[lookupDatabaseAreaId] ✗ no match found. looking for patterns:', {
        roman: `AREA ${frontendAreaId}:`,
        numeric: `AREA ${frontendNum}:`
    });
    console.warn('[lookupDatabaseAreaId] available areas:', areasData.map(a => ({
        area_id: a.area_id || a.id,
        name: (a.area_name || a.name || '').slice(0, 50)
    })));
    return null;
}

function normalizeDbAreaId(areaId) {
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

function sanitizeFileName(fileName) {
    return String(fileName || "document")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 120);
}

function isPdfFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    return file.type === "application/pdf" || name.endsWith(".pdf");
}

function romanToNumber(value) {
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

function toAreaFolderName(areaId) {
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

function toPartFolderName(part) {
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

function normalizePartFolderName(value) {
    const match = String(value || "").match(/Part\s+([A-Za-z](?:\.\d+)?)/i);
    return match?.[1] ? match[1].toUpperCase() : "";
}

function getPartFolderNameFromPath(pathValue) {
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

function getAreaNumberFromPath(pathValue) {
    if (!pathValue) return null;
    const match = String(pathValue).match(/(?:^|[\\/])Area\s+(\d+)(?:[\\/]|$)/i);
    if (!match?.[1]) return null;

    const areaNumber = Number(match[1]);
    return Number.isInteger(areaNumber) && areaNumber > 0 ? areaNumber : null;
}

function buildTemplatePathForPart(part) {
    const areaId = resolvePartAreaId(part);
    if (!areaId || !part?.id) return null;
    return `Templates/${toAreaFolderName(areaId)}/${toPartFolderName(part)}/template.xlsx`;
}

function buildTemplatePathCandidatesForPart(part) {
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

function normalizeWhatList(raw) {
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

function toSortOrder(row, fallback = 0) {
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

function makePartFromRow(row, areaId) {
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

function stripPartMeta(part) {
    const { _parentId, _sortOrder, ...clean } = part;
    return clean;
}

function withAreaIds(areas) {
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

async function queryAllByTableCandidates(candidates) {
    for (const table of candidates) {
        const fallback = await supabase.from(table).select("*");
        if (!fallback.error && Array.isArray(fallback.data)) {
            return fallback.data;
        }
    }

    return [];
}

function buildAreasFromRows(areaRows, partRows) {
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

async function fetchAreaDefinitions() {
    // Skip database fetch - use hardcoded DEFAULT_AREAS_DATA instead
    // Database tables (area_parts, ranking_parts, etc.) don't exist yet
    return null;
}

function updatePartInAreas(areas, partId, updater) {
    return areas.map((area) => ({
        ...area,
        parts: area.parts.map((part) => {
            if (part.isGroup) {
                return {
                    ...part,
                    subparts: part.subparts.map((subpart) =>
                        subpart.id === partId ? updater(subpart) : subpart,
                    ),
                };
            }

            return part.id === partId ? updater(part) : part;
        }),
    }));
}

function buildToast(id, kind, message) {
    return { id, kind, message };
}

function mergePartWithSubmission(part, submissionRow) {
    if (!submissionRow) return part;

    // If we have a submission row in area_submissions table, it means the file was
    // successfully uploaded and registered. Default to "submitted" status.
    let status = "submitted";

    // Check if there's an explicit status field in the submission row
    const statusRaw = String(
        getFirstValue(submissionRow, ["status", "submission_status", "state"], ""),
    )
        .trim()
        .toLowerCase();

    // Override with explicit status if present
    if (statusRaw.includes("draft")) {
        status = "draft";
    } else if (statusRaw.includes("pending")) {
        status = "draft"; // Treat pending as draft
    }

    const fileUrl = getFirstValue(submissionRow, [
        "file_url",
        "download_url",
        "url",
    ]);
    const storagePath = getFirstValue(submissionRow, [
        "file_path",
        "storage_path",
        "path",
        "object_path",
    ]);
    const submissionId = getFirstValue(submissionRow, ["id", "submission_id"]);
    const file =
        getFirstValue(submissionRow, [
            "file_name",
            "filename",
            "name",
            "original_file_name",
        ]) ||
        getDisplayFileNameFromPath(storagePath) ||
        part.file;
    const dateText =
        formatDateTime(
            getFirstValue(submissionRow, [
                "submitted_at",
                "updated_at",
                "uploaded_at",
                "created_at",
            ]),
        ) || part.date;

    return {
        ...part,
        status, // "submitted" by default for rows in area_submissions
        file,
        date: dateText,
        fileUrl: fileUrl || part.fileUrl || null,
        storagePath: storagePath || part.storagePath || null,
        submissionId: submissionId || part.submissionId || null,
    };
}

/**
 * Create a mapping from database area_id to frontend area identifier.
 * Example: { 4: "I", 5: "II", 6: "III", ... }
 */
function buildAreaIdMapping(databaseAreas) {
    const mapping = {};

    for (const area of (databaseAreas || [])) {
        const dbAreaId = area.area_id || area.id;
        const areaName = String(area.area_name || area.name || '');

        // Extract "I" from "AREA I: Educational Qualifications"
        // Try multiple regex patterns to be more flexible
        let romanNumeral = null;

        // Pattern 1: "AREA I:" (with colon)
        let match = areaName.match(/AREA\s+([IVX]+):/i);
        if (match) {
            romanNumeral = match[1].toUpperCase();
        }

        // Pattern 2: "AREA I " (with space, no colon)
        if (!romanNumeral) {
            match = areaName.match(/AREA\s+([IVX]+)\s/i);
            if (match) {
                romanNumeral = match[1].toUpperCase();
            }
        }

        // Pattern 3: "AREA I" (at end or before non-letter)
        if (!romanNumeral) {
            match = areaName.match(/AREA\s+([IVX]+)(?:\s|$)/i);
            if (match) {
                romanNumeral = match[1].toUpperCase();
            }
        }

        if (romanNumeral) {
            const numericId = romanToNumber(romanNumeral);
            if (numericId) {
                mapping[dbAreaId] = romanNumeral;
            }
        }
    }

    return mapping;
}

function mergeAreasWithSubmissions(areas, submissionRows, areaIdMapping) {
    const latestByPartId = new Map();

    for (const row of submissionRows) {
        let partId = getFirstValue(row, [
            "part_id",
            "partId",
            "subpart_id",
            "subpartId",
            "criterion_id",
            "criterionId",
        ]);

        if (!partId) {
            let areaIdVal = getFirstValue(row, ["area_id", "areaId", "area"]);
            const storagePath = getFirstValue(row, [
                "file_path",
                "storage_path",
                "path",
                "object_path",
            ]);
            const pathAreaNumber = getAreaNumberFromPath(storagePath);

            // If we have an area_id mapping (database ID → frontend ID), use it
            if (areaIdMapping && areaIdVal) {
                const frontendAreaId = areaIdMapping[areaIdVal];
                if (frontendAreaId) {
                    areaIdVal = frontendAreaId;
                }
            }
            if (pathAreaNumber && (!areaIdMapping || !areaIdMapping[areaIdVal])) {
                areaIdVal = pathAreaNumber;
            }

            if (areaIdVal) {
                const matchedArea = areas.find((a) => {
                    // Try both raw comparison and normalized comparison
                    try {
                        return String(a.id) === String(areaIdVal) || String(normalizeDbAreaId(a.id || a.area_id)) === String(areaIdVal);
                    } catch (e) {
                        return String(a.area_id) === String(areaIdVal);
                    }
                });

                if (matchedArea) {
                    const leafParts = getLeafParts(matchedArea);
                    if (leafParts && leafParts.length > 0) {
                        const pathPartName = normalizePartFolderName(
                            getPartFolderNameFromPath(storagePath),
                        );
                        const matchedPart = pathPartName
                            ? leafParts.find(
                                  (leafPart) =>
                                      normalizePartFolderName(
                                          toPartFolderName(leafPart),
                                      ) === pathPartName,
                              )
                            : null;

                        partId = matchedPart?.id || leafParts[0].id;
                    }
                }
            }
        }

        if (!partId) continue;

        const key = String(partId);
        const existing = latestByPartId.get(key);
        if (!existing || parseTimestamp(row) >= parseTimestamp(existing)) {
            latestByPartId.set(key, row);
        }
    }

    return areas.map((area) => ({
        ...area,
        parts: area.parts.map((part) => {
            if (part.isGroup) {
                return {
                    ...part,
                    subparts: part.subparts.map((subpart) =>
                        mergePartWithSubmission(
                            subpart,
                            latestByPartId.get(subpart.id),
                        ),
                    ),
                };
            }

            return mergePartWithSubmission(part, latestByPartId.get(part.id));
        }),
    }));
}

function pickUserFilterCandidates(user) {
    return [
        ["user_id", user?.user_id],
        ["faculty_id", user?.user_id],
        ["uid", user?.user_id],
        ["domain_email", user?.email],
        ["email", user?.email],
        ["user_email", user?.email],
    ].filter(([, value]) => Boolean(value));
}

async function querySingleByCandidates(table, selectClause, candidates) {
    function isNumericIdLocal(val) {
        if (val === null || val === undefined) return false;
        return /^\d+$/.test(String(val).trim());
    }

    for (const [column, value] of candidates) {
        // Skip numeric id probes when value is non-numeric (avoid UUID->int mismatches)
        if (['user_id', 'faculty_id', 'uid'].includes(column) && !isNumericIdLocal(value)) {
            continue;
        }

        const result = await supabase
            .from(table)
            .select(selectClause)
            .eq(column, value)
            .maybeSingle();

        if (!result.error) return result.data;
        if (!isColumnOrTableError(result.error)) continue;
    }
    return null;
}

async function queryDepartmentName(departmentId) {
    if (!departmentId) return "";

    const result = await supabase
        .from("departments")
        .select("department_name")
        .eq("department_id", departmentId)
        .maybeSingle();

    if (!result.error) {
        return String(result.data?.department_name || "");
    }

    return "";
}

async function queryRowsByCandidates(table, selectClause, candidates) {
    for (const [column, value] of candidates) {
        try {
            // Debug probe
            // eslint-disable-next-line no-console
            console.debug(`queryRowsByCandidates: probing table=${table} column=${column} value=${value}`);

            // Skip numeric id probes when value is non-numeric to avoid 400s
            if (['user_id', 'faculty_id', 'uid'].includes(column) && !/^\d+$/.test(String(value || '').trim())) {
                // eslint-disable-next-line no-console
                console.debug(`queryRowsByCandidates: skipping column=${column} value=${value} (non-numeric)`);
                continue;
            }

            const result = await supabase
                .from(table)
                .select(selectClause)
                .eq(column, value);

            if (!result.error && Array.isArray(result.data)) {
                // eslint-disable-next-line no-console
                console.debug(`queryRowsByCandidates: matched table=${table} column=${column} rows=${(result.data||[]).length}`);
                return result.data;
            }

            if (result.error) {
                // eslint-disable-next-line no-console
                console.debug(`queryRowsByCandidates: table=${table} column=${column} error=`, result.error?.message || result.error);
            }

            if (!isColumnOrTableError(result.error)) continue;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.debug(`queryRowsByCandidates: exception for table=${table} column=${column}`, e?.message || e);
            // continue to next candidate
        }
    }
    return [];
}

async function querySingleFromTableCandidates(tableCandidates, selectClause, candidates) {
    for (const table of tableCandidates) {
        const row = await querySingleByCandidates(table, selectClause, candidates);
        if (row) {
            return { table, row };
        }

        const probe = await supabase.from(table).select("*").limit(1);
        if (!probe.error) {
            return { table, row: null };
        }
    }

    return { table: null, row: null };
}

async function queryRowsFromTableCandidates(tableCandidates, selectClause, candidates) {
    for (const table of tableCandidates) {
        const rows = await queryRowsByCandidates(table, selectClause, candidates);
        if (rows.length > 0) {
            return { table, rows };
        }

        const probe = await supabase.from(table).select("*").limit(1);
        if (!probe.error) {
            return { table, rows: [] };
        }
    }

    return { table: null, rows: [] };
}

async function queryLatestPeriodFromCandidates(tableCandidates) {
    for (const table of tableCandidates) {
        const ordered = await supabase
            .from(table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!ordered.error) {
            return { table, row: ordered.data || null };
        }

        const plain = await supabase.from(table).select("*").limit(1).maybeSingle();
        if (!plain.error) {
            return { table, row: plain.data || null };
        }
    }

    return { table: null, row: null };
}

async function querySingleByColumnCandidates(tableCandidates, selectClause, columnCandidates, value) {
    if (!value) return { table: null, row: null };

    for (const table of tableCandidates) {
        for (const column of columnCandidates) {
            const result = await supabase
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

// ── Styles ──
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
  :root {
    --gc-green:#1a6b3c;--gc-green-dark:#134f2c;--gc-green-light:#228b4e;
    --gc-green-pale:#eef7f2;--gc-gold:#c9a84c;--gc-gold-light:#e8c96b;
    --gc-gold-pale:#fdf8ec;--white:#ffffff;--off-white:#f8f7f4;
    --text-dark:#1a1a1a;--text-mid:#3a4a3e;--text-muted:#6b7c70;
    --border:#dde5df;--danger:#c0392b;--danger-pale:#fdf0ee;
    --blue:#2471a3;--blue-pale:#eaf3fb;
  }
  .hm-hero{background:linear-gradient(135deg,var(--gc-green-dark) 0%,var(--gc-green) 55%,#22704a 100%);border-radius:16px;padding:26px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(26,107,60,0.22);animation:hmFU .5s .1s ease both;}
  .hm-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:rgba(201,168,76,0.09);pointer-events:none;}
  .hm-hero-left{display:flex;align-items:center;position:relative;z-index:1;flex:1;min-width:0;}
  .hm-hero-info{min-width:0;}
  .hm-period-tag{font-size:10.5px;color:var(--gc-gold-light);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:4px;}
  .hm-name{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);font-weight:600;margin-bottom:7px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hm-rank-flow{display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap;}
  .hm-rank-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.22);border-radius:20px;padding:3px 11px;font-size:12px;color:var(--white);font-weight:500;}
  .hm-rank-chip.target{background:rgba(201,168,76,0.22);border-color:rgba(201,168,76,0.45);color:var(--gc-gold-light);}
  .hm-rank-arrow{color:rgba(255,255,255,0.45);display:flex;align-items:center;}
  .hm-status-pill{display:inline-flex;align-items:center;gap:5px;border-radius:12px;padding:3px 11px;font-size:11px;font-weight:600;}
  .hm-status-draft{background:rgba(201,168,76,0.2);border:1px solid rgba(201,168,76,0.4);color:var(--gc-gold-light);}
  .hm-dept-tag{font-size:12px;color:rgba(255,255,255,0.72);display:flex;align-items:center;gap:5px;}
  .hm-hero-right{position:relative;z-index:1;text-align:center;flex-shrink:0;}
  .hm-deadline-ring{width:96px;height:96px;position:relative;margin:0 auto 7px;}
  .hm-deadline-ring svg{width:96px;height:96px;transform:rotate(-90deg);}
  .hm-ring-bg{fill:none;stroke:rgba(255,255,255,0.12);stroke-width:7;}
  .hm-ring-fill{fill:none;stroke:var(--gc-gold);stroke-width:7;stroke-linecap:round;stroke-dasharray:251;stroke-dashoffset:63;}
  .hm-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
  .hm-ring-days{font-size:20px;font-weight:700;color:var(--white);line-height:1;}
  .hm-ring-days-label{font-size:8px;color:rgba(255,255,255,0.55);letter-spacing:1px;text-transform:uppercase;margin-top:2px;}
  .hm-deadline-copy{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;}
  .hm-deadline-label{font-size:10px;color:rgba(255,255,255,0.6);}
  .hm-deadline-date{font-size:12px;font-weight:600;color:var(--gc-gold-light);}
  /* RANK SUMMARY */
  .hm-rank-summary{background:var(--white);border-radius:12px;border:1px solid var(--border);padding:16px 20px;margin-bottom:16px;display:flex;align-items:stretch;box-shadow:0 2px 6px rgba(0,0,0,0.04);overflow:hidden;animation:hmFU .5s .15s ease both;}
  .hm-rs-item{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 20px;gap:4px;}
  .hm-rs-item:first-child{padding-left:0;}.hm-rs-item:last-child{padding-right:0;}
  .hm-rs-divider{width:1px;background:var(--border);flex-shrink:0;}
  .hm-rs-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;}
  .hm-rs-value{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:var(--text-dark);line-height:1.2;display:flex;align-items:center;gap:6px;}
  .hm-rs-sub{font-size:11px;color:var(--text-muted);margin-top:1px;}
  /* AREA LIST PANEL */
  .hm-areas-panel{background:var(--white);border-radius:14px;border:1px solid var(--border);padding:20px;box-shadow:0 2px 6px rgba(0,0,0,0.04);margin-bottom:20px;animation:hmFU .5s .25s ease both;}
  .hm-panel-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:8px;}
  .hm-panel-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:var(--text-dark);}
  .hm-panel-sub{font-size:11.5px;color:var(--text-muted);margin-top:2px;}
  .hm-badge-green{background:var(--gc-green-pale);color:var(--gc-green-dark);font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;white-space:nowrap;}
  /* AREA LIST CARDS */
  .hm-area-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
  .hm-alc{border-radius:12px;border:1.5px solid var(--border);padding:14px 16px;cursor:pointer;transition:all .18s;background:var(--off-white);display:flex;flex-direction:column;gap:6px;}
  .hm-alc:hover{border-color:var(--gc-green);background:var(--gc-green-pale);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,0.07);}
  .hm-alc.s{border-color:#a9dfbf;background:#f8fffe;}
  .hm-alc.p{border-color:var(--gc-gold);background:var(--gc-gold-pale);}
  .hm-alc.a{border-color:rgba(36,113,163,0.3);background:var(--blue-pale);cursor:default;}
  .hm-alc.a:hover{transform:none;border-color:rgba(36,113,163,0.3);background:var(--blue-pale);}
  .hm-alc-top{display:flex;align-items:center;justify-content:space-between;}
  .hm-alc-num{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--text-muted);background:var(--white);border:1px solid var(--border);padding:2px 8px;border-radius:6px;}
  .hm-alc-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;}
  .hm-alc-badge.s{background:#eafaf1;color:#1e8449;}.hm-alc-badge.p{background:var(--gc-gold-pale);color:#7d5a10;}.hm-alc-badge.e{background:#f0f0f0;color:#888;}.hm-alc-badge.a{background:var(--blue-pale);color:var(--blue);}
  .hm-alc-name{font-size:13px;font-weight:600;color:var(--text-dark);line-height:1.3;}
  .hm-alc-bottom{display:flex;align-items:center;justify-content:space-between;}
  .hm-alc-prog-text{font-size:11px;color:var(--text-muted);}
  .hm-alc-maxpts{font-size:10.5px;color:var(--text-muted);}
  .hm-alc-prog-bar{height:3px;background:var(--border);border-radius:4px;overflow:hidden;margin-top:4px;}
  .hm-alc-prog-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gc-green),var(--gc-green-light));transition:width .4s;}
  .hm-alc-hint{font-size:11px;font-weight:600;display:flex;align-items:center;gap:3px;margin-top:2px;}
  .hm-alc-hint.g{color:var(--gc-green);}.hm-alc-hint.b{color:var(--blue);}
  /* DETAIL VIEW */
  .hm-detail-back{display:flex;align-items:center;gap:8px;margin-bottom:16px;animation:hmFU .3s ease both;}
  .hm-back-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid var(--border);background:var(--white);font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:'Source Sans 3',sans-serif;transition:all .15s;}
  .hm-back-btn:hover{border-color:var(--gc-green);color:var(--gc-green);background:var(--gc-green-pale);}
  .hm-breadcrumb{font-size:12.5px;color:var(--text-muted);}
  .hm-breadcrumb strong{color:var(--gc-green-dark);}
  .hm-detail-header{background:linear-gradient(135deg,var(--gc-green-dark),var(--gc-green));border-radius:14px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;animation:hmFU .35s ease both;}
  .hm-dh-num{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gc-gold-light);margin-bottom:5px;}
  .hm-dh-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--white);line-height:1.2;}
  .hm-dh-note{font-size:12px;color:rgba(255,255,255,0.7);margin-top:5px;line-height:1.5;}
  .hm-dh-right{text-align:right;flex-shrink:0;}
  .hm-dh-pts-label{font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
  .hm-dh-pts{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--gc-gold-light);}
  /* PART CARDS */
  .hm-parts-list{display:flex;flex-direction:column;gap:12px;animation:hmFU .4s ease both;}
  .hm-pc{background:var(--white);border-radius:12px;border:1.5px solid var(--border);overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
  .hm-pc.s{border-color:#a9dfbf;}.hm-pc.d{border-color:var(--gc-gold);}.hm-pc.auto{border-color:rgba(36,113,163,0.3);}
  .hm-pc-header{display:flex;align-items:center;gap:10px;padding:13px 16px 11px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
  .hm-pc-label{font-size:13.5px;font-weight:700;color:var(--text-dark);flex:1;line-height:1.3;min-width:0;}
  .hm-pc-pts{font-size:11px;font-weight:700;color:var(--gc-green-dark);background:var(--gc-green-pale);padding:2px 9px;border-radius:7px;white-space:nowrap;flex-shrink:0;}
  .hm-pc-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px;white-space:nowrap;flex-shrink:0;}
  .hm-pc-status.s{background:#eafaf1;color:#1e8449;}.hm-pc-status.d{background:var(--gc-gold-pale);color:#7d5a10;}.hm-pc-status.e{background:#f0f0f0;color:#888;}.hm-pc-status.auto{background:var(--blue-pale);color:var(--blue);}
  .hm-pc-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px;}
  /* What to Submit rubric */
  .hm-pc-rubric{background:var(--off-white);border-radius:8px;padding:12px 14px;border-left:3px solid var(--gc-gold);}
  .hm-pc-rubric-label{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--gc-gold);margin-bottom:8px;}
  .hm-pc-rubric-list{list-style:none;display:flex;flex-direction:column;gap:4px;}
  .hm-pc-rubric-list li{font-size:12px;color:var(--text-mid);line-height:1.55;padding-left:14px;position:relative;}
  .hm-pc-rubric-list li::before{content:'▸';position:absolute;left:0;color:var(--gc-gold);font-size:9.5px;top:2px;}
  .hm-pc-rubric-list li.indent{padding-left:24px;color:var(--text-muted);}
  .hm-pc-rubric-list li.indent::before{left:10px;}
  .hm-required-file{display:flex;align-items:center;gap:8px;flex:0 1 auto;width:fit-content;max-width:min(100%,520px);padding:8px 11px;border:1px dashed rgba(26,107,60,.35);border-radius:8px;background:#f7fbf8;color:var(--text-muted);font-size:12px;}
  .hm-required-file strong{color:var(--gc-green-dark);font-weight:700;white-space:nowrap;flex-shrink:0;}
  .hm-required-file code{font-family:Consolas,'Courier New',monospace;font-size:11.5px;color:#1a1a1a;background:#fff;border:1px solid #dde5df;border-radius:6px;padding:2px 6px;flex:0 1 auto;min-width:0;max-width:min(42ch,44vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  /* Auto info */
  .hm-auto-info{background:var(--blue-pale);border:1px solid rgba(36,113,163,0.2);border-radius:8px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;}
  .hm-auto-info p{font-size:13px;color:var(--blue);line-height:1.6;}
  /* File + controls */
  .hm-pc-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .hm-btn-template{display:flex;align-items:center;gap:5px;padding:8px 13px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid var(--gc-green);background:var(--gc-green-pale);color:var(--gc-green);cursor:pointer;font-family:'Source Sans 3',sans-serif;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-template:hover{background:var(--gc-green);color:var(--white);}
  .hm-file-zone{flex:0 1 auto;min-width:0;width:fit-content;max-width:min(100%,520px);display:flex;align-items:center;gap:7px;background:#f4f7f5;border-radius:8px;padding:8px 11px;font-size:12px;color:var(--text-mid);}
  .hm-file-name{flex:0 1 auto;min-width:0;max-width:min(42ch,44vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;}
  .hm-fab{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:all .15s;flex-shrink:0;}
  .hm-fab-view{background:#e8f4fd;color:var(--blue);}.hm-fab-dl{background:var(--gc-green-pale);color:var(--gc-green);}.hm-fab-del{background:var(--danger-pale);color:var(--danger);}
  .hm-btn-attach{display:flex;align-items:center;gap:5px;padding:8px 13px;border-radius:8px;font-size:12px;font-weight:600;border:1.5px dashed var(--border);background:var(--white);cursor:pointer;font-family:'Source Sans 3',sans-serif;color:var(--text-muted);transition:all .15s;white-space:nowrap;flex:0 0 auto;width:fit-content;}
  .hm-btn-attach:hover{border-color:var(--gc-green);color:var(--gc-green);}
  .hm-btn-replace{display:flex;align-items:center;gap:5px;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:600;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-family:'Source Sans 3',sans-serif;color:var(--text-muted);transition:background .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-replace:hover{background:var(--off-white);}
  .hm-btn-submit{display:flex;align-items:center;gap:5px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:'Source Sans 3',sans-serif;background:linear-gradient(135deg,var(--gc-green),var(--gc-green-light));color:var(--white);box-shadow:0 3px 10px rgba(26,107,60,0.2);transition:opacity .15s;white-space:nowrap;flex-shrink:0;}
  .hm-btn-submit:hover:not(:disabled){opacity:0.9;}
  .hm-btn-submit:disabled{background:linear-gradient(135deg,#27ae60,#2ecc71);cursor:default;box-shadow:none;}
  .hm-pc-date{font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;}
    /* TOASTS */
    .hm-toast-wrap{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:10000;max-width:min(360px,92vw);}
    .hm-toast{display:flex;align-items:flex-start;gap:8px;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.4;box-shadow:0 10px 22px rgba(0,0,0,0.14);border:1px solid transparent;background:#fff;}
    .hm-toast.success{border-color:#a9dfbf;background:#eafaf1;color:#1e8449;}
    .hm-toast.error{border-color:#f5b7b1;background:#fef2f2;color:#c0392b;}
    .hm-toast.info{border-color:#bcd7ea;background:#eef6fc;color:#1f5f8a;}
  /* RESPONSIVE */
  @media(max-width:900px){
    .hm-area-list{grid-template-columns:1fr;}
    .hm-rank-summary{flex-wrap:wrap;}.hm-rs-divider{display:none;}.hm-rs-item{padding:0;flex:1 1 calc(50% - 12px);}
  }
  @media(max-width:640px){
    .hm-hero{padding:20px;}
    .hm-ring-days{font-size:16px;}.hm-name{font-size:17px;}.hm-rank-flow{gap:5px;}.hm-rank-chip{font-size:11px;padding:2px 8px;}
    .hm-rs-item{flex:1 1 100%;}
    .hm-detail-header{flex-direction:column;align-items:flex-start;gap:8px;}.hm-dh-right{text-align:left;}
    .hm-pc-controls{flex-direction:column;align-items:stretch;}
    .hm-required-file{max-width:100%;}
    .hm-required-file code{max-width:100%;}
    .hm-btn-template,.hm-btn-attach,.hm-btn-replace,.hm-btn-submit{justify-content:center;}
  }
  @media(max-width:411.98px){
    .hm-hero{flex-direction:column;align-items:flex-start;}
    .hm-hero-right{align-self:stretch;display:flex;align-items:center;gap:16px;text-align:left;}
    .hm-deadline-ring{width:72px;height:72px;margin:0;}.hm-deadline-ring svg{width:72px;height:72px;}
    .hm-deadline-copy{align-items:flex-start;text-align:left;gap:3px;}
    .hm-deadline-label,.hm-deadline-date{line-height:1.15;}
  }
  /* ── GROUP HEADER (isGroup parts — Area II) ── */
  .hm-part-group{border:1.5px solid #dde5df;border-radius:14px;overflow:hidden;margin-bottom:0;}
  .hm-pg-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 18px;background:#f8f7f4;border-bottom:1.5px solid #dde5df;}
  .hm-pg-label{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:#1a1a1a;}
  .hm-pg-pts{font-size:12px;font-weight:700;color:#1a6b3c;background:#eef7f2;padding:3px 10px;border-radius:8px;white-space:nowrap;}
  .hm-pg-subparts{display:flex;flex-direction:column;gap:0;}
  .hm-pg-subparts .hm-pc{border-radius:0;border-left:none;border-right:none;border-top:none;border-bottom:1px solid #f0f3f1;margin-bottom:0;}
  .hm-pg-subparts .hm-pc:last-child{border-bottom:none;}
  .hm-pg-subparts .hm-pc.s{border-left:3px solid #1a6b3c;}
  .hm-pg-subparts .hm-pc.d{border-left:3px solid #c9a84c;}
  @keyframes hmFU{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
`;

// ── Part Card — renders either a group header (isGroup) or a submission slot ──
// Group headers (Area II Parts A/B/C/D) display a title bar and nest subpart cards.
// Submission slots are the leaf nodes that have their own upload + submit controls.
function PartCard({
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
    // ── GROUP HEADER BRANCH ──
    // If this part is a group (isGroup: true), render a section header and
    // map each subpart as its own PartCard submission slot.
    if (part.isGroup) {
        return (
            <div className="hm-part-group">
                <div className="hm-pg-header">
                    <span className="hm-pg-label">{part.label}</span>
                    <span className="hm-pg-pts">{part.pts}</span>
                </div>
                <div className="hm-pg-subparts">
                    {part.subparts.map((sp) => (
                        <PartCard
                            key={sp.id}
                            part={sp}
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

    // ── SUBMISSION SLOT BRANCH (existing code below) ──
        const isDraft = part.status === "draft" || part.status === "draft-local";
        const sc = part.auto
                ? "auto"
                : part.status === "submitted"
                    ? "s"
                    : isDraft
                        ? "d"
                        : "e";
        const statusLabel = part.auto
                ? "Auto-scored"
                : part.status === "submitted"
                    ? "✓ Submitted"
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
                {/* Rubric — "What to Submit" bullets, always visible */}
                <div className="hm-pc-rubric">
                    <div className="hm-pc-rubric-label">
                        What to Submit · Scoring Criteria
                    </div>
                    <ul className="hm-pc-rubric-list">
                        {part.what.map((line, i) => (
                            <li
                                key={i}
                                className={
                                    line.startsWith("  •") ? "indent" : ""
                                }
                            >
                                {line.startsWith("  •")
                                    ? line.replace("  •", "").trim()
                                    : line}
                            </li>
                        ))}
                    </ul>
                </div>

                {part.auto ? (
                    <div className="hm-auto-info">
                        <Lock
                            size={15}
                            color="var(--blue)"
                            style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <p>
                            <strong>No file upload needed.</strong> HR scores
                            this area automatically from the student evaluation
                            CSV each semester. Your rating will appear here once
                            HR uploads the CSV for this ranking period.
                        </p>
                    </div>
                ) : !submissionOpen ? (
                    /* ── CLOSED STATE ── shown when HR has not yet opened the ranking period,
                       or after the submission deadline has passed. */
                    <>
                        {/* Still allow template download and viewing submitted files when closed */}
                        <div className="hm-pc-controls">
                            {requiredFileChip}

                            <button
                                type="button"
                                className="hm-btn-template"
                                onClick={() => onDownloadTemplate(part)}
                                disabled={isBusy}
                            >
                                <Download size={12} /> Download Template
                            </button>

                            {/* Show existing file (view/download only) if one was submitted */}
                            {(part.status === "submitted" || isDraft) && (
                                <div className="hm-file-zone">
                                    <FileText size={12} />
                                    <span className="hm-file-name">
                                        {part.file}
                                    </span>
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

                            {/* Locked submit — disabled with lock icon */}
                            <button
                                type="button"
                                className="hm-btn-submit"
                                disabled
                                style={{ opacity: 0.45, cursor: "not-allowed" }}
                            >
                                <Lock size={12} /> Submissions Closed
                            </button>
                        </div>

                        {/* Closed notice */}
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
                                <strong>
                                    Submissions are currently closed.
                                </strong>{" "}
                                The ranking period has not been opened by HR yet,
                                or the submission deadline has passed. You will
                                be notified when the next ranking period opens.
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
                        {/* Controls: Template + File + Submit */}
                        <div className="hm-pc-controls">
                            {requiredFileChip}

                            {/* Template download for this Part */}
                            <button
                                type="button"
                                className="hm-btn-template"
                                onClick={() => onDownloadTemplate(part)}
                                disabled={isBusy}
                            >
                                <Download size={12} /> Download Template
                            </button>

                            {/* File slot */}
                            {part.status === "submitted" || isDraft ? (
                                <>
                                    <div className="hm-file-zone">
                                        <FileText size={12} />
                                        <span className="hm-file-name">
                                            {part.file || "Attached draft"}
                                        </span>
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
                                        {isDraft && (
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
                                    {/* Replace button for submitted files */}
                                    {part.status === "submitted" && (
                                        <button
                                            type="button"
                                            className="hm-btn-replace"
                                            onClick={() => onReplaceFile(part)}
                                            disabled={isBusy}
                                        >
                                            <RefreshCw size={11} /> Replace
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

                            {/* Submit button */}
                            {part.status === "submitted" ? (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    disabled
                                >
                                    <CheckCircle size={12} /> Submitted
                                </button>
                                                        ) : isDraft ? (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    onClick={() => onSubmitPart(part)}
                                    disabled={isBusy}
                                >
                                    <Send size={12} /> Submit Part
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="hm-btn-submit"
                                    disabled
                                    style={{
                                        opacity: 0.4,
                                        cursor: "not-allowed",
                                    }}
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

// ── Area List Card (Level 1) ──
function AreaListCard({ area, onClick }) {
    const st = getAreaStatus(area);
    const { done, total } = getProgress(area);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const badgeText =
        st === "submitted"
            ? "Complete"
            : st === "progress"
              ? "In Progress"
              : st === "auto"
                ? "Auto-scored"
                : "Pending";
    const cls =
        st === "submitted"
            ? "s"
            : st === "progress"
              ? "p"
              : st === "auto"
                ? "a"
                : "";

    return (
        <div
            className={`hm-alc ${cls}`}
            onClick={st !== "auto" ? onClick : undefined}
        >
            <div className="hm-alc-top">
                <span className="hm-alc-num">Area {area.id}</span>
                <span
                    className={`hm-alc-badge ${st === "submitted" ? "s" : st === "progress" ? "p" : st === "auto" ? "a" : "e"}`}
                >
                    {badgeText}
                </span>
            </div>
            <div className="hm-alc-name">{area.name}</div>
            {st !== "auto" && (
                <>
                    <div className="hm-alc-bottom">
                        <span className="hm-alc-prog-text">
                            {done} of {total} part{total !== 1 ? "s" : ""}{" "}
                            submitted
                        </span>
                        <span className="hm-alc-maxpts">
                            Max {area.maxPts} pts
                        </span>
                    </div>
                    <div className="hm-alc-prog-bar">
                        <div
                            className="hm-alc-prog-fill"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="hm-alc-hint g">
                        Open Area {area.id} <ArrowRight size={11} />
                    </div>
                </>
            )}
            {st === "auto" && (
                <div className="hm-alc-hint b">
                    <Info size={11} /> Scored by HR · no upload needed · Max{" "}
                    {area.maxPts} pts
                </div>
            )}
        </div>
    );
}

// ── Main Export ──
export default function Home({ user }) {
    const userId = user?.user_id || null;
    const userEmail = user?.email || null;
    const [facultyRecordId, setFacultyRecordId] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();

    const [view, setView] = useState("list");
    const [openAreaId, setOpenAreaId] = useState(null);

    useEffect(() => {
        try {
            const areaParam = searchParams.get("area");
            if (areaParam) {
                setOpenAreaId(areaParam);
                setView("detail");
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (e) {
            // ignore
        }
        // run only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [areasData, setAreasData] = useState(DEFAULT_AREAS_DATA);
    const [databaseAreas, setDatabaseAreas] = useState([]); // Store actual areas table from database
    const [submissionOpen, setSubmissionOpen] = useState(false);
    const [periodInfo, setPeriodInfo] = useState({
        id: null,
        label: DEFAULT_PERIOD_LABEL,
        deadlineLabel: DEFAULT_DEADLINE_LABEL,
        daysLeft: 0,
    });
    const [profileInfo, setProfileInfo] = useState({
        currentRank: "Not set",
        department: "Not set",
        firstName: "FirstName",
        lastName: "LastName",
        applyingFor: "Not set",
    });
    const [applicationInfo, setApplicationInfo] = useState({
        id: null,
        targetRank: "Not set",
        status: "Not started",
    });
    const [partActionMap, setPartActionMap] = useState({});
    const [toasts, setToasts] = useState([]);
    const [resolvedTables, setResolvedTables] = useState({
        applications: APPLICATION_TABLE_CANDIDATES[0] || "applications",
        areaSubmissions:
            AREA_SUBMISSION_TABLE_CANDIDATES[0] || "area_submissions",
        applicationLogs:
            APPLICATION_LOG_TABLE_CANDIDATES[0] || "application_logs",
    });
    const [resolvedCycleTable, setResolvedCycleTable] = useState(CYCLE_TABLE_CANDIDATES[0] || "ranking_cycles");

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

    const patchPartLocal = (partId, updater) => {
        setAreasData((prev) => updatePartInAreas(prev, partId, updater));
    };

    const refreshSubmissionWindow = useCallback(async () => {
        const periodResult = await queryLatestPeriodFromCandidates(CYCLE_TABLE_CANDIDATES);

        let nextSubmissionOpen = false;
        let nextPeriodInfo = {
            id: null,
            label: DEFAULT_PERIOD_LABEL,
            deadlineLabel: DEFAULT_DEADLINE_LABEL,
            daysLeft: 0,
        };

        if (periodResult.row) {
            const period = periodResult.row;
            const deadline = getFirstValue(period, [
                "deadline",
                "deadline_at",
                "submission_deadline",
                "end_date",
                "closing_date",
            ]);
            const periodStatus = String(getFirstValue(period, ["status", "cycle_status", "state"], "")).toLowerCase();

            if (periodStatus === 'submissions_closed' || periodStatus === 'finished') {
                nextSubmissionOpen = false;
            } else if (periodStatus === 'open') {
                nextSubmissionOpen = true;
            } else {
                nextSubmissionOpen = toBoolean(
                    getFirstValue(period, ["submission_open", "is_open", "open"], periodStatus),
                    false,
                );
            }

            nextPeriodInfo = {
                id: getFirstValue(period, ["id", "cycle_id"], null),
                label: String(
                    getFirstValue(
                        period,
                        ["cycle", "cycle_name", "name"],
                        nextSubmissionOpen ? "Open Ranking Period" : DEFAULT_PERIOD_LABEL,
                    ),
                ),
                deadlineLabel: formatLongDate(deadline, DEFAULT_DEADLINE_LABEL),
                daysLeft: toDaysLeft(deadline, 15),
            };
        }

        if (periodResult.table) {
            setResolvedCycleTable(periodResult.table);
        }

        setSubmissionOpen(nextSubmissionOpen);
        setPeriodInfo(nextPeriodInfo);
    }, []);

    const openUrl = (url, downloadName = null) => {
        if (!url) return;
        if (downloadName) {
            const a = document.createElement("a");
            a.href = url;
            a.download = downloadName;
            a.target = "_blank";
            a.rel = "noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        window.open(url, "_blank", "noopener,noreferrer");
    };

    const getPartFileUrl = async (part) => {
        const directUrl = part.fileUrl;
        if (directUrl && /^(https?:|blob:)/i.test(directUrl)) {
            return directUrl;
        }

        if (part.storagePath) {
            const signed = await supabase.storage
                .from(SUBMISSIONS_BUCKET)
                .createSignedUrl(part.storagePath, 3600);
            if (!signed.error && signed.data?.signedUrl) {
                return signed.data.signedUrl;
            }
        }

        return null;
    };

    const pickSingleFile = (onFile) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf";
        input.style.display = "none";
        input.id = "file-upload-input";
        input.name = "file-upload";
        const cleanup = () => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        };
        input.onchange = (event) => {
            const file = event.target?.files?.[0] || null;
            onFile(file);
            cleanup();
        };
        input.oncancel = cleanup;
        document.body.appendChild(input);
        input.click();
    };

    const resolveActivePeriodId = async () => {
        if (periodInfo.id) return periodInfo.id;

        const statusColumns = ["status", "state", "cycle_status"];
        for (const table of CYCLE_TABLE_CANDIDATES) {
            for (const statusColumn of statusColumns) {
                try {
                    const openPeriod = await supabase
                        .from(table)
                        .select("*")
                        .eq(statusColumn, "open")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!openPeriod.error && openPeriod.data) {
                        return getFirstValue(openPeriod.data, ["cycle_id", "id"], null);
                    }

                    if (openPeriod.error && !isColumnOrTableError(openPeriod.error)) {
                        break;
                    }
                } catch (e) {
                    // ignore and continue
                }
            }
        }

        const fallbackPeriod = await queryLatestPeriodFromCandidates(CYCLE_TABLE_CANDIDATES);
        if (!fallbackPeriod.row) return null;
        return getFirstValue(fallbackPeriod.row, ["cycle_id", "id"], null);
    };

    const writeSubmissionRow = async ({ part, storagePath, appId }) => {
        const nowIso = new Date().toISOString();
        const activePeriodId = await resolveActivePeriodId();

        // Get the frontend area identifier (e.g., "I" from part ID "I-A")
        const frontendAreaId = resolvePartAreaId(part);

        // Look up the actual database area_id using the database areas
        let areaId = lookupDatabaseAreaId(frontendAreaId, databaseAreas);

        if (!areaId) {
            // Fallback: use old conversion (Roman to number) for backward compatibility
            areaId = normalizeDbAreaId(frontendAreaId);
        }

        if (!areaId) {
            console.warn('writeSubmissionRow: unable to resolve numeric area_id for part', part.id, 'candidate:', resolvePartAreaId(part));
            return null;
        }
        // Adjust payloads to match detected `area_submissions` schema.
        // Detected keys include: submission_id, application_id, area_id, file_path, uploaded_at
        const submitterId = facultyRecordId || null;

        const base = {
            area_id: areaId,
            cycle_id: activePeriodId || null,
            file_path: storagePath,
            uploaded_at: nowIso,
            user_id: submitterId,
        };

        if (appId) base.application_id = appId;

        const payloadVariants = [stripUndefined(base)];

        let saved = null;

        // Try update by known submissionId (submission_id or id)
        if (part.submissionId) {
            for (const payload of payloadVariants) {
                const result = await supabase
                    .from(resolvedTables.areaSubmissions)
                    .update(payload)
                    .eq("submission_id", part.submissionId)
                    .select("*")
                    .maybeSingle();
                if (!result.error) {
                    saved = result.data;
                    break;
                }
                // try fallback to eq id
                const tryAlt = await supabase
                    .from(resolvedTables.areaSubmissions)
                    .update(payload)
                    .eq("id", part.submissionId)
                    .select("*")
                    .maybeSingle();
                if (!tryAlt.error) {
                    saved = tryAlt.data;
                    break;
                }
            }
        }

        // Before inserting, try to find an existing submission row and update it
        if (!saved) {
            let existing = null;

            // 1) Try to find by exact file path (common when reloading)
            const fileCols = ["file_path", "storage_path", "path", "object_path"];
            for (const col of fileCols) {
                try {
                    const probe = await supabase
                        .from(resolvedTables.areaSubmissions)
                        .select("*")
                        .eq(col, storagePath)
                        .maybeSingle();
                    if (!probe.error && probe.data) {
                        existing = probe.data;
                        break;
                    }
                    if (probe.error && !isColumnOrTableError(probe.error)) break;
                } catch (e) {
                    // ignore and continue
                }
            }

            // 2) If not found by file_path, try to find by application+area+user (idempotent per-user per-area)
            if (!existing && appId && submitterId) {
                const appCols = ["application_id", "applicationId", "app_id", "application"];
                const areaCols = ["area_id", "areaId", "area"];
                const userCols = ["user_id", "faculty_id", "uid", "user"];
                const periodColumnCandidates = activePeriodId
                    ? ["cycle_id", "ranking_cycle_id", "cycleId"]
                    : [null];
                outer: for (const aCol of appCols) {
                    for (const arCol of areaCols) {
                        for (const uCol of userCols) {
                            for (const cCol of periodColumnCandidates) {
                                try {
                                    let probeQuery = supabase
                                        .from(resolvedTables.areaSubmissions)
                                        .select("*")
                                        .eq(aCol, appId)
                                        .eq(arCol, areaId)
                                        .eq(uCol, submitterId);
                                    if (cCol) {
                                        probeQuery = probeQuery.eq(cCol, activePeriodId);
                                    }

                                    const probe = await probeQuery.maybeSingle();
                                    if (!probe.error && probe.data) {
                                        existing = probe.data;
                                        break outer;
                                    }
                                    if (probe.error && !isColumnOrTableError(probe.error)) break outer;
                                } catch (e) {
                                    // ignore and continue
                                }
                            }
                        }
                    }
                }
            }

            // If we found an existing row, update it instead of inserting a duplicate
            if (existing) {
                try { console.debug('writeSubmissionRow: existing row detected', existing); } catch (e) {}
                const idVal = getFirstValue(existing, ["submission_id", "id"]);
                for (const payload of payloadVariants) {
                    try {
                        const upd = await supabase
                            .from(resolvedTables.areaSubmissions)
                            .update(payload)
                            .eq("submission_id", idVal)
                            .select("*")
                            .maybeSingle();
                        if (!upd.error) {
                            saved = upd.data;
                            break;
                        }
                        const updAlt = await supabase
                            .from(resolvedTables.areaSubmissions)
                            .update(payload)
                            .eq("id", idVal)
                            .select("*")
                            .maybeSingle();
                        if (!updAlt.error) {
                            saved = updAlt.data;
                            break;
                        }
                    } catch (e) {
                        // ignore and try next payload variant
                    }
                }
            }

            // If still not saved, fallback to inserting
            if (!saved) {
                try { console.debug('writeSubmissionRow: no existing row found — will attempt insert for', storagePath); } catch (e) {}
                for (const payload of payloadVariants) {
                    const result = await supabase
                        .from(resolvedTables.areaSubmissions)
                        .insert([payload])
                        .select("*")
                        .maybeSingle();
                    if (!result.error) {
                        saved = result.data;
                        break;
                    } else {
                        console.warn('writeSubmissionRow: insert variant failed:', result.error?.message || result.error);
                    }
                }
            }
        }

        if (!saved) {
            console.warn('writeSubmissionRow: all insert variants failed');
        }

        return saved;
    };

    const deleteSubmissionRow = async (part) => {
        if (part.submissionId) {
            const byIdResult = await supabase
                .from(resolvedTables.areaSubmissions)
                .delete()
                .eq("id", part.submissionId);
            if (!byIdResult.error) return true;
        }

        const partColumns = [
            "part_id",
            "partId",
            "subpart_id",
            "subpartId",
            "criterion_id",
            "criterionId",
        ];
        const userPairs = [
            ["user_id", facultyRecordId],
            ["faculty_id", facultyRecordId],
            ["uid", facultyRecordId],
            ["email", userEmail],
            ["user_email", userEmail],
        ].filter(([, value]) => Boolean(value));
        const periodColumnPairs = [
            ["cycle_id", periodInfo.id],
            ["ranking_cycle_id", periodInfo.id],
            ["cycleId", periodInfo.id],
        ].filter(([, value]) => Boolean(value));

        for (const partColumn of partColumns) {
            const scopedPairs = [
                ...userPairs.slice(0, 1),
                ...periodColumnPairs.slice(0, 1),
            ];

            const attempts = [scopedPairs, userPairs.slice(0, 1), []];
            for (const pairs of attempts) {
                let query = supabase
                    .from(resolvedTables.areaSubmissions)
                    .delete()
                    .eq(partColumn, part.id);
                for (const [column, value] of pairs) {
                    query = query.eq(column, value);
                }

                const result = await query;
                if (!result.error) return true;
                if (!isColumnOrTableError(result.error)) return false;
            }
        }

        return false;
    };

    const ensureApplicationExists = async () => {
        const activePeriodId = await resolveActivePeriodId();

        // If application already exists, return it
        if (applicationInfo.id) return applicationInfo.id;

        // If no ranking period or faculty record, cannot create application
        if (!activePeriodId || !facultyRecordId) {
            console.warn('ensureApplicationExists: cannot create - missing ranking period or facultyRecordId');
            return null;
        }

        // Build required fields: application_number, target_position_id
        const appNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        let targetPositionId = null;

        try {
            const positionsTable =
                resolvedTables.positions || POSITION_TABLE_CANDIDATES[0] || 'positions';

            if (positionsTable) {
                // Try to fetch an existing position
                const posResp = await supabase
                    .from(positionsTable)
                    .select('position_id')
                    .limit(1)
                    .maybeSingle();
                if (!posResp.error && posResp.data) {
                    targetPositionId = posResp.data.position_id || posResp.data.id || null;
                }

                // If none exists, create a default position record
                if (!targetPositionId) {
                    try {
                        const ins = await supabase
                            .from(positionsTable)
                            .insert([
                                {
                                    position_name: 'Instructor I',
                                    description: 'Default position created by frontend',
                                    required_area_count: 10,
                                    is_active: true,
                                },
                            ])
                            .select('position_id')
                            .single();
                        if (!ins.error && ins.data) {
                            targetPositionId = ins.data.position_id || ins.data.id || null;
                            console.log('ensureApplicationExists: created default position', targetPositionId);
                        }
                    } catch (ie) {
                        console.warn('ensureApplicationExists: failed to create default position', ie?.message || ie);
                    }
                }
            }
        } catch (e) {
            console.warn('ensureApplicationExists: failed to fetch default position', e?.message || e);
        }

        // If still no position id, leave null (DB requires it, so insert may fail and will be caught)
        try {
            const payload = {
                application_number: appNumber,
                faculty_id: facultyRecordId,
                cycle_id: activePeriodId,
                status: 'Draft',
                current_rank_at_time: profileInfo.currentRank || null,
                created_at: new Date().toISOString(),
            };
            if (targetPositionId) payload.target_position_id = targetPositionId;

            const { data, error } = await supabase
                .from(resolvedTables.applications)
                .insert([payload])
                .select('*')
                .single();

            if (!error && data) {
                const appId = data.application_id || data.id || null;
                if (appId) {
                    console.log('ensureApplicationExists: created new application', appId);
                    // Update local state
                    setApplicationInfo(prev => ({
                        ...prev,
                        id: appId,
                        status: 'Draft',
                    }));
                    return appId;
                }
            }

            console.warn('ensureApplicationExists: insert failed', error?.message || error, data);
            return null;
        } catch (e) {
            console.warn('ensureApplicationExists: error', e?.message || e);
            return null;
        }
    };

    const persistSubmissionRow = async (part, storagePath) => {

        // Get the frontend area identifier (e.g., "I" from part ID "I-A")
        const frontendAreaId = resolvePartAreaId(part);

        // Look up the actual database area_id using the database areas
        let areaId = lookupDatabaseAreaId(frontendAreaId, databaseAreas);

        if (!areaId) {
            // Fallback: use old conversion (Roman to number) for backward compatibility
            areaId = normalizeDbAreaId(frontendAreaId);
            console.warn('◆ persistSubmissionRow: database lookup failed, falling back to Roman conversion:', areaId);
        }

        // Auto-create application if it doesn't exist
        let appId = applicationInfo.id;
        if (!appId) {
            appId = await ensureApplicationExists();
        }

        if (!appId) {
            console.warn('persistSubmissionRow: no application_id resolved for current faculty user');
            pushToast('error', 'No application record was found for this account. Contact HR to create the application first.');
            return null;
        }
        // Try to POST metadata to the backend upload endpoint (recommended)
        const backendUrl = import.meta.env.VITE_BACKEND_UPLOAD_URL || 'http://localhost:3001';
        const uploadEndpoint = `${backendUrl.replace(/\/$/, '')}/api/uploads`;
        const backendKey = import.meta.env.VITE_BACKEND_UPLOAD_KEY || '';

        let saved = null;

        try {
            const activePeriodId = await resolveActivePeriodId();
            const body = {
                application_id: appId,
                area_id: areaId,
                cycle_id: activePeriodId || null,
                file_path: storagePath,
                csv_total_average_rate: null,
                part_id: part.id || null,
                uploaded_at: new Date().toISOString(),
                user_id: facultyRecordId || null,
                email: userEmail || null,
            };

            try { console.debug('persistSubmissionRow: POST body', body, 'periodInfo=', periodInfo); } catch (e) {}

            const headers = { 'Content-Type': 'application/json' };
            if (backendKey) headers['x-upload-key'] = backendKey;



            const resp = await fetch(uploadEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (resp.ok) {
                const json = await resp.json();
                saved = json.data || null;
            } else {
                let bodyText = null;
                try {
                    bodyText = await resp.text();
                } catch (e) {
                    bodyText = String(e?.message || e);
                }
                // eslint-disable-next-line no-console
                console.warn('◆ persistSubmissionRow: backend error', resp.status, bodyText);
                // For client errors (400-499) do not attempt fallback — surface to user.
                if (resp.status >= 400 && resp.status < 500) {
                    pushToast('error', `Upload registration failed: ${bodyText || resp.status}`);
                    return null;
                }
                pushToast('error', `Upload registration failed (${resp.status}). Trying fallback...`);
                if (resp.status === 403) {
                    console.warn('Upload rejected: backend expects an upload key. Set VITE_BACKEND_UPLOAD_KEY to match BACKEND_UPLOAD_KEY on the backend.');
                }
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('◆ persistSubmissionRow: fetch threw error:', e?.message || e);
            pushToast('error', `Upload registration network error: ${e?.message || e}`);
        }

        if (!saved) {
            try {
                saved = await writeSubmissionRow({
                    part,
                    storagePath,
                    appId,
                });
                if (saved) {
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('◆ persistSubmissionRow: direct DB write failed:', e?.message || e);
                pushToast('error', `Failed to register submission in database: ${e?.message || e}`);
            }
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

        const uploadResult = await supabase.storage
            .from(SUBMISSIONS_BUCKET)
            .upload(storagePath, file, { upsert: true });
        if (uploadResult.error) {
            console.error('uploadFileForPart: storage upload failed:', uploadResult.error);
            throw uploadResult.error;
        }

        const signed = await supabase.storage
            .from(SUBMISSIONS_BUCKET)
            .createSignedUrl(storagePath, 3600);
        const fileUrl = signed.data?.signedUrl || null;
        const nowText = formatDateTime(new Date().toISOString()) || part.date;
        // Persist submission row and attach submissionId when possible
        let saved = null;
        try {
            saved = await persistSubmissionRow(part, storagePath);
            if (!saved) {
                console.warn('uploadFileForPart: persistSubmissionRow returned no row (but did not throw)');
            }
        } catch (e) {
            console.warn('uploadFileForPart: persistSubmissionRow threw error:', e?.message || e);
        }

        patchPartLocal(part.id, (prev) => ({
            ...prev,
            status: nextStatus,
            file: file.name,
            date: nowText,
            fileUrl,
            storagePath,
            submissionId: getFirstValue(saved, ['submission_id', 'id'], prev.submissionId || null),
        }));

        return { storagePath, fileUrl, saved };
    };

    // Save a draft locally without uploading to storage.
    const saveDraftLocally = (part, file) => {
        const previewUrl = file ? URL.createObjectURL(file) : null;
        patchPartLocal(part.id, (prev) => ({
            ...prev,
            status: 'draft-local',
            file: file ? file.name : prev.file,
            fileObject: file || null,
            fileUrl: previewUrl || prev.fileUrl,
            storagePath: null,
        }));
    };

    const handleDownloadTemplate = async (part) => {
        const templatePaths = buildTemplatePathCandidatesForPart(part);
        if (templatePaths.length === 0) return;

        setPartAction(part.id, "template");
        try {
            for (const templatePath of templatePaths) {
                const signed = await supabase.storage
                    .from(TEMPLATE_BUCKET)
                    .createSignedUrl(templatePath, 600);

                if (!signed.error && signed.data?.signedUrl) {
                    openUrl(signed.data.signedUrl);
                    pushToast("success", "Template download is ready.");
                    return;
                }
            }

            pushToast(
                "error",
                "Template file is not available yet for this part.",
            );
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleViewFile = async (part) => {
        setPartAction(part.id, "view");
        try {
            const url = await getPartFileUrl(part);
            if (!url) {
                pushToast(
                    "error",
                    "Unable to locate the uploaded file for this part.",
                );
                return;
            }
            openUrl(url);
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleDownloadFile = async (part) => {
        setPartAction(part.id, "download");
        try {
            const url = await getPartFileUrl(part);
            if (!url) {
                pushToast(
                    "error",
                    "Unable to locate the uploaded file for this part.",
                );
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
                pushToast("error", "Please attach a PDF file.");
                return;
            }

            // Keep attach local — upload only when user submits the part.
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
        pickSingleFile(async (file) => {
            if (!file) return;

            if (!isPdfFile(file)) {
                pushToast("error", "Please attach a PDF file.");
                return;
            }

            setPartAction(part.id, "replace");
            try {
                // If there's already an uploaded file (storagePath present), replace remotely.
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
                    // Otherwise replace the local draft file only.
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

            const deleted = await deleteSubmissionRow(part);
            if (!deleted) {
                pushToast("error", "Unable to remove draft right now.");
                return;
            }

            if (part.storagePath) {
                await supabase.storage
                    .from(SUBMISSIONS_BUCKET)
                    .remove([part.storagePath]);
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
        } catch {
            pushToast("error", "Unable to remove draft right now.");
        } finally {
            setPartAction(part.id, null);
        }
    };

    const handleSubmitPart = async (part) => {
        // Allow submitting either an already-uploaded draft or a locally attached draft.
        if (!part) return;
        const isLocalDraft = part.fileObject && !part.storagePath;
        const isRemoteDraft = part.status === "draft" && part.storagePath;
        if (!isLocalDraft && !isRemoteDraft && part.status !== "draft-local") return;

        setPartAction(part.id, "submit");
        try {
            const nowIso = new Date().toISOString();

            // If there's a local file object, upload it now (this will also write the submission row).
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
                    }));
                }
            } else if (isRemoteDraft) {
                // If already uploaded as draft, promote to submitted by writing the log and updating status.
                let saved = null;
                if (!part.submissionId) {
                    saved = await persistSubmissionRow(part, part.storagePath);
                }
                await supabase.from(resolvedTables.applicationLogs).insert([
                    stripUndefined({
                        user_id: facultyRecordId,
                        cycle_id: periodInfo.id,
                        area_id: resolvePartAreaId(part),
                        part_id: part.id,
                        action: "submitted",
                        file_name: part.file || `${part.id}.pdf`,
                        timestamp: nowIso,
                        created_at: nowIso,
                    }),
                ]);

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
                // local draft but without fileObject (shouldn't normally happen) — treat as error
                throw new Error('No local file to upload');
            }

            pushToast("success", "Part submitted successfully.");
        } catch (e) {
            console.error(e);
            pushToast("error", "Unable to submit this part right now.");
        } finally {
            setPartAction(part.id, null);
        }
    };

    useEffect(() => {
        let isActive = true;

        const hydrateHome = async () => {
            // Load the actual database areas table (for area_id lookup during uploads)
            let loadedDatabaseAreas = []; // Capture locally to use immediately
            try {
                const { data: dbAreasData, error: dbAreasError } = await supabase
                    .from('areas')
                    .select('*');
                if (!dbAreasError && Array.isArray(dbAreasData) && dbAreasData.length > 0) {
                    loadedDatabaseAreas = dbAreasData; // Capture for use in hydration
                    if (isActive) {
                        setDatabaseAreas(dbAreasData); // Also update state for future uploads
                    }
                } else {
                    console.warn('[hydrateHome] failed to load areas from database:', dbAreasError);
                }
            } catch (e) {
                console.warn('[hydrateHome] exception loading areas:', e.message);
            }

            const backendAreas = await fetchAreaDefinitions();
            const baseAreas =
                Array.isArray(backendAreas) && backendAreas.length > 0
                    ? backendAreas
                    : DEFAULT_AREAS_DATA;

            if (!userId && !userEmail) {
                if (!isActive) return;
                setAreasData(baseAreas);
                return;
            }

            const candidates = pickUserFilterCandidates({
                user_id: userId,
                email: userEmail,
            });

            let nextSubmissionOpen = false;
            let nextPeriodInfo = {
                id: null,
                label: DEFAULT_PERIOD_LABEL,
                deadlineLabel: DEFAULT_DEADLINE_LABEL,
                daysLeft: 0,
            };

            const periodResult = await queryLatestPeriodFromCandidates(
                CYCLE_TABLE_CANDIDATES,
            );

            if (periodResult.table && isActive) {
                setResolvedCycleTable(periodResult.table);
            }

            if (periodResult.row) {
                const period = periodResult.row;
                const deadline = getFirstValue(period, [
                    "deadline",
                    "deadline_at",
                    "submission_deadline",
                    "end_date",
                    "closing_date",
                ]);
                const periodStatus = getFirstValue(period, [
                    "status",
                    "state",
                    "cycle_status",
                ], "");

                // Check ranking period status to determine if submissions are open:
                // - 'open' → submissions allowed
                // - 'submissions_closed' or 'finished' → submissions blocked
                // - Falls back to old fields for backward compatibility
                if (periodStatus === 'submissions_closed' || periodStatus === 'finished') {
                    nextSubmissionOpen = false;
                } else if (periodStatus === 'open') {
                    nextSubmissionOpen = true;
                } else {
                    // Fallback to submission_open/is_open/open fields for backward compatibility
                    nextSubmissionOpen = toBoolean(
                        getFirstValue(period, [
                            "submission_open",
                            "is_open",
                            "open",
                        ], periodStatus),
                        false,
                    );
                }

                nextPeriodInfo = {
                    id: getFirstValue(period, ["id", "cycle_id"], null),
                    label: String(
                        getFirstValue(
                            period,
                            ["cycle", "cycle_name", "name"],
                            nextSubmissionOpen ? "Open Ranking Period" : DEFAULT_PERIOD_LABEL,
                        ),
                    ),
                    deadlineLabel: formatLongDate(deadline, DEFAULT_DEADLINE_LABEL),
                    daysLeft: toDaysLeft(deadline, 15),
                };
            }

            if (!isActive) return;
            setSubmissionOpen(nextSubmissionOpen);
            setPeriodInfo(nextPeriodInfo);
            try { console.debug('[hydrateHome] Setting periodInfo:', nextPeriodInfo); } catch (e) {}

            let profileRow = null;
            let numericFacultyId = null;
            let applicationRow = null;
            let nextResolvedTables = {
                applications: APPLICATION_TABLE_CANDIDATES[0] || "applications",
                areaSubmissions: AREA_SUBMISSION_TABLE_CANDIDATES[0] || "area_submissions",
                applicationLogs: APPLICATION_LOG_TABLE_CANDIDATES[0] || "application_logs",
            };
            let positionRow = null;

            try {
                const profileResult = await querySingleFromTableCandidates(
                    PROFILE_TABLE_CANDIDATES,
                    "*",
                    candidates,
                );
                profileRow = profileResult.row;

                if (profileRow && isActive) {
                    const resolvedFirstName = String(
                        getFirstValue(
                            profileRow,
                            ["name_first", "first_name", "firstname", "given_name", "firstName"],
                            user?.user_metadata?.first_name || user?.user_metadata?.given_name || "FirstName",
                        ),
                    );
                    const resolvedLastName = String(
                        getFirstValue(
                            profileRow,
                            ["name_last", "last_name", "lastname", "surname", "family_name", "lastName"],
                            user?.user_metadata?.last_name || user?.user_metadata?.family_name || "LastName",
                        ),
                    );
                    const resolvedDepartmentId = getFirstValue(profileRow, ["department_id"], null);
                    const resolvedDepartmentName = await queryDepartmentName(resolvedDepartmentId);
                    const rawApplyingFor = getFirstValue(profileRow, ["applying_for_json", "applying_for"], null);
                    const resolvedApplyingFor = compressSequentialApplyingFor(rawApplyingFor);
                    const resolvedCurrentPosition = String(
                        getFirstValue(
                            profileRow,
                            ["current_rank", "rank", "faculty_rank"],
                            "",
                        ),
                    ).trim();

                    setProfileInfo({
                        currentRank: String(
                            getFirstValue(
                                profileRow,
                                [
                                    "current_rank",
                                    "rank",
                                    "position_rank",
                                    "faculty_rank",
                                ],
                                "Not set",
                            ),
                        ),
                        department: resolvedDepartmentName || String(
                            getFirstValue(
                                profileRow,
                                [
                                    "department",
                                    "department_name",
                                    "dept",
                                    "college_department",
                                ],
                                "Not set",
                            ),
                        ),
                        firstName: resolvedFirstName,
                        lastName: resolvedLastName,
                        applyingFor: resolvedApplyingFor || resolvedCurrentPosition || "",
                    });

                    const resolvedFacultyId = getFirstValue(profileRow, ["user_id", "id"], null);
                    numericFacultyId = resolvedFacultyId === null || resolvedFacultyId === undefined
                        ? null
                        : Number(resolvedFacultyId);
                    setFacultyRecordId(Number.isFinite(numericFacultyId) ? numericFacultyId : null);
                }

                const applicationCandidates = Number.isFinite(numericFacultyId)
                    ? [["faculty_id", numericFacultyId]]
                    : [];
                const applicationResult = await querySingleFromTableCandidates(
                    APPLICATION_TABLE_CANDIDATES,
                    "*",
                    applicationCandidates,
                );
                applicationRow = applicationResult.row;

                nextResolvedTables = {
                    applications:
                        applicationResult.table ||
                        APPLICATION_TABLE_CANDIDATES[0] ||
                        "applications",
                    areaSubmissions:
                        AREA_SUBMISSION_TABLE_CANDIDATES[0] || "area_submissions",
                    applicationLogs:
                        APPLICATION_LOG_TABLE_CANDIDATES[0] || "application_logs",
                };

                const positionId = getFirstValue(applicationRow, [
                    "position_id",
                    "target_position_id",
                    "rank_position_id",
                ]);

                if (positionId) {
                    try {
                        const positionResult = await querySingleByColumnCandidates(
                            POSITION_TABLE_CANDIDATES,
                            "*",
                            ["id", "position_id"],
                            positionId,
                        );

                        positionRow = positionResult.row;
                    } catch (pe) {
                        // eslint-disable-next-line no-console
                        console.debug('hydrate: position query failed', pe?.message || pe);
                    }
                }
            } catch (e) {
                // Ensure hydrate proceeds even if profile/application/position queries fail
                // eslint-disable-next-line no-console
                console.debug('hydrate: profile/application/position resolution failed, continuing:', e?.message || e);
            }

            if (applicationRow && isActive) {
                const resolvedTargetRank = String(
                    getFirstValue(
                        applicationRow,
                        ["target_rank", "applying_for"],
                        getFirstValue(positionRow, ["name", "position_name", "rank", "title"], profileInfo.applyingFor || ""),
                    ),
                );

                setApplicationInfo({
                    id: getFirstValue(applicationRow, ["id", "application_id"], null),
                    targetRank: resolvedTargetRank,
                    status: String(
                        getFirstValue(
                            applicationRow,
                            ["status", "application_status"],
                            "Not started",
                        ),
                    ),
                });
            }

            const submissionCandidates = pickUserFilterCandidates({ user_id: numericFacultyId, email: userEmail });
            let submissionRows = [];
            let submissionResult = { table: null, rows: [] };
            try {
                submissionResult = await queryRowsFromTableCandidates(
                    AREA_SUBMISSION_TABLE_CANDIDATES,
                    "*",
                    submissionCandidates,
                );
                submissionRows = submissionResult.rows || [];
                // eslint-disable-next-line no-console
                console.debug('hydrate: fetched submissionResult.table=', submissionResult.table, 'count=', submissionRows.length);
            } catch (se) {
                // eslint-disable-next-line no-console
                console.debug('hydrate: submission rows fetch failed', se?.message || se);
                submissionRows = [];
                submissionResult = { table: null, rows: [] };
            }

            // Fallback: if no submissions found, try application+user/email multi-eq queries
            if ((submissionRows || []).length === 0) {
                try {
                    const subsTable = submissionResult.table || nextResolvedTables.areaSubmissions || AREA_SUBMISSION_TABLE_CANDIDATES[0] || 'area_submissions';
                    const appIdCandidate = applicationInfo.id || getFirstValue(applicationRow, ['application_id', 'id'], null);
                    const userCandidate = Number.isFinite(numericFacultyId) ? numericFacultyId : null;

                    // Debug: expose to window so user can query from console
                    try {
                        window.__debugHydrate = {
                            supabase,
                            subsTable,
                            appIdCandidate,
                            userCandidate,
                            submissionCandidates,
                            numericFacultyId,
                            userEmail,
                        };
                        // eslint-disable-next-line no-console
                        console.debug('hydrate: window.__debugHydrate available for console queries');
                    } catch (e) {
                        // ignore if window not available
                    }

                    // Try by application_id + user_id
                    if (appIdCandidate && userCandidate) {
                        // eslint-disable-next-line no-console
                        console.debug('hydrate: fallback probing by application_id + user_id', subsTable, appIdCandidate, userCandidate);
                        let query = supabase.from(subsTable).select('*').eq('application_id', appIdCandidate).eq('user_id', userCandidate);
                        if (nextPeriodInfo.id) query = query.eq('cycle_id', nextPeriodInfo.id);
                        const probe = await query;
                        if (!probe.error && Array.isArray(probe.data) && probe.data.length > 0) {
                            submissionRows = probe.data;
                            submissionResult.table = subsTable;
                            // eslint-disable-next-line no-console
                            console.debug('hydrate: fallback match application+user rows=', submissionRows.length);
                        }
                    }

                    // Try by application_id + email (if still empty)
                    if ((submissionRows || []).length === 0 && appIdCandidate && userEmail) {
                        // eslint-disable-next-line no-console
                        console.debug('hydrate: fallback probing by application_id + email', subsTable, appIdCandidate, userEmail);
                        let query = supabase.from(subsTable).select('*').eq('application_id', appIdCandidate).eq('email', userEmail);
                        if (nextPeriodInfo.id) query = query.eq('cycle_id', nextPeriodInfo.id);
                        const probe2 = await query;
                        if (!probe2.error && Array.isArray(probe2.data) && probe2.data.length > 0) {
                            submissionRows = probe2.data;
                            submissionResult.table = subsTable;
                            // eslint-disable-next-line no-console
                            console.debug('hydrate: fallback match application+email rows=', submissionRows.length);
                        }
                    }

                    // Additional fallback: probe by application + area + email across known area ids
                    if ((submissionRows || []).length === 0 && appIdCandidate && userEmail && Array.isArray(baseAreas) && baseAreas.length > 0) {
                        try {
                            const areaCols = ['area_id', 'area', 'areaId'];
                            for (const areaRow of baseAreas) {
                                const candidateAreaId = getFirstValue(areaRow, ['id', 'area_id', 'areaId']);
                                if (!candidateAreaId) continue;

                                for (const areaCol of areaCols) {
                                    // eslint-disable-next-line no-console
                                    console.debug('hydrate: fallback probing by application+area+email', subsTable, appIdCandidate, areaCol, candidateAreaId, userEmail);
                                    let query = supabase.from(subsTable).select('*').eq('application_id', appIdCandidate).eq(areaCol, candidateAreaId).eq('email', userEmail).limit(1);
                                    if (nextPeriodInfo.id) query = query.eq('cycle_id', nextPeriodInfo.id);
                                    const probeArea = await query;
                                    if (!probeArea.error && Array.isArray(probeArea.data) && probeArea.data.length > 0) {
                                        let finalQuery = supabase.from(subsTable).select('*').eq('application_id', appIdCandidate).eq(areaCol, candidateAreaId).eq('email', userEmail);
                                        if (nextPeriodInfo.id) finalQuery = finalQuery.eq('cycle_id', nextPeriodInfo.id);
                                        submissionRows = await finalQuery;
                                        submissionResult.table = subsTable;
                                        // eslint-disable-next-line no-console
                                        console.debug('hydrate: fallback match application+area+email rows=', (submissionRows?.length||0), 'areaCol=', areaCol, 'areaId=', candidateAreaId);
                                        break;
                                    }
                                }
                                if ((submissionRows || []).length > 0) break;
                            }
                        } catch (ae) {
                            // eslint-disable-next-line no-console
                            console.debug('hydrate: area-scoped fallback failed', ae?.message || ae);
                        }
                    }
                } catch (fe) {
                    // eslint-disable-next-line no-console
                    console.debug('hydrate: fallback submission probe failed', fe?.message || fe);
                }
            }
            // Debug: log fetched submission rows to help diagnose duplicates
            try {
                // eslint-disable-next-line no-console
                console.debug('hydrate: submission table=', submissionResult.table, 'rows=', (submissionRows||[]).length, submissionRows?.slice?.(0,3));
            } catch (e) {
                // ignore
            }

            const logResult = await queryRowsFromTableCandidates(
                APPLICATION_LOG_TABLE_CANDIDATES,
                "*",
                pickUserFilterCandidates({ user_id: numericFacultyId, email: userEmail }),
            );

            if (!isActive) return;

            nextResolvedTables.areaSubmissions =
                submissionResult.table || nextResolvedTables.areaSubmissions;
            nextResolvedTables.applicationLogs =
                logResult.table || nextResolvedTables.applicationLogs;
            setResolvedTables(nextResolvedTables);

            const scopedRows = nextPeriodInfo.id
                ? submissionRows.filter((row) => {
                      const cycleId = getFirstValue(row, [
                          "cycle_id",
                          "ranking_cycle_id",
                          "cycleId",
                      ]);
                      return cycleId
                          ? String(cycleId) === String(nextPeriodInfo.id)
                          : false;
                  })
                : submissionRows;

            // Build mapping from database area_id to frontend area identifier
            const areaIdMapping = buildAreaIdMapping(loadedDatabaseAreas);

            if (scopedRows.length > 0) {
                setAreasData(mergeAreasWithSubmissions(baseAreas, scopedRows, areaIdMapping));
            } else {
                setAreasData(baseAreas);
            }

        };

        void hydrateHome();

        return () => {
            isActive = false;
        };
    }, [userEmail, userId]);

    useEffect(() => {
        if (!resolvedCycleTable) return;

        const channel = supabase
            .channel(`faculty-home-cycles-${resolvedCycleTable}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: resolvedCycleTable,
                },
                () => {
                    void refreshSubmissionWindow();
                },
            )
            .subscribe();

        void refreshSubmissionWindow();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshSubmissionWindow, resolvedCycleTable]);

    const openArea = (id) => {
        setOpenAreaId(id);
        setView("detail");
        try {
            const next = new URLSearchParams(searchParams.toString());
            next.set("area", String(id));
            setSearchParams(next, { replace: false });
        } catch (e) {
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
        } catch (e) {
            // ignore
        }
    };

    const currentArea = areasData.find((a) => a.id === openAreaId);

    const appStatus = String(applicationInfo.status || "Not started").toLowerCase();
    const appStatusLabel = appStatus.includes("submit")
        ? "Submitted"
        : appStatus.includes("review")
          ? "Under Review"
                    : appStatus.includes("draft")
                        ? "Draft"
                        : "Not Started";
    return (
        <>
            <style>{styles}</style>

            {/* ── HERO ── */}
            <div className="hm-hero">
                <div className="hm-hero-left">
                    <div className="hm-hero-info">
                        <div className="hm-period-tag">
                            {periodInfo.label} ·{" "}
                            {submissionOpen
                                ? "Open Period"
                                : "Submissions Closed"}
                        </div>
                        <div className="hm-name">
                            {`${profileInfo.firstName} ${profileInfo.lastName}`.trim() || user?.displayName || "Faculty Member"}
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
                                    <circle
                                        className="hm-ring-bg"
                                        cx="48"
                                        cy="48"
                                        r="40"
                                    />
                                    <circle
                                        className="hm-ring-fill"
                                        cx="48"
                                        cy="48"
                                        r="40"
                                    />
                                </svg>
                                <div className="hm-ring-center">
                                    <span className="hm-ring-days">
                                        {periodInfo.daysLeft}
                                    </span>
                                    <span className="hm-ring-days-label">
                                        Days Left
                                    </span>
                                </div>
                            </div>
                            <div className="hm-deadline-copy">
                                <div className="hm-deadline-label">
                                    Submission Deadline
                                </div>
                                <div className="hm-deadline-date">
                                    {periodInfo.deadlineLabel}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Closed state — shown when submission_open = false in Supabase */
                        <>
                            <div
                                className="hm-deadline-ring"
                                style={{ opacity: 0.55 }}
                            >
                                <svg viewBox="0 0 96 96">
                                    <circle
                                        className="hm-ring-bg"
                                        cx="48"
                                        cy="48"
                                        r="40"
                                    />
                                </svg>
                                <div className="hm-ring-center">
                                    <Lock
                                        size={22}
                                        color="rgba(255,255,255,0.7)"
                                    />
                                </div>
                            </div>
                            <div className="hm-deadline-copy">
                                <div className="hm-deadline-label">Submissions</div>
                                <div
                                    className="hm-deadline-date"
                                    style={{ color: "rgba(255,255,255,0.6)" }}
                                >
                                    Closed
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Ranking summary */}
            <div className="hm-rank-summary">
                <div className="hm-rs-item">
                    <div className="hm-rs-label">Current Rank</div>
                    <div className="hm-rs-value">
                        <School size={14} color="var(--gc-green)" />{" "}
                        {profileInfo.currentRank}
                    </div>
                </div>
                <div className="hm-rs-divider" />
                <div className="hm-rs-item">
                    <div className="hm-rs-label">Applying For</div>
                    <div className="hm-rs-value">
                        <TrendingUp size={14} color="var(--gc-green)" />{" "}
                        {compressSequentialApplyingFor(profileInfo.applyingFor || applicationInfo.targetRank)}
                    </div>
                    <div className="hm-rs-sub">This period's target</div>
                </div>
            </div>

            {/* ── LEVEL 1: AREA LIST or LEVEL 2: AREA DETAIL ── */}
            {view === "list" ? (
                <div className="hm-areas-panel">
                    <div className="hm-panel-header">
                        <div>
                            <div className="hm-panel-title">
                                Career Advancement Areas
                            </div>
                            <div className="hm-panel-sub">
                                Click an area to open it. Each Part inside has
                                its own template download and submission slot.
                            </div>
                        </div>
                        <span className="hm-badge-green">
                            {areasData.length} Areas
                        </span>
                    </div>
                    <div className="hm-area-list">
                        {areasData.map((area) => (
                            <AreaListCard
                                key={area.id}
                                area={area}
                                onClick={() => openArea(area.id)}
                            />
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
                            Dashboard &rsaquo;{" "}
                            <strong>
                                Area {currentArea.id} — {currentArea.name}
                            </strong>
                        </span>
                    </div>
                    <div className="hm-detail-header">
                        <div>
                            <div className="hm-dh-num">
                                Area {currentArea.id}
                            </div>
                            <div className="hm-dh-name">{currentArea.name}</div>
                            <div className="hm-dh-note">{currentArea.note}</div>
                        </div>
                        <div className="hm-dh-right">
                            <div className="hm-dh-pts-label">Max Points</div>
                            <div className="hm-dh-pts">
                                {currentArea.maxPts}.00
                            </div>
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
                                getRequiredName={getFacultyRequiredFileName}
                            />
                        ))}
                    </div>
                </div>
            ) : null}

            {toasts.length > 0 && (
                <div className="hm-toast-wrap" role="status" aria-live="polite">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`hm-toast ${toast.kind || "info"}`}
                        >
                            {toast.message}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
