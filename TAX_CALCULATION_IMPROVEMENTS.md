# Tax Calculation Improvements

## Summary

Fixed critical tax calculation issues based on feedback regarding underestimation of taxes for California residents.

## Changes Made

### 1. California HSA Treatment (CRITICAL FIX)
**Issue:** California and New Jersey do NOT allow HSA (Health Savings Account) deductions for state income tax purposes, unlike federal taxes.

**Fix:** Modified `calculateTaxes()` function to add back HSA contributions to AGI when calculating state taxes for CA and NJ.

```typescript
const stateAGI = (stateCode?.toUpperCase() === 'CA' || stateCode?.toUpperCase() === 'NJ')
  ? adjustedGrossIncome + preTaxContributions.hsa
  : adjustedGrossIncome;
```

**Impact:** For a taxpayer with $8,300 in HSA contributions in California, this adds ~$772 in state taxes (at 9.3% marginal rate).

**Sources:**
- [California and New Jersey HSA State Income Tax](https://www.newfront.com/blog/california-and-new-jersey-hsa-state-income-tax-2)
- [HSA State Income Tax Treatment](https://hsaforamerica.com/state-income-tax/)

### 2. California Standard Deduction Update
**Issue:** Standard deduction was outdated ($10,726).

**Fix:** Updated to 2025 values:
- Single: $5,706 (was $5,363)
- Married Filing Jointly: $11,412 (was $10,726)

**Impact:** Reduces CA taxable income by $332 for MFJ, saving ~$31 in taxes.

**Sources:**
- [2025 California Tax Rate Schedules](https://www.ftb.ca.gov/forms/2025/2025-540-tax-rate-schedules.pdf)
- [California State Income Tax Brackets 2024-2025](https://virtuecpas.com/california-state-income-tax-brackets/)

### 3. Added State AGI Tracking
**Enhancement:** Added `stateAdjustedGrossIncome` field to `TaxCalculation` interface to make it clear when state AGI differs from federal AGI.

## Test Case: $650k Income in California (MFJ)

**Scenario:**
- Gross Income: $650,000
- Filing Status: Married Filing Jointly
- State: California
- Pre-tax 401(k): $23,000
- Pre-tax HSA: $8,300

**Results After Fixes:**
```
Federal AGI: $618,700 (gross - 401k - HSA)
CA AGI: $627,000 (gross - 401k only, HSA not deductible)
Federal Taxable: $588,700
CA Taxable: $615,588

Federal Tax: $145,139.50
CA Tax: $50,555.38
FICA: $23,943.20
Total Tax: $219,638.08
Effective Rate: 33.79%
```

## Tax Bracket Verification

### Federal 2025 Tax Brackets (MFJ)
Our calculations use the official 2025 IRS brackets:
- 10%: $0 - $23,850
- 12%: $23,850 - $96,950
- 22%: $96,950 - $206,700
- 24%: $206,700 - $394,600
- 32%: $394,600 - $501,050
- 35%: $501,050 - $751,600
- 37%: Over $751,600

**Source:** [2025 Federal Income Tax Brackets](https://taxfoundation.org/data/all/federal/2025-tax-brackets/)

### California 2025 Tax Brackets (MFJ)
Our calculations use the official 2025 California FTB brackets:
- 1%: $0 - $20,824
- 2%: $20,824 - $49,368
- 4%: $49,368 - $77,918
- 6%: $77,918 - $108,162
- 8%: $108,162 - $136,700
- 9.3%: $136,700 - $698,274
- 10.3%: $698,274 - $837,922
- 11.3%: $837,922 - $1,396,542
- 12.3%: $1,396,542 - $2,000,000
- 13.3%: Over $2,000,000 (includes Mental Health Services Tax)

**Source:** [California Income Tax Brackets 2024-2025](https://www.nerdwallet.com/taxes/learn/california-state-tax)

## Notes on Tax Estimate Variations

Tax calculations can vary based on several factors not included in this simplified calculator:

1. **Additional Taxes Not Included:**
   - California State Disability Insurance (SDI): 1.2% on all wages (effective 2024) - adds ~$7,800 for $650k income
   - Local/city taxes in some jurisdictions
   - Alternative Minimum Tax (AMT) considerations
   - Additional Medicare tax nuances

2. **Conservative Estimates:**
   - Professional tax advisors often use conservative (higher) estimates for planning purposes
   - May include safety margins for tax planning

3. **Tax Year Differences:**
   - 2024 vs 2025 bracket differences
   - Pending legislation that might affect 2025 rates

4. **Individual Circumstances:**
   - Itemized deductions vs standard deduction
   - Tax credits
   - State-specific adjustments
   - Multiple income sources

## Validation

Our calculations match official tax brackets from:
- IRS 2025 tax bracket schedules
- California Franchise Tax Board 2025 rate schedules

The implementation correctly applies progressive tax calculations and handles state-specific rules like California's HSA treatment.

## Recommendations for Users

For the most accurate tax estimates:
1. Use this calculator for general planning
2. Consult with a CPA or tax professional for detailed planning
3. Consider SDI and other payroll taxes in California (not included in "income tax")
4. Review actual tax liability after year-end when all forms are available
5. Account for withholding adjustments throughout the year
