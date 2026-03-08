'use client'

import React, { useState, useMemo } from 'react'
import {
  formatCurrency,
  calculateScenarioIncome,
  STATE_TAX_INFO,
  FilingStatus,
  ScenarioIncomeBreakdown,
  DEFAULT_BUCKET_RATES,
} from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'
import type { Scenario, StableProjectionResult } from '../../lib/machines/types'
import { SCENARIO_TEMPLATES } from '../../lib/machines/types'
import type { ScenarioActions } from '../../lib/hooks/useScenarioActions'
import { TaxCalculationDetails } from './TaxCalculationDetails'

export function ScenarioEditor({
  scenario,
  onClose,
  onSave,
  scenarios,
  stableProjections,
  actions,
}: {
  scenario: Scenario;
  onClose: () => void;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
  scenarios: Scenario[];
  stableProjections: StableProjectionResult[];
  actions: ScenarioActions;
}) {
  const isNewScenario = !scenario._id;

  const [form, setForm] = useState({
    name: scenario.name,
    grossIncome: scenario.grossIncome?.toString() || '',
    incomeGrowthRate: scenario.incomeGrowthRate?.toString() || '3',
    filingStatus: scenario.filingStatus || 'single',
    stateCode: scenario.stateCode || '',
    preTax401k: scenario.preTax401k?.toString() || '',
    preTaxIRA: scenario.preTaxIRA?.toString() || '',
    preTaxHSA: scenario.preTaxHSA?.toString() || '',
    preTaxOther: scenario.preTaxOther?.toString() || '',
    baseMonthlyBudget: scenario.baseMonthlyBudget?.toString() || '3000',
    spendingGrowthRate: scenario.spendingGrowthRate?.toString() || '0.5',
    currentRate: scenario.currentRate?.toString() || '7',
    swr: scenario.swr?.toString() || '4',
    inflationRate: scenario.inflationRate?.toString() || '3',
    cashRate: scenario.cashRate?.toString() || '',
    retirementRate: scenario.retirementRate?.toString() || '',
    hsaRate: scenario.hsaRate?.toString() || '',
    brokerageRate: scenario.brokerageRate?.toString() || '',
    debtRate: scenario.debtRate?.toString() || '',
  });

  const [showBucketRates, setShowBucketRates] = useState(
    !!(scenario.cashRate || scenario.retirementRate || scenario.hsaRate || scenario.brokerageRate || scenario.debtRate)
  );

  const [saving, setSaving] = useState(false);

  // Get current net worth from stable projections (no real-time dependency needed)
  const currentNetWorth = stableProjections[0]?.projections[0]?.netWorth || 0;

  // Calculate live income breakdown when income is entered
  const liveBreakdown = useMemo((): ScenarioIncomeBreakdown | null => {
    const gross = parseFloat(form.grossIncome) || 0;
    if (gross <= 0) return null;

    const baseBudget = parseFloat(form.baseMonthlyBudget) || 3000;
    const spendingRate = parseFloat(form.spendingGrowthRate) || 0;
    const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
    const totalSpending = baseBudget + netWorthPortion;

    return calculateScenarioIncome(
      gross,
      form.filingStatus as FilingStatus,
      form.stateCode || null,
      {
        traditional401k: parseFloat(form.preTax401k) || 0,
        traditionalIRA: parseFloat(form.preTaxIRA) || 0,
        hsa: parseFloat(form.preTaxHSA) || 0,
        other: parseFloat(form.preTaxOther) || 0,
      },
      totalSpending,
      currentNetWorth
    );
  }, [form, currentNetWorth]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: form.name || 'New Scenario',
        currentRate: parseFloat(form.currentRate) || 7,
        swr: parseFloat(form.swr) || 4,
        inflationRate: parseFloat(form.inflationRate) || 3,
        baseMonthlyBudget: parseFloat(form.baseMonthlyBudget) || 3000,
        spendingGrowthRate: parseFloat(form.spendingGrowthRate) || 0.5,
      };

      // Optional income fields
      const grossIncome = parseFloat(form.grossIncome);
      if (grossIncome > 0 && liveBreakdown) {
        updates.grossIncome = grossIncome;
        updates.incomeGrowthRate = parseFloat(form.incomeGrowthRate) || 3;
        updates.filingStatus = form.filingStatus as FilingStatus;
        updates.stateCode = form.stateCode || undefined;
        updates.preTax401k = parseFloat(form.preTax401k) || 0;
        updates.preTaxIRA = parseFloat(form.preTaxIRA) || 0;
        updates.preTaxHSA = parseFloat(form.preTaxHSA) || 0;
        updates.preTaxOther = parseFloat(form.preTaxOther) || 0;
        updates.yearlyContribution = liveBreakdown.totalAnnualSavings;
        updates.effectiveTaxRate = liveBreakdown.taxes.effectiveTotalRate;
      } else {
        updates.yearlyContribution = 0;
      }

      // Per-bucket growth rate overrides
      if (showBucketRates) {
        const cashRate = parseFloat(form.cashRate);
        const retirementRate = parseFloat(form.retirementRate);
        const hsaRate = parseFloat(form.hsaRate);
        const brokerageRate = parseFloat(form.brokerageRate);
        const debtRate = parseFloat(form.debtRate);
        if (!isNaN(cashRate)) updates.cashRate = cashRate;
        if (!isNaN(retirementRate)) updates.retirementRate = retirementRate;
        if (!isNaN(hsaRate)) updates.hsaRate = hsaRate;
        if (!isNaN(brokerageRate)) updates.brokerageRate = brokerageRate;
        if (!isNaN(debtRate)) updates.debtRate = debtRate;
      }

      if (isNewScenario) {
        await actions.createScenario(updates);
      } else {
        await onSave(updates);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: typeof SCENARIO_TEMPLATES[number]) => {
    setForm(prev => ({
      ...prev,
      currentRate: template.currentRate.toString(),
      swr: template.swr.toString(),
      inflationRate: template.inflationRate.toString(),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#0f1629] rounded-xl border border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f1629] border-b border-slate-800 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-200">
            {isNewScenario ? 'Create New Scenario' : `Edit: ${scenario.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Basic Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., Conservative Plan"
                />
              </div>
            </div>
          </section>

          {/* Investment Assumptions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Investment Assumptions</h3>
              <div className="flex gap-2">
                <button onClick={() => applyTemplate(SCENARIO_TEMPLATES[0])} className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">Conservative</button>
                <button onClick={() => applyTemplate(SCENARIO_TEMPLATES[1])} className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">Moderate</button>
                <button onClick={() => applyTemplate(SCENARIO_TEMPLATES[2])} className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">Aggressive</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Return Rate (%)</label>
                <input type="number" step="0.1" value={form.currentRate} onChange={(e) => setForm({ ...form, currentRate: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">SWR (%)</label>
                <input type="number" step="0.1" value={form.swr} onChange={(e) => setForm({ ...form, swr: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Inflation (%)</label>
                <input type="number" step="0.1" value={form.inflationRate} onChange={(e) => setForm({ ...form, inflationRate: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>

            {/* Per-bucket growth rates */}
            <div className="mt-4">
              <button type="button" onClick={() => setShowBucketRates(!showBucketRates)} className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1">
                <svg className={`w-4 h-4 transition-transform ${showBucketRates ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                Growth Rates by Asset Type
                {!showBucketRates && <span className="text-slate-500 ml-1">(using defaults)</span>}
              </button>
              {showBucketRates && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {([
                    { key: 'cashRate' as const, label: 'Cash', defaultVal: DEFAULT_BUCKET_RATES.cash },
                    { key: 'retirementRate' as const, label: 'Retirement', defaultVal: null },
                    { key: 'hsaRate' as const, label: 'HSA', defaultVal: null },
                    { key: 'brokerageRate' as const, label: 'Brokerage', defaultVal: null },
                    { key: 'debtRate' as const, label: 'Debt Interest', defaultVal: DEFAULT_BUCKET_RATES.debts },
                  ]).map(({ key, label, defaultVal }) => {
                    const effectiveDefault = defaultVal ?? (parseFloat(form.currentRate) || 7);
                    const isDefault = !form[key] || form[key] === effectiveDefault.toString();
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          {label} (%)
                          {isDefault && <span className="text-slate-500 ml-1 text-xs">(default)</span>}
                        </label>
                        <input type="number" step="0.1" value={form[key]} placeholder={effectiveDefault.toString()} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Spending Assumptions */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Spending Assumptions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Base Monthly Budget ($)</label>
                <input type="number" value={form.baseMonthlyBudget} onChange={(e) => setForm({ ...form, baseMonthlyBudget: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Spending Growth Rate (% of NW)</label>
                <input type="number" step="0.1" value={form.spendingGrowthRate} onChange={(e) => setForm({ ...form, spendingGrowthRate: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </section>

          {/* Income & Taxes (Optional) */}
          <section className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Income & Taxes (Optional)</h3>
            <p className="text-sm text-slate-400 mb-4">Add income details for more accurate projections and tax calculations</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gross Income ($)</label>
                  <input type="number" value={form.grossIncome} onChange={(e) => setForm({ ...form, grossIncome: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Annual gross income" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Income Growth (%)</label>
                  <input type="number" step="0.1" value={form.incomeGrowthRate} onChange={(e) => setForm({ ...form, incomeGrowthRate: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              {form.grossIncome && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Filing Status</label>
                      <select value={form.filingStatus} onChange={(e) => setForm({ ...form, filingStatus: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="single">Single</option>
                        <option value="married_jointly">Married Filing Jointly</option>
                        <option value="married_separately">Married Filing Separately</option>
                        <option value="head_of_household">Head of Household</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                      <select value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="">Select State</option>
                        {Object.keys(STATE_TAX_INFO).sort().map((code) => (
                          <option key={code} value={code}>{code} - {STATE_TAX_INFO[code].name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Pre-Tax Retirement Contributions</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">401k/403b ($)</label>
                        <input type="number" value={form.preTax401k} onChange={(e) => setForm({ ...form, preTax401k: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Traditional IRA ($)</label>
                        <input type="number" value={form.preTaxIRA} onChange={(e) => setForm({ ...form, preTaxIRA: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">HSA ($)</label>
                        <input type="number" value={form.preTaxHSA} onChange={(e) => setForm({ ...form, preTaxHSA: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Other Pre-Tax ($)</label>
                        <input type="number" value={form.preTaxOther} onChange={(e) => setForm({ ...form, preTaxOther: e.target.value })} className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Income Breakdown Display */}
              {liveBreakdown && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-200">Income Breakdown</h4>
                  <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Gross Income</span>
                      <SimpleTrackedValue value={liveBreakdown.taxes.grossIncome} name="Gross Income" description="Total annual income before any deductions" formula="Annual Salary + Other Income" className="font-mono text-slate-200" />
                    </div>
                    {liveBreakdown.taxes.totalPreTaxContributions > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">− Pre-tax Contributions</span>
                          <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={liveBreakdown.taxes.totalPreTaxContributions} name="Pre-Tax Contributions" description="Total pre-tax retirement contributions reducing taxable income" formula="401k + Traditional IRA + HSA + Other" className="font-mono text-emerald-400" /></span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                          <span className="text-slate-400">Adjusted Gross Income</span>
                          <SimpleTrackedValue value={liveBreakdown.taxes.adjustedGrossIncome} name="Adjusted Gross Income (AGI)" description="Gross income minus pre-tax contributions" formula="Gross Income - Pre-Tax Contributions" inputs={[{ name: 'Gross Income', value: liveBreakdown.taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: liveBreakdown.taxes.totalPreTaxContributions, unit: '$' }]} className="font-mono text-slate-200" />
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                      <span className="text-slate-400">− Total Taxes</span>
                      <span className="font-mono text-red-400">−<SimpleTrackedValue value={liveBreakdown.taxes.totalTax} name="Total Taxes" description="Combined federal, state, and FICA taxes" formula="Federal Tax + State Tax + Social Security + Medicare" inputs={[{ name: 'Federal', value: liveBreakdown.taxes.federalTax, unit: '$' }, { name: 'State', value: liveBreakdown.taxes.stateTax, unit: '$' }, { name: 'FICA', value: liveBreakdown.taxes.fica.totalFicaTax, unit: '$' }]} className="font-mono text-red-400" /></span>
                    </div>
                    <div className="flex justify-between text-sm text-xs text-slate-500 pl-4">
                      <span>Federal: <SimpleTrackedValue value={liveBreakdown.taxes.federalTax} name="Federal Income Tax" description="Federal income tax calculated using progressive brackets" formula="Sum of (Taxable Income in Bracket × Bracket Rate)" className="text-slate-500" /></span>
                      <span>State: <SimpleTrackedValue value={liveBreakdown.taxes.stateTax} name="State Income Tax" description="State income tax based on your state's rates" formula="State Tax Calculation" className="text-slate-500" /></span>
                      <span>FICA: <SimpleTrackedValue value={liveBreakdown.taxes.fica.totalFicaTax} name="FICA Taxes" description="Social Security and Medicare taxes" formula="Social Security Tax + Medicare Tax" className="text-slate-500" /></span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                      <div>
                        <span className="text-sm font-medium text-emerald-400">Net Income</span>
                        <p className="text-xs text-slate-500">
                          Effective Tax Rate: <SimpleTrackedValue value={liveBreakdown.taxes.effectiveTotalRate} name="Effective Tax Rate" description="Total taxes as a percentage of gross income" formula="Total Taxes ÷ Gross Income × 100" inputs={[{ name: 'Taxes', value: liveBreakdown.taxes.totalTax, unit: '$' }, { name: 'Gross', value: liveBreakdown.taxes.grossIncome, unit: '$' }]} formatAs="percent" decimals={1} className="text-slate-500" />
                        </p>
                      </div>
                      <SimpleTrackedValue value={liveBreakdown.taxes.netIncome} name="Net Income" description="Take-home pay after all taxes and deductions" formula="Gross Income - Pre-Tax Contributions - Total Taxes" inputs={[{ name: 'Gross Income', value: liveBreakdown.taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: liveBreakdown.taxes.totalPreTaxContributions, unit: '$' }, { name: 'Total Taxes', value: liveBreakdown.taxes.totalTax, unit: '$' }]} className="text-lg font-mono text-emerald-400" />
                    </div>
                    <div className="border-t border-slate-700 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Annual Spending</span>
                        <span className="font-mono text-amber-400">−<SimpleTrackedValue value={liveBreakdown.annualSpending} name="Annual Spending" description="Level-based annual spending budget" formula="Monthly Budget × 12" className="font-mono text-amber-400" /></span>
                      </div>
                      <div className="flex justify-between items-center border-t border-emerald-500/30 pt-2">
                        <div>
                          <span className="text-sm font-medium text-emerald-400">Total Annual Savings</span>
                          <p className="text-xs text-slate-500">
                            <SimpleTrackedValue value={liveBreakdown.monthlySavingsAvailable} name="Monthly Savings" description="Monthly savings available after spending" formula="(Net Income - Annual Spending) ÷ 12" className="text-slate-500" />/month
                          </p>
                        </div>
                        <SimpleTrackedValue value={liveBreakdown.totalAnnualSavings} name="Total Annual Savings" description="Amount saved per year after taxes and spending" formula="Net Income - Annual Spending" inputs={[{ name: 'Net Income', value: liveBreakdown.taxes.netIncome, unit: '$' }, { name: 'Annual Spending', value: liveBreakdown.annualSpending, unit: '$' }]} className="text-lg font-mono text-emerald-400" />
                      </div>
                      <p className="text-xs text-center text-slate-500 pt-2">
                        Savings Rate: <SimpleTrackedValue value={liveBreakdown.savingsRateOfGross} name="Savings Rate" description="Percentage of gross income going to savings" formula="Total Annual Savings ÷ Gross Income × 100" formatAs="percent" decimals={1} className="text-emerald-400 font-semibold" /> of gross income
                      </p>
                    </div>
                  </div>
                  <TaxCalculationDetails taxes={liveBreakdown.taxes} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0f1629] border-t border-slate-800 p-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : isNewScenario ? 'Create Scenario' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
