'use client';

import { useState, useEffect } from 'react';

// 2024 contribution limits
const CONTRIBUTION_LIMITS = {
  ira401k: 23000,
  hsa: 4150,
  hsaFamily: 8300,
  ira: 7000,
};

export interface CashFlowData {
  grossAnnualIncome: number;
  preTax401k: number;
  preTaxHsa: number;
  preTaxTraditionalIra: number;
  preTaxOther: number;
  effectiveTaxRate: number;
  postTaxRoth: number;
  postTaxBrokerage: number;
  postTaxSavings: number;
  postTaxOther: number;
}

interface CashFlowBuilderProps {
  data: CashFlowData;
  onChange: (data: CashFlowData) => void;
  onApply?: (totalSavings: number, monthlyBudget: number) => void;
}

interface CalculatedValues {
  totalPreTaxSavings: number;
  totalPostTaxSavings: number;
  totalSavings: number;
  taxableIncome: number;
  estimatedAnnualTax: number;
  takeHomePay: number;
  annualSpending: number;
  monthlyBudget: number;
  savingsRate: number;
  isBalanced: boolean;
  cashFlowBalance: number;
}

function calculateValues(data: CashFlowData): CalculatedValues {
  const totalPreTaxSavings =
    data.preTax401k + data.preTaxHsa + data.preTaxTraditionalIra + data.preTaxOther;

  const totalPostTaxSavings =
    data.postTaxRoth + data.postTaxBrokerage + data.postTaxSavings + data.postTaxOther;

  const totalSavings = totalPreTaxSavings + totalPostTaxSavings;
  const taxableIncome = data.grossAnnualIncome - totalPreTaxSavings;
  const estimatedAnnualTax = taxableIncome * (data.effectiveTaxRate / 100);
  const takeHomePay = taxableIncome - estimatedAnnualTax;
  const annualSpending = takeHomePay - totalPostTaxSavings;
  const monthlyBudget = annualSpending / 12;
  const savingsRate = data.grossAnnualIncome > 0
    ? (totalSavings / data.grossAnnualIncome) * 100
    : 0;

  const cashFlowBalance = data.grossAnnualIncome - estimatedAnnualTax - totalSavings - annualSpending;
  const isBalanced = Math.abs(cashFlowBalance) < 1;

  return {
    totalPreTaxSavings,
    totalPostTaxSavings,
    totalSavings,
    taxableIncome,
    estimatedAnnualTax,
    takeHomePay,
    annualSpending,
    monthlyBudget,
    savingsRate,
    isBalanced,
    cashFlowBalance,
  };
}

export default function CashFlowBuilder({ data, onChange, onApply }: CashFlowBuilderProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calculateValues(data);

  const updateField = (field: keyof CashFlowData, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const quickFill401k = () => updateField('preTax401k', CONTRIBUTION_LIMITS.ira401k);
  const quickFillHsa = () => updateField('preTaxHsa', CONTRIBUTION_LIMITS.hsa);
  const quickFillRoth = () => updateField('postTaxRoth', CONTRIBUTION_LIMITS.ira);

  const handleApply = () => {
    if (onApply) {
      onApply(calc.totalSavings, calc.monthlyBudget);
    }
  };

  // Warnings
  const warnings = [];
  if (data.preTax401k > CONTRIBUTION_LIMITS.ira401k) {
    warnings.push(`401(k) exceeds limit of $${CONTRIBUTION_LIMITS.ira401k.toLocaleString()}`);
  }
  if (data.preTaxHsa > CONTRIBUTION_LIMITS.hsaFamily) {
    warnings.push(`HSA exceeds family limit of $${CONTRIBUTION_LIMITS.hsaFamily.toLocaleString()}`);
  }
  if (data.postTaxRoth > CONTRIBUTION_LIMITS.ira) {
    warnings.push(`Roth IRA exceeds limit of $${CONTRIBUTION_LIMITS.ira.toLocaleString()}`);
  }
  if (calc.takeHomePay < 0) {
    warnings.push('Take-home pay is negative - adjust savings or tax rate');
  }
  if (calc.annualSpending < 0) {
    warnings.push('Spending is negative - reduce post-tax savings');
  }

  return (
    <div className="border border-slate-600 rounded-lg p-4 bg-slate-800/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Cash Flow Planner
          </h3>
          {calc.totalSavings > 0 && !expanded && (
            <span className="text-xs text-slate-400">
              ${calc.totalSavings.toLocaleString()}/yr • ${calc.monthlyBudget.toLocaleString()}/mo
            </span>
          )}
        </div>
        <span className="text-slate-400">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-4">
            {/* Gross Income */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Annual Gross Income
              </label>
              <input
                type="number"
                value={data.grossAnnualIncome || ''}
                onChange={(e) => updateField('grossAnnualIncome', parseFloat(e.target.value) || 0)}
                placeholder="100000"
                step="1000"
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Pre-Tax Savings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Pre-Tax Savings</label>
                <span className="text-xs text-slate-500">
                  Total: ${calc.totalPreTaxSavings.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 pl-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.preTax401k || ''}
                    onChange={(e) => updateField('preTax401k', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="1000"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">401(k)</span>
                  <button
                    onClick={quickFill401k}
                    className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700"
                    title={`Max: $${CONTRIBUTION_LIMITS.ira401k.toLocaleString()}`}
                  >
                    Max
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.preTaxHsa || ''}
                    onChange={(e) => updateField('preTaxHsa', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">HSA</span>
                  <button
                    onClick={quickFillHsa}
                    className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700"
                    title={`Single: $${CONTRIBUTION_LIMITS.hsa.toLocaleString()}`}
                  >
                    Max
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.preTaxTraditionalIra || ''}
                    onChange={(e) => updateField('preTaxTraditionalIra', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Trad IRA</span>
                  <div className="w-12"></div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.preTaxOther || ''}
                    onChange={(e) => updateField('preTaxOther', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Other</span>
                  <div className="w-12"></div>
                </div>
              </div>
            </div>

            {/* Taxes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Effective Tax Rate %
              </label>
              <input
                type="number"
                value={data.effectiveTaxRate || ''}
                onChange={(e) => updateField('effectiveTaxRate', parseFloat(e.target.value) || 0)}
                placeholder="22"
                step="0.5"
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Est. Tax: ${calc.estimatedAnnualTax.toLocaleString()}
              </p>
            </div>

            {/* Post-Tax Savings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Post-Tax Savings</label>
                <span className="text-xs text-slate-500">
                  Total: ${calc.totalPostTaxSavings.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 pl-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.postTaxRoth || ''}
                    onChange={(e) => updateField('postTaxRoth', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Roth IRA</span>
                  <button
                    onClick={quickFillRoth}
                    className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700"
                    title={`Max: $${CONTRIBUTION_LIMITS.ira.toLocaleString()}`}
                  >
                    Max
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.postTaxBrokerage || ''}
                    onChange={(e) => updateField('postTaxBrokerage', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Brokerage</span>
                  <div className="w-12"></div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.postTaxSavings || ''}
                    onChange={(e) => updateField('postTaxSavings', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Savings</span>
                  <div className="w-12"></div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.postTaxOther || ''}
                    onChange={(e) => updateField('postTaxOther', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded py-1.5 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-20">Other</span>
                  <div className="w-12"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Cash Flow Waterfall */}
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 mb-3">Your Cash Flow</h4>

            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gross Income</span>
                <span className="text-emerald-400 font-semibold">
                  ${data.grossAnnualIncome.toLocaleString()}
                </span>
              </div>

              <div className="border-l-2 border-slate-600 pl-3 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">- Pre-tax Savings</span>
                  <span className="text-slate-400">
                    ${calc.totalPreTaxSavings.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                <span className="text-slate-400">= Taxable Income</span>
                <span className="text-slate-200">
                  ${calc.taxableIncome.toLocaleString()}
                </span>
              </div>

              <div className="border-l-2 border-slate-600 pl-3 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">- Taxes ({data.effectiveTaxRate}%)</span>
                  <span className="text-slate-400">
                    ${calc.estimatedAnnualTax.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                <span className="text-slate-400">= Take-Home Pay</span>
                <span className={calc.takeHomePay >= 0 ? 'text-slate-200' : 'text-red-400'}>
                  ${calc.takeHomePay.toLocaleString()}
                </span>
              </div>

              <div className="border-l-2 border-slate-600 pl-3 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">- Post-tax Savings</span>
                  <span className="text-slate-400">
                    ${calc.totalPostTaxSavings.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                <span className="text-slate-400">= Annual Spending</span>
                <span className={calc.annualSpending >= 0 ? 'text-violet-400 font-semibold' : 'text-red-400'}>
                  ${calc.annualSpending.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">Monthly Budget</span>
                <span className="text-violet-300">
                  ${calc.monthlyBudget.toLocaleString()}/mo
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="border-t border-slate-700 pt-3 mt-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Savings</span>
                <span className="text-emerald-400 font-semibold">
                  ${calc.totalSavings.toLocaleString()}/yr
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Savings Rate</span>
                <span className="text-emerald-400 font-semibold">
                  {calc.savingsRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Status</span>
                <span className={calc.isBalanced ? 'text-emerald-400' : 'text-amber-400'}>
                  {calc.isBalanced ? '✓ Balanced' : '⚠ Check values'}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="border-t border-slate-700 pt-3 mt-3">
                <p className="text-xs font-semibold text-amber-400 mb-1">Warnings:</p>
                <ul className="space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-amber-300">⚠ {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Apply Button */}
            {onApply && (
              <button
                onClick={handleApply}
                disabled={!calc.isBalanced || calc.totalSavings === 0}
                className="w-full mt-4 px-3 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply to Scenario
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
