'use client'

import React, { useState } from 'react'
import { TaxCalculation, formatCurrency, formatPercent, STATE_TAX_INFO } from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'

interface TaxCalculationDetailsProps {
  taxes: TaxCalculation;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function TaxCalculationDetails({ taxes, isExpanded = false, onToggle }: TaxCalculationDetailsProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const toggleExpanded = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  const stateName = taxes.stateCode ? STATE_TAX_INFO[taxes.stateCode]?.name || taxes.stateCode : null;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-red-500/20 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={toggleExpanded}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-slate-200">Tax Calculation Details</h4>
            <p className="text-xs text-slate-500">See exactly how your <SimpleTrackedValue value={taxes.totalTax} name="Total Tax Burden" description="Sum of all taxes: Federal + State + FICA" formula="Federal Tax + State Tax + Social Security + Medicare" className="text-slate-500" /> tax burden is calculated</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-6">
          {/* Summary Overview */}
          <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b border-slate-700">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Gross Income</p>
              <SimpleTrackedValue value={taxes.grossIncome} name="Gross Income" description="Total income before any deductions" formula="Annual Salary + Other Income" className="text-lg font-mono text-slate-200" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Total Tax</p>
              <SimpleTrackedValue value={taxes.totalTax} name="Total Tax" description="All taxes combined" formula="Federal + State + FICA" inputs={[{ name: 'Federal', value: taxes.federalTax, unit: '$' }, { name: 'State', value: taxes.stateTax, unit: '$' }, { name: 'FICA', value: taxes.fica.totalFicaTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Net Income</p>
              <SimpleTrackedValue value={taxes.netIncome} name="Net Income" description="Take-home pay after all deductions and taxes" formula="Gross - Pre-Tax - Total Taxes" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }, { name: 'Taxes', value: taxes.totalTax, unit: '$' }]} className="text-lg font-mono text-emerald-400" />
            </div>
          </div>

          {/* Step 1: Pre-tax Deductions */}
          {taxes.totalPreTaxContributions > 0 && (
            <div>
              <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Pre-tax Deductions
              </h5>
              <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gross Income</span>
                  <SimpleTrackedValue value={taxes.grossIncome} name="Gross Income" description="Total income before deductions" formula="Annual Salary" className="font-mono text-slate-200" />
                </div>
                {taxes.preTaxContributions.traditional401k > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− 401(k) Contribution</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.traditional401k} name="401(k) Contribution" description="Pre-tax contribution to 401(k) retirement account" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.traditionalIRA > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Traditional IRA</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.traditionalIRA} name="Traditional IRA" description="Pre-tax contribution to Traditional IRA" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.hsa > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− HSA Contribution</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.hsa} name="HSA Contribution" description="Pre-tax contribution to Health Savings Account" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.other > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Other Pre-tax</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.other} name="Other Pre-tax" description="Other pre-tax deductions" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Adjusted Gross Income (AGI)</span>
                  <SimpleTrackedValue value={taxes.adjustedGrossIncome} name="Adjusted Gross Income" description="Gross income minus pre-tax deductions" formula="Gross Income - Pre-Tax Contributions" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }]} className="font-mono text-slate-200" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Federal Tax */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '2' : '1'}
              </span>
              Federal Income Tax
            </h5>
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
              {/* Standard Deduction */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {taxes.totalPreTaxContributions > 0 ? 'Adjusted Gross Income' : 'Gross Income'}
                  </span>
                  <SimpleTrackedValue
                    value={taxes.totalPreTaxContributions > 0 ? taxes.adjustedGrossIncome : taxes.grossIncome}
                    name={taxes.totalPreTaxContributions > 0 ? "Adjusted Gross Income" : "Gross Income"}
                    description={taxes.totalPreTaxContributions > 0 ? "Income after pre-tax deductions" : "Total income before deductions"}
                    formula={taxes.totalPreTaxContributions > 0 ? "Gross Income - Pre-Tax Contributions" : "Annual Salary"}
                    className="font-mono text-slate-200"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">− Standard Deduction ({taxes.filingStatus.replace('_', ' ')})</span>
                  <span className="font-mono text-blue-400">−<SimpleTrackedValue value={taxes.federalStandardDeduction} name="Federal Standard Deduction" description={`Standard deduction for ${taxes.filingStatus.replace('_', ' ')} filing status`} formula="IRS Standard Deduction Amount" className="text-blue-400" /></span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Federal Taxable Income</span>
                  <SimpleTrackedValue value={taxes.federalTaxableIncome} name="Federal Taxable Income" description="Income subject to federal tax after deductions" formula="AGI - Standard Deduction" inputs={[{ name: 'AGI', value: taxes.adjustedGrossIncome, unit: '$' }, { name: 'Std Deduction', value: taxes.federalStandardDeduction, unit: '$' }]} className="font-mono text-slate-200" />
                </div>
              </div>

              {/* Bracket Breakdown */}
              {taxes.federalBracketBreakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase mb-2">Federal Tax Brackets</p>
                  <div className="space-y-1">
                    {taxes.federalBracketBreakdown.map((bracket, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-16 text-slate-500">
                          {formatPercent(bracket.rate, 0)} rate
                        </div>
                        <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/30 rounded"
                            style={{
                              width: `${Math.min(100, (bracket.taxableInBracket / taxes.federalTaxableIncome) * 100)}%`
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-2">
                            <span className="text-slate-400">
                              <SimpleTrackedValue value={bracket.bracketMin} name={`Bracket ${idx + 1} Min`} description={`Lower bound of ${formatPercent(bracket.rate, 0)} tax bracket`} formula="IRS Tax Bracket" decimals={0} className="text-slate-400" /> – {bracket.bracketMax === Infinity ? '∞' : <SimpleTrackedValue value={bracket.bracketMax} name={`Bracket ${idx + 1} Max`} description={`Upper bound of ${formatPercent(bracket.rate, 0)} tax bracket`} formula="IRS Tax Bracket" decimals={0} className="text-slate-400" />}
                            </span>
                            <SimpleTrackedValue value={bracket.taxableInBracket} name={`Taxable in ${formatPercent(bracket.rate, 0)} Bracket`} description={`Amount of income taxed at ${formatPercent(bracket.rate, 0)}`} formula={`min(Income in bracket, Bracket size)`} decimals={0} className="text-slate-300 font-mono" />
                          </div>
                        </div>
                        <div className="w-20 text-right font-mono text-red-400">
                          <SimpleTrackedValue value={bracket.taxFromBracket} name={`Tax from ${formatPercent(bracket.rate, 0)} Bracket`} description={`Tax calculated from income in this bracket`} formula={`${formatCurrency(bracket.taxableInBracket, 0)} × ${formatPercent(bracket.rate, 0)}`} className="text-red-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Federal Tax Total */}
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-slate-300">Federal Tax</span>
                    <span className="text-xs text-slate-500 ml-2">
                      (Marginal: {formatPercent(taxes.marginalFederalRate)} • Effective: {formatPercent(taxes.effectiveFederalRate)})
                    </span>
                  </div>
                  <SimpleTrackedValue value={taxes.federalTax} name="Federal Income Tax" description="Total federal income tax from all brackets" formula="Sum of tax from each bracket" inputs={taxes.federalBracketBreakdown.map((b, i) => ({ name: `${formatPercent(b.rate, 0)} bracket`, value: b.taxFromBracket, unit: '$' }))} className="text-lg font-mono text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: State Tax */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '3' : '2'}
              </span>
              State Income Tax {stateName && <span className="text-slate-500 font-normal">({stateName})</span>}
            </h5>
            <div className="bg-slate-800/30 rounded-lg p-4">
              {taxes.stateTaxType === 'none' ? (
                <div className="text-center py-4">
                  <p className="text-emerald-400 font-medium">No State Income Tax</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stateName || 'Your state'} does not have a state income tax
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* State Deductions */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Adjusted Gross Income</span>
                      <SimpleTrackedValue value={taxes.adjustedGrossIncome} name="AGI for State Tax" description="Adjusted gross income used for state tax calculation" formula="Gross - Pre-Tax Contributions" className="font-mono text-slate-200" />
                    </div>
                    {taxes.stateStandardDeduction > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− State Standard Deduction</span>
                        <span className="font-mono text-purple-400">−<SimpleTrackedValue value={taxes.stateStandardDeduction} name="State Standard Deduction" description="State-specific standard deduction amount" formula="State Tax Rules" className="text-purple-400" /></span>
                      </div>
                    )}
                    {taxes.statePersonalExemption > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Personal Exemption</span>
                        <span className="font-mono text-purple-400">−<SimpleTrackedValue value={taxes.statePersonalExemption} name="Personal Exemption" description="State personal exemption amount" formula="State Tax Rules" className="text-purple-400" /></span>
                      </div>
                    )}
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                      <span className="text-slate-300">State Taxable Income</span>
                      <SimpleTrackedValue value={taxes.stateTaxableIncome} name="State Taxable Income" description="Income subject to state tax" formula="AGI - State Deductions - Exemptions" className="font-mono text-slate-200" />
                    </div>
                  </div>

                  {/* State Bracket Breakdown */}
                  {taxes.stateBracketBreakdown.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        {taxes.stateTaxType === 'flat' ? 'Flat Rate' : 'State Tax Brackets'}
                      </p>
                      <div className="space-y-1">
                        {taxes.stateBracketBreakdown.map((bracket, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="w-16 text-slate-500">
                              {formatPercent(bracket.rate, 1)} rate
                            </div>
                            <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-purple-500/30 rounded"
                                style={{
                                  width: `${Math.min(100, taxes.stateTaxableIncome > 0 ? (bracket.taxableInBracket / taxes.stateTaxableIncome) * 100 : 0)}%`
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-2">
                                <span className="text-slate-400">
                                  {taxes.stateTaxType === 'flat' ? 'All income' :
                                    <><SimpleTrackedValue value={bracket.bracketMin} name={`State Bracket ${idx+1} Min`} description="Lower bound of state tax bracket" formula="State Tax Rules" decimals={0} className="text-slate-400" /> – {bracket.bracketMax === Infinity ? '∞' : <SimpleTrackedValue value={bracket.bracketMax} name={`State Bracket ${idx+1} Max`} description="Upper bound of state tax bracket" formula="State Tax Rules" decimals={0} className="text-slate-400" />}</>
                                  }
                                </span>
                                <SimpleTrackedValue value={bracket.taxableInBracket} name={`Taxable in ${formatPercent(bracket.rate, 1)} State Bracket`} description="Amount of income taxed at this rate" formula="Income in bracket" decimals={0} className="text-slate-300 font-mono" />
                              </div>
                            </div>
                            <div className="w-20 text-right font-mono text-red-400">
                              <SimpleTrackedValue value={bracket.taxFromBracket} name={`State Tax from ${formatPercent(bracket.rate, 1)} Bracket`} description={`Tax at ${formatPercent(bracket.rate, 1)} rate`} formula={`${formatCurrency(bracket.taxableInBracket, 0)} × ${formatPercent(bracket.rate, 1)}`} className="text-red-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State Tax Total */}
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-slate-300">State Tax</span>
                        <span className="text-xs text-slate-500 ml-2">
                          (Marginal: {formatPercent(taxes.marginalStateRate)} • Effective: {formatPercent(taxes.effectiveStateRate)})
                        </span>
                      </div>
                      <SimpleTrackedValue value={taxes.stateTax} name="State Income Tax" description="Total state income tax" formula="Sum of tax from state brackets" className="text-lg font-mono text-red-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: FICA Taxes */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '4' : '3'}
              </span>
              FICA Taxes (Social Security + Medicare)
            </h5>
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-4">
              {/* Social Security */}
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Social Security ({formatPercent(taxes.fica.socialSecurityRate)})</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Wages Subject to SS</span>
                    <span className="font-mono text-slate-200">
                      <SimpleTrackedValue value={taxes.fica.socialSecurityWages} name="Social Security Wages" description="Wages subject to Social Security tax (capped at wage base)" formula={`min(Gross Income, SS Wage Cap)`} className="text-slate-200" />
                      {taxes.fica.wagesAboveSsCap > 0 && (
                        <span className="text-slate-500 text-xs ml-1">(capped at <SimpleTrackedValue value={taxes.fica.socialSecurityWageCap} name="SS Wage Cap" description="Social Security wage base limit for the year" formula="IRS Annual Limit" className="text-slate-500" />)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">× {formatPercent(taxes.fica.socialSecurityRate)} rate</span>
                    <SimpleTrackedValue value={taxes.fica.socialSecurityTax} name="Social Security Tax" description="Employee portion of Social Security tax" formula={`SS Wages × ${formatPercent(taxes.fica.socialSecurityRate)}`} inputs={[{ name: 'SS Wages', value: taxes.fica.socialSecurityWages, unit: '$' }, { name: 'Rate', value: `${taxes.fica.socialSecurityRate}%` }]} className="font-mono text-red-400" />
                  </div>
                  {taxes.fica.wagesAboveSsCap > 0 && (
                    <p className="text-xs text-emerald-400">
                      You saved <SimpleTrackedValue value={taxes.fica.wagesAboveSsCap * (taxes.fica.socialSecurityRate / 100)} name="SS Tax Savings" description="Tax saved due to SS wage cap" formula={`Wages Above Cap × SS Rate`} className="text-emerald-400" /> because <SimpleTrackedValue value={taxes.fica.wagesAboveSsCap} name="Wages Above SS Cap" description="Income exceeding the Social Security wage base" formula="Gross - SS Wage Cap" className="text-emerald-400" /> of your income exceeds the SS wage cap
                    </p>
                  )}
                </div>
              </div>

              {/* Medicare */}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Medicare</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">All Wages × {formatPercent(taxes.fica.medicareBaseRate)} base rate</span>
                    <SimpleTrackedValue value={taxes.fica.medicareBaseTax} name="Medicare Base Tax" description="Base Medicare tax on all wages" formula={`Gross Income × ${formatPercent(taxes.fica.medicareBaseRate)}`} className="font-mono text-red-400" />
                  </div>
                  {taxes.fica.additionalMedicareTax > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Wages above <SimpleTrackedValue value={taxes.fica.additionalMedicareThreshold} name="Additional Medicare Threshold" description="Income threshold for additional Medicare tax" formula="IRS Threshold" className="text-slate-400" /> × {formatPercent(taxes.fica.additionalMedicareRate)} additional rate
                        </span>
                        <SimpleTrackedValue value={taxes.fica.additionalMedicareTax} name="Additional Medicare Tax" description="Additional Medicare tax on high earners" formula={`Wages Above Threshold × ${formatPercent(taxes.fica.additionalMedicareRate)}`} className="font-mono text-red-400" />
                      </div>
                      <p className="text-xs text-amber-400">
                        Additional Medicare Tax applies to <SimpleTrackedValue value={taxes.fica.additionalMedicareWages} name="Wages Subject to Additional Medicare" description="Income above the threshold" formula="Gross - Threshold" className="text-amber-400" /> of income above the <SimpleTrackedValue value={taxes.fica.additionalMedicareThreshold} name="Additional Medicare Threshold" description="Income threshold" formula="IRS Rules" className="text-amber-400" /> threshold
                      </p>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-medium border-t border-slate-700 pt-2">
                    <span className="text-slate-300">Total Medicare Tax</span>
                    <SimpleTrackedValue value={taxes.fica.totalMedicareTax} name="Total Medicare Tax" description="Base Medicare + Additional Medicare tax" formula="Base Medicare + Additional Medicare" inputs={[{ name: 'Base', value: taxes.fica.medicareBaseTax, unit: '$' }, { name: 'Additional', value: taxes.fica.additionalMedicareTax, unit: '$' }]} className="font-mono text-red-400" />
                  </div>
                </div>
              </div>

              {/* FICA Total */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-slate-300">Total FICA</span>
                    <span className="text-xs text-slate-500 ml-2">
                      (Effective: {formatPercent(taxes.fica.effectiveFicaRate)})
                    </span>
                  </div>
                  <SimpleTrackedValue value={taxes.fica.totalFicaTax} name="Total FICA Tax" description="Combined Social Security and Medicare taxes" formula="Social Security Tax + Total Medicare Tax" inputs={[{ name: 'SS Tax', value: taxes.fica.socialSecurityTax, unit: '$' }, { name: 'Medicare', value: taxes.fica.totalMedicareTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Final Summary */}
          <div className="bg-gradient-to-br from-red-500/10 to-amber-500/10 rounded-lg p-4 border border-red-500/30">
            <h5 className="text-sm font-medium text-slate-200 mb-3">Tax Summary</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Federal Income Tax</span>
                <SimpleTrackedValue value={taxes.federalTax} name="Federal Income Tax" description="Total federal income tax" formula="Sum of tax from all federal brackets" className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">State Income Tax</span>
                <SimpleTrackedValue value={taxes.stateTax} name="State Income Tax" description="Total state income tax" formula="Sum of tax from state brackets" className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Social Security</span>
                <SimpleTrackedValue value={taxes.fica.socialSecurityTax} name="Social Security Tax" description="Employee Social Security tax" formula={`min(Wages, SS Cap) × ${formatPercent(taxes.fica.socialSecurityRate)}`} className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medicare</span>
                <SimpleTrackedValue value={taxes.fica.totalMedicareTax} name="Medicare Tax" description="Base + Additional Medicare tax" formula="Base Medicare + Additional Medicare" className="font-mono text-red-400" />
              </div>
              <div className="border-t border-red-500/30 pt-2 mt-2 flex justify-between font-medium">
                <span className="text-slate-200">Total Tax Burden</span>
                <SimpleTrackedValue value={taxes.totalTax} name="Total Tax Burden" description="All taxes combined" formula="Federal + State + Social Security + Medicare" inputs={[{ name: 'Federal', value: taxes.federalTax, unit: '$' }, { name: 'State', value: taxes.stateTax, unit: '$' }, { name: 'SS', value: taxes.fica.socialSecurityTax, unit: '$' }, { name: 'Medicare', value: taxes.fica.totalMedicareTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Effective Total Tax Rate</span>
                <SimpleTrackedValue value={taxes.effectiveTotalRate} name="Effective Total Tax Rate" description="Total taxes as percentage of gross income" formula="Total Taxes ÷ Gross Income × 100" inputs={[{ name: 'Total Taxes', value: taxes.totalTax, unit: '$' }, { name: 'Gross Income', value: taxes.grossIncome, unit: '$' }]} formatAs="percent" decimals={1} className="font-mono text-slate-500" />
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-emerald-400">Net Income After Taxes</span>
                <p className="text-xs text-slate-500 mt-1">
                  <SimpleTrackedValue value={taxes.monthlyNetIncome} name="Monthly Net Income" description="Monthly take-home pay" formula="Annual Net Income ÷ 12" className="text-slate-500" />/month • <SimpleTrackedValue value={taxes.monthlyNetIncome / 4.33} name="Weekly Net Income" description="Weekly take-home pay" formula="Monthly Net Income ÷ 4.33" className="text-slate-500" />/week
                </p>
              </div>
              <SimpleTrackedValue value={taxes.netIncome} name="Annual Net Income" description="Total take-home pay after all taxes" formula="Gross Income - Pre-Tax Contributions - Total Taxes" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }, { name: 'Taxes', value: taxes.totalTax, unit: '$' }]} className="text-2xl font-mono text-emerald-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
