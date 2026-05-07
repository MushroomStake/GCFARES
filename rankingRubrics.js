/**
 * Ranking Rubrics Data - Hardcoded from SIA Rubrics CSV
 * Structure: Each area contains hierarchical sub-areas/criteria
 */

export const RANKING_RUBRICS = [
  {
    areaId: 1,
    areaCode: 'I',
    areaName: 'EDUCATIONAL QUALIFICATIONS',
    maxPoints: 85,
    subAreas: [
      {
        id: 'I_A',
        label: 'A',
        title: 'Associate Courses/Program (2 years)',
        maxPoints: 25,
        children: []
      },
      {
        id: 'I_B',
        label: 'B',
        title: 'Bachelor\'s Degree (4 years to 5 years)',
        maxPoints: 45,
        children: []
      },
      {
        id: 'I_C',
        label: 'C',
        title: 'Diploma course (above Bachelor\'s Degree)',
        maxPoints: 46,
        children: []
      },
      {
        id: 'I_D',
        label: 'D',
        title: 'Master\'s Program',
        maxPoints: null,
        children: [
          { id: 'I_D_1', label: 'D.1', title: 'MA/MS Units (6-12 units)', maxPoints: 47 },
          { id: 'I_D_2', label: 'D.2', title: 'MA/MS Units (13-18 units)', maxPoints: 49 },
          { id: 'I_D_3', label: 'D.3', title: 'MA/MS Units (19-24 units)', maxPoints: 51 },
          { id: 'I_D_4', label: 'D.4', title: 'MA/MS Units (25-30 units)', maxPoints: 53 },
          { id: 'I_D_5', label: 'D.5', title: 'MA/MS Units (31-up units)', maxPoints: 55 }
        ]
      },
      {
        id: 'I_E',
        label: 'E',
        title: 'Comprehensive Exam Passed',
        maxPoints: 58,
        children: []
      },
      {
        id: 'I_F',
        label: 'F',
        title: 'Master\'s Degree (non-thesis)',
        maxPoints: 60,
        children: []
      },
      {
        id: 'I_G',
        label: 'G',
        title: 'Thesis Defended',
        maxPoints: 62,
        children: []
      },
      {
        id: 'I_H',
        label: 'H',
        title: 'Master\'s Degree (Additional 2 points for another MA/MS degree)',
        maxPoints: 65,
        children: []
      },
      {
        id: 'I_I',
        label: 'I',
        title: 'LLB and MD (Passed the bar and board exam)',
        maxPoints: 65,
        children: []
      },
      {
        id: 'I_J',
        label: 'J',
        title: 'Doctoral Program',
        maxPoints: null,
        children: [
          { id: 'I_J_1', label: 'J.1', title: 'Doctoral Units (9-18 units)', maxPoints: 67 },
          { id: 'I_J_2', label: 'J.2', title: 'Doctoral Units (19-27 units)', maxPoints: 69 },
          { id: 'I_J_3', label: 'J.3', title: 'Doctoral Units (28-36 units)', maxPoints: 71 },
          { id: 'I_J_4', label: 'J.4', title: 'Doctoral Units (37-45 units)', maxPoints: 73 },
          { id: 'I_J_5', label: 'J.5', title: 'Doctoral Units (46-up units)', maxPoints: 75 }
        ]
      },
      {
        id: 'I_K',
        label: 'K',
        title: 'Comprehensive Exam Passed',
        maxPoints: 80,
        children: []
      },
      {
        id: 'I_L',
        label: 'L',
        title: 'Doctorate Degree (Additional 5 points for another Ed.D/Ph.D degree)',
        maxPoints: 85,
        children: []
      }
    ]
  },
  {
    areaId: 2,
    areaCode: 'II',
    areaName: 'RESEARCH AND PUBLICATIONS',
    maxPoints: 20,
    subAreas: [
      {
        id: 'II_A',
        label: 'A',
        title: 'Publication (Max. 10 points)',
        maxPoints: 10,
        children: [
          { id: 'II_A_1', label: 'A.1', title: 'Published Books', maxPoints: 2 },
          { id: 'II_A_2', label: 'A.2', title: 'Published Research', maxPoints: 2 },
          { id: 'II_A_3', label: 'A.3', title: 'Monograph', maxPoints: 1 },
          { id: 'II_A_4', label: 'A.4', title: 'Published Thesis/Dissertation', maxPoints: 3 }
        ]
      },
      {
        id: 'II_B',
        label: 'B',
        title: 'Research (Max. 10 points)',
        maxPoints: 10,
        children: [
          { id: 'II_B_1', label: 'B.1', title: 'Institutional materials (books, textbooks, manuals, worksheets, worktext)', maxPoints: 1.5 },
          { id: 'II_B_2', label: 'B.2', title: 'Unpublished Research', maxPoints: 0.75 },
          { id: 'II_B_3', label: 'B.3', title: 'Development of complete set of instructional materials', maxPoints: 1.25 }
        ]
      },
      {
        id: 'II_C',
        label: 'C',
        title: 'Editor Professional Journal (max. 5 pts)',
        maxPoints: 5,
        children: [
          { id: 'II_C_1', label: 'C.1', title: 'Editor-in-chief/Honorary Editor in Chief', maxPoints: 0.75 },
          { id: 'II_C_2', label: 'C.2', title: 'Member of the Editorial Board', maxPoints: 0.5 }
        ]
      },
      {
        id: 'II_D',
        label: 'D',
        title: 'Creative Works (max. 5 pts)',
        maxPoints: 5,
        children: [
          { id: 'II_D_1', label: 'D.1', title: 'Poems, articles, illustrations, photographs, etc.', maxPoints: 0.75 },
          { id: 'II_D_2', label: 'D.2', title: 'Short stories, Lectures, Sermons', maxPoints: 1.25 },
          { id: 'II_D_3', label: 'D.3', title: 'Computer programs, paintings, novels, musical compositions', maxPoints: 1.5 },
          { id: 'II_D_4', label: 'D.4', title: 'Poster/Oral presentation', maxPoints: 1 }
        ]
      }
    ]
  },
  {
    areaId: 3,
    areaCode: 'III',
    areaName: 'TEACHING EXPERIENCE AND PROFESSIONAL SERVICES',
    maxPoints: 20,
    subAreas: [
      {
        id: 'III_A',
        label: 'A',
        title: 'For every year of teaching in Gordon College as',
        maxPoints: null,
        children: [
          { id: 'III_A_1', label: 'A.1', title: 'Full time', maxPoints: 1 },
          { id: 'III_A_2', label: 'A.2', title: 'Part time', maxPoints: 0.25 }
        ]
      },
      {
        id: 'III_B',
        label: 'B',
        title: 'For every year of teaching experience in other schools',
        maxPoints: null,
        children: [
          { id: 'III_B_1', label: 'B.1', title: 'Full time', maxPoints: 0.5 },
          { id: 'III_B_2', label: 'B.2', title: 'Part time', maxPoints: 0.25 }
        ]
      },
      {
        id: 'III_C',
        label: 'C',
        title: 'For every year of administrative designation',
        maxPoints: null,
        children: [
          { id: 'III_C_1_1', label: 'C.1.1', title: 'President - Within Gordon College', maxPoints: 3 },
          { id: 'III_C_1_2', label: 'C.1.2', title: 'President - Outside Gordon College', maxPoints: 1.5 },
          { id: 'III_C_2_1', label: 'C.2.1', title: 'Vice President - Within Gordon College', maxPoints: 2.5 },
          { id: 'III_C_2_2', label: 'C.2.2', title: 'Vice President - Outside Gordon College', maxPoints: 1.25 },
          { id: 'III_C_3_1', label: 'C.3.1', title: 'Dean/Head/Principal/Director - Within Gordon College', maxPoints: 2 },
          { id: 'III_C_3_2', label: 'C.3.2', title: 'Dean/Head/Principal/Director - Outside Gordon College', maxPoints: 1 },
          { id: 'III_C_4_1', label: 'C.4.1', title: 'Program Coordinator - Within Gordon College', maxPoints: 1 },
          { id: 'III_C_4_2', label: 'C.4.2', title: 'Program Coordinator - Outside Gordon College', maxPoints: 0.5 },
          { id: 'III_C_5_1', label: 'C.5.1', title: 'Area/Subject Coordinator - Within Gordon College', maxPoints: 0.5 },
          { id: 'III_C_5_2', label: 'C.5.2', title: 'Area/Subject Coordinator - Outside Gordon College', maxPoints: 0.25 }
        ]
      },
      {
        id: 'III_D',
        label: 'D',
        title: 'For every year of Industry experience aligned to specialization',
        maxPoints: 0.25,
        children: []
      }
    ]
  },
  {
    areaId: 4,
    areaCode: 'IV',
    areaName: 'PERFORMANCE EVALUATION',
    maxPoints: 10,
    subAreas: [
      {
        id: 'IV_Rating',
        label: 'Rating Interpretation',
        title: 'Rating Interpretation',
        maxPoints: 10,
        children: [
          { id: 'IV_1', label: '1.00-1.39 Poor', title: 'Rating 1', maxPoints: 1 },
          { id: 'IV_2', label: '1.40-1.79 Poor', title: 'Rating 2', maxPoints: 2 },
          { id: 'IV_3', label: '1.80-2.19 Fair', title: 'Rating 3', maxPoints: 3 },
          { id: 'IV_4', label: '2.20-2.59 Fair', title: 'Rating 4', maxPoints: 4 },
          { id: 'IV_5', label: '2.60-2.99 Satisfactory', title: 'Rating 5', maxPoints: 5 },
          { id: 'IV_6', label: '3.00-3.39 Satisfactory', title: 'Rating 6', maxPoints: 6 },
          { id: 'IV_7', label: '3.40-3.79 Satisfactory', title: 'Rating 7', maxPoints: 7 },
          { id: 'IV_8', label: '3.80-4.19 Very Satisfactory', title: 'Rating 8', maxPoints: 8 },
          { id: 'IV_9', label: '4.20-4.59 Very Satisfactory', title: 'Rating 9', maxPoints: 9 },
          { id: 'IV_10', label: '4.60-5.00 Outstanding', title: 'Rating 10', maxPoints: 10 }
        ]
      }
    ]
  },
  {
    areaId: 5,
    areaCode: 'V',
    areaName: 'TRAINING AND SEMINARS',
    maxPoints: 10,
    subAreas: [
      {
        id: 'V_A',
        label: 'A',
        title: 'For every training course',
        maxPoints: null,
        children: [
          { id: 'V_A_1', label: 'A.1', title: 'International', maxPoints: 5 },
          { id: 'V_A_2', label: 'A.2', title: 'National', maxPoints: 4 },
          { id: 'V_A_3', label: 'A.3', title: 'Regional', maxPoints: 3 },
          { id: 'V_A_4', label: 'A.4', title: 'Local', maxPoints: 2 },
          { id: 'V_A_5', label: 'A.5', title: 'Institutional', maxPoints: 1 }
        ]
      },
      {
        id: 'V_B',
        label: 'B',
        title: 'For participation in conferences, seminars and workshops',
        maxPoints: null,
        children: [
          { id: 'V_B_1', label: 'B.1', title: 'International', maxPoints: 5 },
          { id: 'V_B_2', label: 'B.2', title: 'National', maxPoints: 4 },
          { id: 'V_B_3', label: 'B.3', title: 'Regional', maxPoints: 3 },
          { id: 'V_B_4', label: 'B.4', title: 'Local', maxPoints: 2 },
          { id: 'V_B_5', label: 'B.5', title: 'Institutional', maxPoints: 1 }
        ]
      }
    ]
  },
  {
    areaId: 6,
    areaCode: 'VI',
    areaName: 'EXPERT SERVICES RENDERED',
    maxPoints: 20,
    subAreas: [
      {
        id: 'VI_A',
        label: 'A',
        title: 'Short-term consultancy/expert in educational, technological, professional activities',
        maxPoints: null,
        children: [
          { id: 'VI_A_1', label: 'A.1', title: 'International', maxPoints: 5 },
          { id: 'VI_A_2', label: 'A.2', title: 'National', maxPoints: 4 },
          { id: 'VI_A_3', label: 'A.3', title: 'Regional', maxPoints: 3 },
          { id: 'VI_A_4', label: 'A.4', title: 'Local', maxPoints: 2 },
          { id: 'VI_A_5', label: 'A.5', title: 'Institutional', maxPoints: 1 }
        ]
      },
      {
        id: 'VI_B',
        label: 'B',
        title: 'Services rendered as coordinator, lecturer, resource person or guest speaker',
        maxPoints: null,
        children: [
          { id: 'VI_B_1', label: 'B.1', title: 'International', maxPoints: 5 },
          { id: 'VI_B_2', label: 'B.2', title: 'National', maxPoints: 4 },
          { id: 'VI_B_3', label: 'B.3', title: 'Regional', maxPoints: 3 },
          { id: 'VI_B_4', label: 'B.4', title: 'Local', maxPoints: 2 },
          { id: 'VI_B_5', label: 'B.5', title: 'Institutional', maxPoints: 1 }
        ]
      },
      {
        id: 'VI_C',
        label: 'C',
        title: 'Expert services as adviser in dissertations and theses (max. 10 points)',
        maxPoints: 10,
        children: [
          { id: 'VI_C_1', label: 'C.1', title: 'Doctoral Dissertation', maxPoints: 1 },
          { id: 'VI_C_2', label: 'C.2', title: 'Masteral Thesis', maxPoints: 0.5 },
          { id: 'VI_C_3', label: 'C.3', title: 'Undergraduate Thesis (outside Gordon College)', maxPoints: 0.25 }
        ]
      },
      {
        id: 'VI_D',
        label: 'D',
        title: 'Certified services as reviewer/examiner in PRC or CSC',
        maxPoints: 1,
        children: []
      },
      {
        id: 'VI_E',
        label: 'E',
        title: 'Expert services in accreditation work',
        maxPoints: 1,
        children: []
      },
      {
        id: 'VI_F',
        label: 'F',
        title: 'For every expert service in trade skill certification',
        maxPoints: 1,
        children: []
      },
      {
        id: 'VI_G',
        label: 'G',
        title: 'For every year of service in curricular/extra-curricular and co-curricular activities',
        maxPoints: 1,
        children: []
      }
    ]
  },
  {
    areaId: 7,
    areaCode: 'VII',
    areaName: 'INVOLVEMENT IN PROFESSIONAL ORGANIZATIONS',
    maxPoints: 10,
    subAreas: [
      {
        id: 'VII_A',
        label: 'A',
        title: 'International',
        maxPoints: null,
        children: [
          { id: 'VII_A_1', label: 'A.1', title: 'Officer', maxPoints: 5 },
          { id: 'VII_A_2', label: 'A.2', title: 'Member', maxPoints: 2 }
        ]
      },
      {
        id: 'VII_B',
        label: 'B',
        title: 'National',
        maxPoints: null,
        children: [
          { id: 'VII_B_1', label: 'B.1', title: 'Officer', maxPoints: 4 },
          { id: 'VII_B_2', label: 'B.2', title: 'Member', maxPoints: 2 }
        ]
      },
      {
        id: 'VII_C',
        label: 'C',
        title: 'Regional',
        maxPoints: null,
        children: [
          { id: 'VII_C_1', label: 'C.1', title: 'Officer', maxPoints: 3 },
          { id: 'VII_C_2', label: 'C.2', title: 'Member', maxPoints: 1 }
        ]
      },
      {
        id: 'VII_D',
        label: 'D',
        title: 'Involvement in Civic Organization',
        maxPoints: null,
        children: [
          { id: 'VII_D_1', label: 'D.1', title: 'Officer', maxPoints: 1 },
          { id: 'VII_D_2', label: 'D.2', title: 'Member', maxPoints: 0.5 }
        ]
      },
      {
        id: 'VII_E',
        label: 'E',
        title: 'Scholarship/Fellowship',
        maxPoints: null,
        children: [
          { id: 'VII_E_1', label: 'E.1', title: 'International - Doctorate', maxPoints: 5 },
          { id: 'VII_E_2', label: 'E.2', title: 'International - Masteral', maxPoints: 4 },
          { id: 'VII_E_3', label: 'E.3', title: 'International - Non-degree', maxPoints: 3 },
          { id: 'VII_E_4', label: 'E.4', title: 'National/Regional - Doctorate', maxPoints: 3 },
          { id: 'VII_E_5', label: 'E.5', title: 'National/Regional - Masteral', maxPoints: 2 },
          { id: 'VII_E_6', label: 'E.6', title: 'National/Regional - Non-degree', maxPoints: 1 },
          { id: 'VII_E_7', label: 'E.7', title: 'Local/Institutional - Doctorate', maxPoints: 2 },
          { id: 'VII_E_8', label: 'E.8', title: 'Local/Institutional - Masteral', maxPoints: 1 }
        ]
      }
    ]
  },
  {
    areaId: 8,
    areaCode: 'VIII',
    areaName: 'AWARDS OF DISTINCTION RECEIVED IN RECOGNITION OF ACHIEVEMENTS',
    maxPoints: 10,
    subAreas: [
      {
        id: 'VIII_A',
        label: 'A',
        title: 'International',
        maxPoints: 5,
        children: []
      },
      {
        id: 'VIII_B',
        label: 'B',
        title: 'National',
        maxPoints: 4,
        children: []
      },
      {
        id: 'VIII_C',
        label: 'C',
        title: 'Regional',
        maxPoints: 3,
        children: []
      },
      {
        id: 'VIII_D',
        label: 'D',
        title: 'Local',
        maxPoints: 2,
        children: []
      },
      {
        id: 'VIII_E',
        label: 'E',
        title: 'Institutional',
        maxPoints: 1,
        children: []
      }
    ]
  },
  {
    areaId: 9,
    areaCode: 'IX',
    areaName: 'COMMUNITY OUTREACH',
    maxPoints: 5,
    subAreas: [
      {
        id: 'IX_A',
        label: 'A',
        title: 'For every participation in service-oriented projects in the community',
        maxPoints: null,
        children: [
          { id: 'IX_A_1', label: 'A.1', title: 'International', maxPoints: 5 },
          { id: 'IX_A_2', label: 'A.2', title: 'National', maxPoints: 4 },
          { id: 'IX_A_3', label: 'A.3', title: 'Regional/Local/Institutional (1 pt. for every activity)', maxPoints: 3 }
        ]
      }
    ]
  },
  {
    areaId: 10,
    areaCode: 'X',
    areaName: 'PROFESSIONAL EXAMINATION (PRC, CSC AND TESDA)',
    maxPoints: 10,
    subAreas: [
      {
        id: 'X_A',
        label: 'A',
        title: 'For every relevant licensure and professional examinations passed',
        maxPoints: null,
        children: [
          { id: 'X_A_1', label: 'A.1', title: 'Accounting, Engineering, Nursing, Medicine, Law, Teacher\'s Board, etc.', maxPoints: 10 },
          { id: 'X_A_2', label: 'A.2', title: 'Career Executive Service Officer (CESO)', maxPoints: 7 },
          { id: 'X_A_3', label: 'A.3', title: 'Professional License', maxPoints: 5 },
          { id: 'X_A_4', label: 'A.4', title: 'Sub-Professional Licence', maxPoints: 3 },
          { id: 'X_A_5', label: 'A.5', title: 'Other Trade Certificates (NC II onwards)', maxPoints: 3 },
          { id: 'X_A_6', label: 'A.6', title: 'Specialty Certification - International/Local', maxPoints: 3 }
        ]
      }
    ]
  }
];
