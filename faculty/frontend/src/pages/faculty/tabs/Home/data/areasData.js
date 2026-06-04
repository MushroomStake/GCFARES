// Static AREAS_DATA extracted from Home.jsx
// Keep this file in sync with the original source when changes are made.
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

export default AREAS_DATA;
