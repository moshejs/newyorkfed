// Verbatim responses from the live NY Fed Markets Data API
// (https://markets.newyorkfed.org), fetched 2026-10-10:
//   sofrNA      — /api/rates/secured/sofr/last/0.json, 2021-08-04..06 (08-05 has "NA" percentiles)
//   effrRevised — /api/rates/unsecured/effr/last/0.json, two rows with revisionIndicator "r"
//   latest      — /api/rates/all/latest.json
//   repoLast2   — /api/rp/all/all/results/last/2.json
export const sofrNA = {
  "refRates": [
    {
      "effectiveDate": "2021-08-06",
      "type": "SOFR",
      "percentRate": 0.05,
      "percentPercentile1": 0.02,
      "percentPercentile25": 0.05,
      "percentPercentile75": 0.06,
      "percentPercentile99": 0.15,
      "volumeInBillions": 891,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2021-08-05",
      "type": "SOFR",
      "percentRate": 0.05,
      "percentPercentile1": "NA",
      "percentPercentile25": "NA",
      "percentPercentile75": "NA",
      "percentPercentile99": "NA",
      "volumeInBillions": 901,
      "revisionIndicator": "",
      "footnoteId": 2
    },
    {
      "effectiveDate": "2021-08-04",
      "type": "SOFR",
      "percentRate": 0.05,
      "percentPercentile1": 0.02,
      "percentPercentile25": 0.05,
      "percentPercentile75": 0.06,
      "percentPercentile99": 0.15,
      "volumeInBillions": 926,
      "revisionIndicator": ""
    }
  ]
};

export const effrRevised = {
  "refRates": [
    {
      "effectiveDate": "2017-05-31",
      "type": "EFFR",
      "percentRate": 0.83,
      "percentPercentile1": 0.81,
      "percentPercentile25": 0.82,
      "percentPercentile75": 0.83,
      "percentPercentile99": 1.05,
      "targetRateFrom": 0.75,
      "targetRateTo": 1.0,
      "volumeInBillions": 79,
      "revisionIndicator": "r"
    },
    {
      "effectiveDate": "2008-12-19",
      "type": "EFFR",
      "percentRate": 0.11,
      "targetRateFrom": 0.0,
      "targetRateTo": 0.25,
      "intraDayLow": 0.01,
      "intraDayHigh": 0.5,
      "stdDeviation": 0.08,
      "revisionIndicator": "r"
    }
  ]
};

export const latest = {
  "refRates": [
    {
      "effectiveDate": "2026-10-09",
      "type": "SOFRAI",
      "average30day": 3.81569,
      "average90day": 3.70963,
      "average180day": 3.68823,
      "index": 1.26208139,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2026-10-08",
      "type": "EFFR",
      "percentRate": 3.88,
      "percentPercentile1": 3.85,
      "percentPercentile25": 3.87,
      "percentPercentile75": 3.88,
      "percentPercentile99": 3.89,
      "targetRateFrom": 3.75,
      "targetRateTo": 4.0,
      "volumeInBillions": 117,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2026-10-08",
      "type": "OBFR",
      "percentRate": 3.88,
      "percentPercentile1": 3.8,
      "percentPercentile25": 3.87,
      "percentPercentile75": 3.88,
      "percentPercentile99": 3.95,
      "volumeInBillions": 241,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2026-10-08",
      "type": "TGCR",
      "percentRate": 3.85,
      "percentPercentile1": 3.8,
      "percentPercentile25": 3.84,
      "percentPercentile75": 3.86,
      "percentPercentile99": 3.89,
      "volumeInBillions": 1189,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2026-10-08",
      "type": "BGCR",
      "percentRate": 3.85,
      "percentPercentile1": 3.8,
      "percentPercentile25": 3.84,
      "percentPercentile75": 3.86,
      "percentPercentile99": 3.91,
      "volumeInBillions": 1228,
      "revisionIndicator": ""
    },
    {
      "effectiveDate": "2026-10-08",
      "type": "SOFR",
      "percentRate": 3.87,
      "percentPercentile1": 3.83,
      "percentPercentile25": 3.85,
      "percentPercentile75": 3.91,
      "percentPercentile99": 3.95,
      "volumeInBillions": 2963,
      "revisionIndicator": ""
    }
  ]
};

export const repoLast2 = {
  "repo": {
    "operations": [
      {
        "operationId": "RP 100926 26",
        "auctionStatus": "Results",
        "operationDate": "2026-10-09",
        "settlementDate": "2026-10-09",
        "maturityDate": "2026-10-13",
        "operationType": "Repo",
        "operationMethod": "Full Allotment",
        "settlementType": "Same Day",
        "termCalenderDays": 4,
        "term": "Overnight",
        "releaseTime": "08:15",
        "closeTime": "08:30",
        "note": "",
        "lastUpdated": "2026-10-09 08:32:12",
        "totalAmtSubmitted": 0,
        "totalAmtAccepted": 0,
        "details": [
          {
            "securityType": "Treasury",
            "amtSubmitted": 0,
            "amtAccepted": 0,
            "percentOfferingRate": 4.0
          },
          {
            "securityType": "Agency",
            "amtSubmitted": 0,
            "amtAccepted": 0,
            "percentOfferingRate": 4.0
          },
          {
            "securityType": "Mortgage-Backed",
            "amtSubmitted": 0,
            "amtAccepted": 0,
            "percentOfferingRate": 4.0
          }
        ]
      },
      {
        "operationId": "RP 100926 25",
        "auctionStatus": "Results",
        "operationDate": "2026-10-09",
        "settlementDate": "2026-10-09",
        "maturityDate": "2026-10-13",
        "operationType": "Reverse Repo",
        "operationMethod": "Fixed Rate",
        "settlementType": "Same Day",
        "termCalenderDays": 4,
        "term": "Overnight",
        "releaseTime": "12:45",
        "closeTime": "13:15",
        "note": "",
        "lastUpdated": "2026-10-09 13:15:25",
        "participatingCpty": 1,
        "acceptedCpty": 1,
        "totalAmtSubmitted": 300000000,
        "totalAmtAccepted": 300000000,
        "details": [
          {
            "securityType": "Treasury",
            "amtSubmitted": 300000000,
            "amtAccepted": 300000000,
            "percentOfferingRate": 3.75,
            "percentAwardRate": 3.75
          }
        ]
      }
    ]
  }
};
