import type { BracketData } from './footballData';

// Baked-in snapshot of the bracket, used as a durable fallback when the live feed is
// unavailable or returns invalid data, and as the permanent source once FREEZE_BRACKET is set.
// Regenerate by capturing GET /api/results .bracket. Last captured mid-tournament.
export const FALLBACK_BRACKET: BracketData = {
    "teams":  {
                  "759":  {
                              "id":  "759",
                              "name":  "Germany",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/de.svg"
                          },
                  "760":  {
                              "id":  "760",
                              "name":  "Spain",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/es.svg"
                          },
                  "761":  {
                              "id":  "761",
                              "name":  "Paraguay",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/py.svg"
                          },
                  "762":  {
                              "id":  "762",
                              "name":  "Argentina",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/ar.svg"
                          },
                  "763":  {
                              "id":  "763",
                              "name":  "Ghana",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/gh.svg"
                          },
                  "764":  {
                              "id":  "764",
                              "name":  "Brazil",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/br.svg"
                          },
                  "765":  {
                              "id":  "765",
                              "name":  "Portugal",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/pt.svg"
                          },
                  "766":  {
                              "id":  "766",
                              "name":  "Japan",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/jp.svg"
                          },
                  "769":  {
                              "id":  "769",
                              "name":  "Mexico",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/mx.svg"
                          },
                  "770":  {
                              "id":  "770",
                              "name":  "England",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/gb-eng.svg"
                          },
                  "771":  {
                              "id":  "771",
                              "name":  "United States",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/us.svg"
                          },
                  "773":  {
                              "id":  "773",
                              "name":  "France",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/fr.svg"
                          },
                  "774":  {
                              "id":  "774",
                              "name":  "South Africa",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/za.svg"
                          },
                  "778":  {
                              "id":  "778",
                              "name":  "Algeria",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/dz.svg"
                          },
                  "779":  {
                              "id":  "779",
                              "name":  "Australia",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/au.svg"
                          },
                  "788":  {
                              "id":  "788",
                              "name":  "Switzerland",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/ch.svg"
                          },
                  "791":  {
                              "id":  "791",
                              "name":  "Ecuador",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/ec.svg"
                          },
                  "792":  {
                              "id":  "792",
                              "name":  "Sweden",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/se.svg"
                          },
                  "799":  {
                              "id":  "799",
                              "name":  "Croatia",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/hr.svg"
                          },
                  "804":  {
                              "id":  "804",
                              "name":  "Senegal",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/sn.svg"
                          },
                  "805":  {
                              "id":  "805",
                              "name":  "Belgium",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/be.svg"
                          },
                  "815":  {
                              "id":  "815",
                              "name":  "Morocco",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/ma.svg"
                          },
                  "816":  {
                              "id":  "816",
                              "name":  "Austria",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/at.svg"
                          },
                  "818":  {
                              "id":  "818",
                              "name":  "Colombia",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/co.svg"
                          },
                  "825":  {
                              "id":  "825",
                              "name":  "Egypt",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/eg.svg"
                          },
                  "828":  {
                              "id":  "828",
                              "name":  "Canada",
                              "crest":  "https://hatscripts.github.io/circle-flags/flags/ca.svg"
                          },
                  "1060":  {
                               "id":  "1060",
                               "name":  "Bosnia \u0026 Herzegovina",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/ba.svg"
                           },
                  "1930":  {
                               "id":  "1930",
                               "name":  "Cape Verde",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/cv.svg"
                           },
                  "1934":  {
                               "id":  "1934",
                               "name":  "Congo DR",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/cd.svg"
                           },
                  "1935":  {
                               "id":  "1935",
                               "name":  "Ivory Coast",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/ci.svg"
                           },
                  "8601":  {
                               "id":  "8601",
                               "name":  "Netherlands",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/nl.svg"
                           },
                  "8872":  {
                               "id":  "8872",
                               "name":  "Norway",
                               "crest":  "https://hatscripts.github.io/circle-flags/flags/no.svg"
                           }
              },
    "seed":  [
                 "764",
                 "766",
                 "1935",
                 "8872",
                 "769",
                 "791",
                 "770",
                 "1934",
                 "762",
                 "1930",
                 "779",
                 "825",
                 "788",
                 "778",
                 "818",
                 "763",
                 "759",
                 "761",
                 "773",
                 "792",
                 "774",
                 "828",
                 "8601",
                 "815",
                 "765",
                 "799",
                 "760",
                 "816",
                 "771",
                 "1060",
                 "805",
                 "804"
             ],
    "results":  {
                    "0:0":  "764",
                    "0:8":  "761",
                    "0:10":  "828",
                    "0:11":  "815"
                },
    "scores":  {
                   "0:0":  {
                               "a":  2,
                               "b":  1
                           },
                   "0:8":  {
                               "a":  1,
                               "b":  1
                           },
                   "0:10":  {
                                "a":  0,
                                "b":  1
                            },
                   "0:11":  {
                                "a":  1,
                                "b":  1
                            }
               },
    "dates":  {
                  "0:10":  "2026-06-28T19:00:00Z",
                  "0:0":  "2026-06-29T17:00:00Z",
                  "0:8":  "2026-06-29T20:30:00Z",
                  "0:11":  "2026-06-30T01:00:00Z",
                  "0:1":  "2026-06-30T17:00:00Z",
                  "0:9":  "2026-06-30T21:00:00Z",
                  "0:2":  "2026-07-01T01:00:00Z",
                  "0:3":  "2026-07-01T16:00:00Z",
                  "0:15":  "2026-07-01T20:00:00Z",
                  "0:14":  "2026-07-02T00:00:00Z",
                  "0:13":  "2026-07-02T19:00:00Z",
                  "0:12":  "2026-07-02T23:00:00Z",
                  "0:6":  "2026-07-03T03:00:00Z",
                  "0:5":  "2026-07-03T18:00:00Z",
                  "0:4":  "2026-07-03T22:00:00Z",
                  "0:7":  "2026-07-04T01:30:00Z",
                  "1:5":  "2026-07-04T17:00:00Z",
                  "1:4":  "2026-07-04T21:00:00Z",
                  "1:0":  "2026-07-05T20:00:00Z"
              },
    "finished":  4,
    "total":  31,
    "lastUpdated":  "2026-06-30T15:24:17.250Z"
};

