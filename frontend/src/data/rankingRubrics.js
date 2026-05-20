/**
 * Ranking Rubrics Data - Hardcoded from SIA Rubrics CSV
 * Structure: Each area contains hierarchical sub-areas/criteria
 */

export const RANKING_RUBRICS = [
  {
    "areaId": 1,
    "areaCode": "I",
    "areaName": "EDUCATIONAL QUALIFICATIONS",
    "maxPoints": 85.0,
    "subAreas": [
      {
        "label": "A",
        "title": "Associate Courses/Program (2 years)",
        "maxPoints": 25.0
      },
      {
        "label": "B",
        "title": "Bachelor’s Degree (4 years to 5 years)",
        "maxPoints": 45.0
      },
      {
        "label": "C",
        "title": "Diploma course (above Bachelor’s Degree)",
        "maxPoints": 46.0
      },
      {
        "label": "D",
        "title": "Master's Program",
        "children": [
          {
            "label": "D.1",
            "title": "MA/MS Units (6-12 units)",
            "maxPoints": 47.0
          },
          {
            "label": "D.2",
            "title": "MA/MS Units (13-18 units)",
            "maxPoints": 49.0
          },
          {
            "label": "D.3",
            "title": "MA/MS Units (19-24 units)",
            "maxPoints": 51.0
          },
          {
            "label": "D.4",
            "title": "MA/MS Units (25-30 units)",
            "maxPoints": 53.0
          },
          {
            "label": "D.5",
            "title": "MA/MS Units (31-up units)",
            "maxPoints": 55.0
          },
          {
            "label": "E",
            "title": "Comprehensive Exam Passed",
            "maxPoints": 58.0
          },
          {
            "label": "F",
            "title": "Master’s Degree (non-thesis)",
            "maxPoints": 60.0
          },
          {
            "label": "G",
            "title": "Thesis Defended",
            "maxPoints": 62.0
          },
          {
            "label": "H",
            "title": "Master’s Degree (Additional 2 points for another MA/MS degree)",
            "maxPoints": 65.0
          },
          {
            "label": "I",
            "title": "LLB and MD (Passed the bar and board exam)",
            "maxPoints": 65.0
          }
        ]
      },
      {
        "label": "J.Doctoral Program",
        "title": "J.Doctoral Program",
        "children": [
          {
            "label": "K",
            "title": "Comprehensive Exam Passed",
            "maxPoints": 80.0
          },
          {
            "label": "L",
            "title": "Doctorate Degree (Additional 5 points for another Ed.D/Ph.D degree)",
            "maxPoints": 85.0
          }
        ]
      },
      {
        "label": "J.1",
        "title": "Doctoral Units (9-18 units)",
        "maxPoints": 67.0
      },
      {
        "label": "J.2",
        "title": "Doctoral Units (19-27 units)",
        "maxPoints": 69.0
      },
      {
        "label": "J.3",
        "title": "Doctoral Units (28-36 units)",
        "maxPoints": 71.0
      },
      {
        "label": "J.4",
        "title": "Doctoral Units (37-45 units)",
        "maxPoints": 73.0
      },
      {
        "label": "J.5",
        "title": "Doctoral Units (46-up units)",
        "maxPoints": 75.0
      }
    ]
  },
  {
    "areaId": 2,
    "areaCode": "II",
    "areaName": "RESEARCH AND PUBLICATIONS",
    "maxPoints": 20.0,
    "subAreas": [
      {
        "label": "A",
        "title": "Publication (Max. 10 points)",
        "children": [
          {
            "label": "A.1",
            "title": "Published Books",
            "maxPoints": 2.0,
            "children": [
              {
                "label": "A.1.1",
                "title": "No. of Authors",
                "children": [
                  {
                    "label": "A.1.1.1",
                    "title": "Single author",
                    "maxPoints": 1.25
                  },
                  {
                    "label": "A.1.1.2",
                    "title": "Co-authored",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.1.1.3",
                    "title": "Three (3) or more authors",
                    "maxPoints": 0.25
                  }
                ]
              },
              {
                "label": "A.1.2",
                "title": "Designation of Writer",
                "children": [
                  {
                    "label": "A.1.2.1",
                    "title": "Lead Author",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.1.2.2",
                    "title": "Co-author",
                    "maxPoints": 0.5
                  }
                ]
              },
              {
                "label": "A.1.3",
                "title": "Level",
                "children": [
                  {
                    "label": "A.1.3.1",
                    "title": "International",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "A.1.3.2",
                    "title": "National/Regional",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.1.3.3",
                    "title": "Institutional",
                    "maxPoints": 0.5
                  }
                ]
              }
            ]
          },
          {
            "label": "A.2",
            "title": "Published Research",
            "maxPoints": 2.0,
            "children": [
              {
                "label": "A.2.1",
                "title": "No. of Authors",
                "children": [
                  {
                    "label": "A.2.1.1",
                    "title": "Single author",
                    "maxPoints": 1.25
                  },
                  {
                    "label": "A.2.1.2",
                    "title": "Co-authored",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.2.1.3",
                    "title": "Three (3) or more authors",
                    "maxPoints": 0.25
                  }
                ]
              },
              {
                "label": "A.2.2",
                "title": "Designation of Writer",
                "children": [
                  {
                    "label": "A.2.2.1",
                    "title": "Lead Author",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.2.2.2",
                    "title": "Co-author",
                    "maxPoints": 0.5
                  }
                ]
              },
              {
                "label": "A.2.3",
                "title": "Level",
                "children": [
                  {
                    "label": "A.2.3.1",
                    "title": "International",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "A.2.3.2",
                    "title": "National/Regional",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.2.3.3",
                    "title": "Institutional",
                    "maxPoints": 0.5
                  }
                ]
              }
            ]
          },
          {
            "label": "A.3",
            "title": "Monograph",
            "maxPoints": 1.0,
            "children": [
              {
                "label": "A.3.1",
                "title": "No. of Authors",
                "children": [
                  {
                    "label": "A.3.1.1",
                    "title": "Single author",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.3.1.2",
                    "title": "Co-authored",
                    "maxPoints": 0.5
                  },
                  {
                    "label": "A.3.1.3",
                    "title": "Three (3) or more authors",
                    "maxPoints": 0.25
                  }
                ]
              },
              {
                "label": "A.3.2",
                "title": "Designation of Writer",
                "children": [
                  {
                    "label": "A.3.2.1",
                    "title": "Lead Author",
                    "maxPoints": 0.5
                  },
                  {
                    "label": "A.3.2.2",
                    "title": "Co-author",
                    "maxPoints": 0.25
                  }
                ]
              },
              {
                "label": "A.3.3",
                "title": "Level",
                "children": [
                  {
                    "label": "A.3.3.1",
                    "title": "International",
                    "maxPoints": 0.75
                  },
                  {
                    "label": "A.3.3.2",
                    "title": "National/Regional",
                    "maxPoints": 0.5
                  },
                  {
                    "label": "A.3.3.3",
                    "title": "Institutional",
                    "maxPoints": 0.25
                  }
                ]
              }
            ]
          },
          {
            "label": "A.4",
            "title": "Published Thesis/Dissertation (Other point systems do not apply to these works. For single authorship only.)",
            "maxPoints": 3.0
          },
          {
            "label": "B",
            "title": "Research (Max. 10 points)",
            "children": [
              {
                "label": "B.1",
                "title": "Institutional materials (in the form of books, textbooks, manuals,worksheets,and worktext)",
                "maxPoints": 1.5,
                "children": [
                  {
                    "label": "B.1.1",
                    "title": "No. of Researchers",
                    "children": [
                      {
                        "label": "B.1.1.1",
                        "title": "Single",
                        "maxPoints": 1.25
                      },
                      {
                        "label": "B.1.1.2",
                        "title": "Two (2) or more researchers",
                        "maxPoints": 0.75
                      }
                    ]
                  },
                  {
                    "label": "B.1.2",
                    "title": "Designation of Researchers",
                    "children": [
                      {
                        "label": "B.1.2.1",
                        "title": "Lead researcher",
                        "maxPoints": 0.75
                      },
                      {
                        "label": "B.1.2.2",
                        "title": "Co-researcher",
                        "maxPoints": 0.5
                      }
                    ]
                  },
                  {
                    "label": "B.1.3",
                    "title": "Level",
                    "children": [
                      {
                        "label": "B.1.3.1",
                        "title": "External",
                        "maxPoints": 0.5
                      },
                      {
                        "label": "B.1.3.2",
                        "title": "Institutional",
                        "maxPoints": 0.25
                      }
                    ]
                  }
                ]
              },
              {
                "label": "B.2",
                "title": "Unpublished Research",
                "maxPoints": 0.75,
                "children": [
                  {
                    "label": "B.2.1",
                    "title": "No. of Researchers",
                    "children": [
                      {
                        "label": "B.2.1.1",
                        "title": "Single",
                        "maxPoints": 0.75
                      },
                      {
                        "label": "B.2.1.2",
                        "title": "Two (2) or more researchers",
                        "maxPoints": 0.5
                      }
                    ]
                  },
                  {
                    "label": "B.2.2",
                    "title": "Designation of Researchers",
                    "children": [
                      {
                        "label": "B.2.2.1",
                        "title": "Lead researcher",
                        "maxPoints": 0.5
                      },
                      {
                        "label": "B.2.2.2",
                        "title": "Co-researcher",
                        "maxPoints": 0.25
                      }
                    ]
                  },
                  {
                    "label": "B.2.3",
                    "title": "Level",
                    "children": [
                      {
                        "label": "B.2.3.1",
                        "title": "External",
                        "maxPoints": 0.5
                      },
                      {
                        "label": "B.2.3.2",
                        "title": "Institutional",
                        "maxPoints": 0.25
                      }
                    ]
                  }
                ]
              },
              {
                "label": "B.3",
                "title": "Development of a complete set of instructional materials (in the form of transparencies, modules, video production,discs,multimedia instructional materials,etc.)-Other point systems do not apply to these works. For single authorship only.",
                "maxPoints": 1.25
              },
              {
                "label": "C",
                "title": "Editor Professional Journal (adds-on only, maximum of 5 pts.)",
                "children": [
                  {
                    "label": "C.1",
                    "title": "Editor-in-chief/Honorary Editor in Chief",
                    "maxPoints": 0.75,
                    "children": [
                      {
                        "label": "C.1.1",
                        "title": "Level",
                        "children": [
                          {
                            "label": "C.1.1.1",
                            "title": "External",
                            "maxPoints": 0.75
                          },
                          {
                            "label": "C.1.1.2",
                            "title": "Institutional",
                            "maxPoints": 0.5
                          }
                        ]
                      },
                      {
                        "label": "C.1.2",
                        "title": "Type of Publication",
                        "children": [
                          {
                            "label": "C.1.2.1",
                            "title": "Refereed",
                            "maxPoints": 1.25
                          },
                          {
                            "label": "C.1.2.2",
                            "title": "Non-refereed",
                            "maxPoints": 0.75
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "label": "C.2",
                    "title": "Member of the Editorial Board",
                    "maxPoints": 0.5,
                    "children": [
                      {
                        "label": "C.2.1",
                        "title": "Level",
                        "children": [
                          {
                            "label": "C.2.1.1",
                            "title": "External",
                            "maxPoints": 0.75
                          },
                          {
                            "label": "C.2.1.2",
                            "title": "Institutional",
                            "maxPoints": 0.5
                          }
                        ]
                      },
                      {
                        "label": "C.2.2",
                        "title": "Type of Publication",
                        "children": [
                          {
                            "label": "C.2.2.1",
                            "title": "Refereed",
                            "maxPoints": 1.25
                          },
                          {
                            "label": "C.2.2.2",
                            "title": "Non-refereed",
                            "maxPoints": 0.75
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "label": "D",
                    "title": "Creative Works (adds-on only, maximum of 5 pts.)",
                    "children": [
                      {
                        "label": "D.1",
                        "title": "Poems, newspaper/magazine article, illustration, maps, plans, sketches, charts, three dimensional works relative to geography, topography, architecture or science, drawings, plastic works of a scientific or technical character, photography works, lantern slides, pictorial illustrations and advertisements.",
                        "maxPoints": 0.75,
                        "children": [
                          {
                            "label": "D.1.1",
                            "title": "Level",
                            "children": [
                              {
                                "label": "D.1.1.1",
                                "title": "International",
                                "maxPoints": 1.75
                              },
                              {
                                "label": "D.1.1.2",
                                "title": "National",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.1.1.3",
                                "title": "Institutional",
                                "maxPoints": 0.5
                              }
                            ]
                          },
                          {
                            "label": "D.1.2",
                            "title": "No.of Authors",
                            "children": [
                              {
                                "label": "D.1.2.1",
                                "title": "Single",
                                "maxPoints": 1.25
                              },
                              {
                                "label": "D.1.2.2",
                                "title": "Co-authored",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.1.2.3",
                                "title": "Three(3) or more",
                                "maxPoints": 0.5
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "label": "D.2",
                        "title": "Short stories, Lectures, Sermons, Addresses, Letters",
                        "maxPoints": 1.25,
                        "children": [
                          {
                            "label": "D.2.1",
                            "title": "Level",
                            "children": [
                              {
                                "label": "D.2.1.1",
                                "title": "International",
                                "maxPoints": 1.5
                              },
                              {
                                "label": "D.2.1.2",
                                "title": "National",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.2.1.3",
                                "title": "Institutional",
                                "maxPoints": 0.5
                              }
                            ]
                          },
                          {
                            "label": "D.2.2",
                            "title": "No.of Authors",
                            "children": [
                              {
                                "label": "D.2.2.1",
                                "title": "Single",
                                "maxPoints": 1.25
                              },
                              {
                                "label": "D.2.2.2",
                                "title": "Co-authored",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.2.2.3",
                                "title": "Three(3) or more",
                                "maxPoints": 0.5
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "label": "D.3",
                        "title": "Computer programs, painting, novels (non-fiction), musical compositions, original ornamental design or models for manufacture, audio-visual works, cinematography works",
                        "maxPoints": 1.5,
                        "children": [
                          {
                            "label": "D.3.1",
                            "title": "Level",
                            "children": [
                              {
                                "label": "D.3.1.1",
                                "title": "International",
                                "maxPoints": 1.5
                              },
                              {
                                "label": "D.3.1.2",
                                "title": "National",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.3.1.3",
                                "title": "Institutional",
                                "maxPoints": 0.5
                              }
                            ]
                          },
                          {
                            "label": "D.3.2",
                            "title": "No.of Authors",
                            "children": [
                              {
                                "label": "D.3.2.1",
                                "title": "Single",
                                "maxPoints": 1.0
                              },
                              {
                                "label": "D.3.2.2",
                                "title": "Co-authored",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.3.2.3",
                                "title": "Three(3) or more",
                                "maxPoints": 0.5
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "label": "D.4",
                        "title": "Poster/Oral presentation",
                        "maxPoints": 1.0,
                        "children": [
                          {
                            "label": "D.4.1",
                            "title": "Level",
                            "children": [
                              {
                                "label": "D.4.1.1",
                                "title": "International",
                                "maxPoints": 1.5
                              },
                              {
                                "label": "D.4.1.2",
                                "title": "National",
                                "maxPoints": 1.0
                              },
                              {
                                "label": "D.4.1.3",
                                "title": "Institutional",
                                "maxPoints": 0.25
                              }
                            ]
                          },
                          {
                            "label": "D.4.2",
                            "title": "No.of Authors",
                            "children": [
                              {
                                "label": "D.4.2.1",
                                "title": "Single",
                                "maxPoints": 1.0
                              },
                              {
                                "label": "D.4.2.2",
                                "title": "Co-authored",
                                "maxPoints": 0.75
                              },
                              {
                                "label": "D.4.2.3",
                                "title": "Three(3) or more",
                                "maxPoints": 0.5
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "areaId": 3,
    "areaCode": "III",
    "areaName": "TEACHING EXPERIENCE AND PROFESSIONAL SERVICES",
    "maxPoints": 20.0,
    "subAreas": [
      {
        "label": "A",
        "title": "For every year of teaching in Gordon College as:",
        "children": [
          {
            "label": "A.1",
            "title": "Full time",
            "maxPoints": 1.0
          },
          {
            "label": "A.2",
            "title": "Part time",
            "maxPoints": 0.25
          },
          {
            "label": "B",
            "title": "For every year of teaching experience in other schools as full time",
            "children": [
              {
                "label": "B.1",
                "title": "Full time",
                "maxPoints": 0.5
              },
              {
                "label": "B.2",
                "title": "Part time",
                "maxPoints": 0.25
              },
              {
                "label": "C",
                "title": "For every year of administrative designation as (at least one year of service in assigned designation )",
                "children": [
                  {
                    "label": "C.1",
                    "title": "President",
                    "children": [
                      {
                        "label": "C.1.1",
                        "title": "Within Gordon College",
                        "maxPoints": 3.0
                      },
                      {
                        "label": "C.1.2",
                        "title": "Outside Gordon College",
                        "maxPoints": 1.5
                      }
                    ]
                  },
                  {
                    "label": "C.2",
                    "title": "Vice President",
                    "children": [
                      {
                        "label": "C.2.1",
                        "title": "Within Gordon College",
                        "maxPoints": 2.5
                      },
                      {
                        "label": "C.2.2",
                        "title": "Outside Gordon College",
                        "maxPoints": 1.25
                      }
                    ]
                  },
                  {
                    "label": "C.3",
                    "title": "Dean/Head/Principal/Director",
                    "children": [
                      {
                        "label": "C.3.1",
                        "title": "Within Gordon College",
                        "maxPoints": 2.0
                      },
                      {
                        "label": "C.3.2",
                        "title": "Outside Gordon College",
                        "maxPoints": 1.0
                      }
                    ]
                  },
                  {
                    "label": "C.4",
                    "title": "Program Coordinator",
                    "children": [
                      {
                        "label": "C.4.1",
                        "title": "Within Gordon College",
                        "maxPoints": 1.0
                      },
                      {
                        "label": "C.4.2",
                        "title": "Outside Gordon College",
                        "maxPoints": 0.5
                      }
                    ]
                  },
                  {
                    "label": "C.5",
                    "title": "Area/Subject Coordinator",
                    "children": [
                      {
                        "label": "C.5.1",
                        "title": "Within Gordon College",
                        "maxPoints": 0.5
                      },
                      {
                        "label": "C.5.2",
                        "title": "Outside Gordon College",
                        "maxPoints": 0.25
                      }
                    ]
                  },
                  {
                    "label": "D",
                    "title": "For every year of Industry experience aligned to the field of specialization as full time",
                    "maxPoints": 0.25
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "areaId": 4,
    "areaCode": "IV",
    "areaName": "PERFORMANCE EVALUATION",
    "maxPoints": 10.0,
    "subAreas": [
      {
        "label": "Rating Interpretation",
        "title": "Rating Interpretation",
        "children": [
          {
            "label": "1.00-1.39 Poor",
            "title": "1.00-1.39 Poor",
            "maxPoints": 1.0
          },
          {
            "label": "1.40-1.79 Poor",
            "title": "1.40-1.79 Poor",
            "maxPoints": 2.0
          },
          {
            "label": "1.80-2.19 Fair",
            "title": "1.80-2.19 Fair",
            "maxPoints": 3.0
          },
          {
            "label": "2.20-2.59 Fair",
            "title": "2.20-2.59 Fair",
            "maxPoints": 4.0
          },
          {
            "label": "2.60-2.99 Satisfactory",
            "title": "2.60-2.99 Satisfactory",
            "maxPoints": 5.0
          },
          {
            "label": "3.00-3.39 Satisfactory",
            "title": "3.00-3.39 Satisfactory",
            "maxPoints": 6.0
          },
          {
            "label": "3.40-3.79 Satisfactory",
            "title": "3.40-3.79 Satisfactory",
            "maxPoints": 7.0
          },
          {
            "label": "3.80-4.19 Very Satisfactory",
            "title": "3.80-4.19 Very Satisfactory",
            "maxPoints": 8.0
          },
          {
            "label": "4.20-4.59 Very Satisfactory",
            "title": "4.20-4.59 Very Satisfactory",
            "maxPoints": 9.0
          },
          {
            "label": "4.60-5.00 Outstanding",
            "title": "4.60-5.00 Outstanding",
            "maxPoints": 10.0
          }
        ]
      }
    ]
  },
  {
    "areaId": 5,
    "areaCode": "V",
    "areaName": "TRAINING AND SEMINARS",
    "maxPoints": 10.0,
    "subAreas": [
      {
        "label": "A",
        "title": "For every training course:",
        "children": [
          {
            "label": "A.1",
            "title": "International",
            "maxPoints": 5.0
          },
          {
            "label": "A.2",
            "title": "National",
            "maxPoints": 4.0
          },
          {
            "label": "A.3",
            "title": "Regional",
            "maxPoints": 3.0
          },
          {
            "label": "A.4",
            "title": "Local",
            "maxPoints": 2.0
          },
          {
            "label": "A.5",
            "title": "Institutional",
            "maxPoints": 1.0
          },
          {
            "label": "B",
            "title": "For participation in conferences, seminars and workshops:",
            "children": [
              {
                "label": "B.1",
                "title": "International",
                "maxPoints": 5.0
              },
              {
                "label": "B.2",
                "title": "National",
                "maxPoints": 4.0
              },
              {
                "label": "B.3",
                "title": "Regional",
                "maxPoints": 3.0
              },
              {
                "label": "B.4",
                "title": "Local",
                "maxPoints": 2.0
              },
              {
                "label": "B.5",
                "title": "Institutional",
                "maxPoints": 1.0
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "areaId": 6,
    "areaCode": "VI",
    "areaName": "EXPERT SERVICES RENDERED",
    "maxPoints": 20.0,
    "subAreas": [
      {
        "label": "A",
        "title": "For serving a short-term consultancy/expert in an activity of an educational, technological, professional, scientific or cultural nature (foreign or local) sponsored by the government or other agencies",
        "children": [
          {
            "label": "A.1",
            "title": "International",
            "maxPoints": 5.0
          },
          {
            "label": "A.2",
            "title": "National",
            "maxPoints": 4.0
          },
          {
            "label": "A.3",
            "title": "Regional",
            "maxPoints": 3.0
          },
          {
            "label": "A.4",
            "title": "Local",
            "maxPoints": 2.0
          },
          {
            "label": "A.5",
            "title": "Institutional",
            "maxPoints": 1.0
          },
          {
            "label": "B",
            "title": "For services rendered as coordinator, lecturer, resource person or guest speaker in conference, workshops, and/or training courses",
            "children": [
              {
                "label": "B.1",
                "title": "International",
                "maxPoints": 5.0
              },
              {
                "label": "B.2",
                "title": "National",
                "maxPoints": 4.0
              },
              {
                "label": "B.3",
                "title": "Regional",
                "maxPoints": 3.0
              },
              {
                "label": "B.4",
                "title": "Local",
                "maxPoints": 2.0
              },
              {
                "label": "B.5",
                "title": "Institutional",
                "maxPoints": 1.0
              },
              {
                "label": "C",
                "title": "For expert services as adviser in doctoral dissertation, masteral and undergraduate theses (maximum of 10 points)",
                "children": [
                  {
                    "label": "C.1",
                    "title": "Doctoral Dissertation",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "C.2",
                    "title": "Masteral Thesis",
                    "maxPoints": 0.5
                  },
                  {
                    "label": "C.3",
                    "title": "Undergraduate Thesis (conducted outside Gordon College)",
                    "maxPoints": 0.25
                  },
                  {
                    "label": "D",
                    "title": "For certified services as reviewer/examiner in the Professional Regulatory Commission (PRC) or the Civil Service Commission",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "E",
                    "title": "For expert services in accreditation work as member of the Board of Directors, member of the Technical Committee or Consultant Group",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "F",
                    "title": "For every expert service in trade skill certification",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "G",
                    "title": "For every year of service in curricular/extra-curricular and co-curricular activities",
                    "maxPoints": 1.0
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "areaId": 7,
    "areaCode": "VII",
    "areaName": "INVOLVEMENT IN PROFESSIONAL ORGANIZATIONS",
    "maxPoints": 10.0,
    "subAreas": [
      {
        "label": "A",
        "title": "International",
        "children": [
          {
            "label": "A.1",
            "title": "Officer",
            "maxPoints": 5.0
          },
          {
            "label": "A.2",
            "title": "Member",
            "maxPoints": 2.0
          },
          {
            "label": "B",
            "title": "National",
            "children": [
              {
                "label": "B.1",
                "title": "Officer",
                "maxPoints": 4.0
              },
              {
                "label": "B.2",
                "title": "Member",
                "maxPoints": 2.0
              },
              {
                "label": "C",
                "title": "Regional",
                "children": [
                  {
                    "label": "C.1",
                    "title": "Officer",
                    "maxPoints": 3.0
                  },
                  {
                    "label": "C.2",
                    "title": "Member",
                    "maxPoints": 1.0
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "INVOLVEMENT in CIVIC ORGANIZATION",
        "title": "INVOLVEMENT in CIVIC ORGANIZATION",
        "children": [
          {
            "label": "A",
            "title": "Officer",
            "maxPoints": 1.0
          },
          {
            "label": "B",
            "title": "Member",
            "maxPoints": 0.5
          }
        ]
      },
      {
        "label": "SCHOLARSHIP/FELLOWSHIP",
        "title": "SCHOLARSHIP/FELLOWSHIP",
        "children": [
          {
            "label": "A",
            "title": "International",
            "children": [
              {
                "label": "A.1",
                "title": "Doctorate",
                "maxPoints": 5.0
              },
              {
                "label": "A.2",
                "title": "Masteral",
                "maxPoints": 4.0
              },
              {
                "label": "A.3",
                "title": "Non-degree",
                "maxPoints": 3.0
              },
              {
                "label": "B",
                "title": "National/Regional",
                "children": [
                  {
                    "label": "B.1",
                    "title": "Doctorate",
                    "maxPoints": 3.0
                  },
                  {
                    "label": "B.2",
                    "title": "Masteral",
                    "maxPoints": 2.0
                  },
                  {
                    "label": "B.3",
                    "title": "Non-degree",
                    "maxPoints": 1.0
                  },
                  {
                    "label": "C",
                    "title": "Local/Institutional",
                    "children": [
                      {
                        "label": "C.1",
                        "title": "Doctorate",
                        "maxPoints": 2.0
                      },
                      {
                        "label": "C.2",
                        "title": "Masteral",
                        "maxPoints": 1.0
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "areaId": 8,
    "areaCode": "VIII",
    "areaName": "AWARDS OF DISTINCTION RECEIVED IN RECOGNITION OF ACHIEVEMENTS IN RELEVANT AREAS OF SPECIALIZATION/ PROFESSION AND/OR ASSIGNMENT OF FACULTY CONCERNED",
    "maxPoints": 10.0,
    "subAreas": [
      {
        "label": "A",
        "title": "International",
        "maxPoints": 5.0
      },
      {
        "label": "B",
        "title": "National",
        "maxPoints": 4.0
      },
      {
        "label": "C",
        "title": "Regional",
        "maxPoints": 3.0
      },
      {
        "label": "D",
        "title": "Local",
        "maxPoints": 2.0
      },
      {
        "label": "E",
        "title": "Institutional",
        "maxPoints": 1.0
      }
    ]
  },
  {
    "areaId": 9,
    "areaCode": "IX",
    "areaName": "COMMUNITY OUTREACH",
    "maxPoints": 5.0,
    "subAreas": [
      {
        "label": "A",
        "title": "For every participation in service-oriented projects in the community",
        "children": [
          {
            "label": "A.1",
            "title": "International",
            "maxPoints": 5.0
          },
          {
            "label": "A.2",
            "title": "National",
            "maxPoints": 4.0
          },
          {
            "label": "A.3",
            "title": "Regional/Local/Institutional (1 pt. for every activity)",
            "maxPoints": 3.0
          }
        ]
      }
    ]
  },
  {
    "areaId": 10,
    "areaCode": "X",
    "areaName": "PROFESSIONAL EXAMINATION (PRC,CSC AND TESDA)",
    "maxPoints": 10.0,
    "subAreas": [
      {
        "label": "A",
        "title": "For every relevant licensure and other professional examinations passed",
        "children": [
          {
            "label": "A.1",
            "title": "Accounting, Customs Broker, Engineering, Nursing, Midwifery, Medicine, Law ,Teacher’s Board, etc.",
            "maxPoints": 10.0
          },
          {
            "label": "A.2",
            "title": "Civil Service Eligibility",
            "children": [
              {
                "label": "A.2.1",
                "title": "Career Executive Service Officer (CESO)",
                "maxPoints": 7.0
              },
              {
                "label": "A.2.2",
                "title": "Professional License",
                "maxPoints": 5.0
              },
              {
                "label": "A.2.3",
                "title": "Sub-Professional Licence",
                "maxPoints": 3.0
              }
            ]
          },
          {
            "label": "A.3",
            "title": "Other Trade Certificates (NC II onwards)",
            "maxPoints": 3.0
          },
          {
            "label": "A.4",
            "title": "Specialty Certification",
            "children": [
              {
                "label": "A.4.1",
                "title": "International/Local",
                "maxPoints": 3.0
              }
            ]
          }
        ]
      }
    ]
  }
];

export default RANKING_RUBRICS;