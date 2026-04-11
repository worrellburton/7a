'use client';

// ------------------------------------------------------------
// Annual budget sheet — static starter view.
//
// Mirrors the Google Sheets layout the team already uses: departments as
// row groups (Budget / Expense / Difference), 12 month columns, plus Total
// and Average columns at the right. Eventually this will pull live data
// from QuickBooks class-based P&L; for now the numbers are hard-coded so
// we can iterate on the layout before wiring up the data source.
// ------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

interface DeptGroup {
  name: string;
  manager: string;
  // 12-entry arrays. Budgets and expenses track months; "Average" is the
  // spreadsheet's own average, not necessarily mean-of-non-zero.
  budget: number[];
  expense: number[];
  totalBudget: number;
  avgBudget: number;
  totalExpense: number;
  avgExpense: number;
  // Some departments have a subsidiary expense row (e.g. Admin → Billing).
  extras?: Array<{
    label: string;
    values: number[];
    total: number;
    average: number;
    tone?: 'warning' | 'info';
  }>;
}

// Sparse zero — used for "no data yet" months so we can dim the cell.
const Z = 0;

const DEPARTMENTS: DeptGroup[] = [
  {
    name: 'Admin',
    manager: 'Pamela Calvo',
    budget: [76000, 76000, 76000, 76000, 76000, 76000, 76000, 76000, 76000, 76000, 76000, 76000],
    expense: [72411.92, 78689.60, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 912000,
    avgBudget: 76000,
    totalExpense: 151101.52,
    avgExpense: 75550.76,
    extras: [
      {
        label: 'Billing Services',
        values: [89.90, 6679.29, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
        total: 6769.19,
        average: 13448.48,
        tone: 'warning',
      },
    ],
  },
  {
    name: 'Clinical',
    manager: 'Lindsay Rothschild',
    budget: [75333.35, 50333.33, 50333.33, 50333.33, 50333.33, 50333.33, 75333.35, 50333.33, 50333.33, 50333.33, 50333.33, 50333.33],
    expense: [51282.28, 40526.32, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 654000,
    avgBudget: 54500,
    totalExpense: 91808.60,
    avgExpense: 45904.30,
  },
  {
    name: 'Equine',
    manager: 'Melissa Simard',
    budget: [18674.79, 13665.04, 13665.04, 13665.04, 13665.04, 13665.04, 18674.79, 13665.04, 13665.04, 13665.04, 13665.04, 13665.04],
    expense: [10929.36, 14721.15, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 174000,
    avgBudget: 14500,
    totalExpense: 25650.51,
    avgExpense: 12825.26,
  },
  {
    name: 'Medical',
    manager: 'Max Swann',
    budget: [20537.19, 13892.56, 13892.56, 13892.56, 13892.56, 13892.56, 20537.19, 13892.56, 13892.56, 13892.56, 13892.56, 13892.56],
    expense: [14386.07, 10555.76, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 180000,
    avgBudget: 15000,
    totalExpense: 24941.83,
    avgExpense: 12470.92,
  },
  {
    name: 'Kitchen',
    manager: 'Pamela Calvo',
    budget: [27437.83, 22112.43, 22112.43, 22112.43, 22112.43, 22112.43, 27437.83, 22112.43, 22112.43, 22112.43, 22112.43, 22112.43],
    expense: [18140.38, 16735.44, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 276000,
    avgBudget: 23000,
    totalExpense: 34875.82,
    avgExpense: 17437.91,
  },
  {
    name: 'Marketing & Admissions',
    manager: 'Mario Salcedo',
    budget: [57298.08, 48540.38, 48540.38, 48540.38, 48540.38, 48540.38, 57298.08, 48540.38, 48540.38, 48540.38, 48540.38, 48540.38],
    expense: [36276.14, 38284.11, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z],
    totalBudget: 600000,
    avgBudget: 50000,
    totalExpense: 74560.25,
    avgExpense: 37280.13,
  },
];

// Month-end + payroll checkbox rows at the top of the sheet.
const MONTH_END_COMPLETE = [true, true, false, false, false, false, false, false, false, false, false, false];
const THREE_PAYROLL_MONTHS = [true, false, false, false, false, false, false, true, false, false, false, false];

// Other expenses line item.
const OTHER_EXPENSES = [10573.29, 10602.29, 11611.23, Z, Z, Z, Z, Z, Z, Z, Z, Z];

// Bottom summary rows.
const REVENUE = [218159.70, 260018.82, 58008.84, 55905.22, Z, Z, Z, Z, Z, Z, Z, Z];
const INCOME = [4568.11, 43913.00, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z];
const OPERATING_MARGIN = [0.0209, 0.1689, null, null, null, null, null, null, null, null, null, null];

const TOTAL_BUDGET_ROW = [275281.24, 224543.75, 224543.75, 224543.75, 224543.75, 224543.75, 275281.24, 224543.75, 224543.75, 224543.75, 224543.75, 224543.75];
const TOTAL_EXPENSES_ROW = [203593.05, 206268.67, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z];
const BILLING_SERVICES_ROW = [89.90, 6679.29, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z];
const DIFFERENCE_ROW = [71688.19, 18275.08, Z, Z, Z, Z, Z, Z, Z, Z, Z, Z];

const FOOTER = {
  totalAnnualBudget: 2796000,
  averageBudgetPerMonth: 233000,
  totalAnnualExpenses: 409861.72,
  averageExpensesPerMonth: 204930.86,
};

// ------------------------------------------------------------
// Formatters
// ------------------------------------------------------------

function fmt(n: number): string {
  if (n === 0) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(n: number | null): string {
  if (n === null) return '-';
  return `${(n * 100).toFixed(2)}%`;
}
function diffTone(n: number): string {
  if (n === 0) return 'bg-gray-100 text-foreground/30';
  return n > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900';
}

// ------------------------------------------------------------
// Sheet
// ------------------------------------------------------------

export default function BudgetSheet() {
  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full border-separate border-spacing-0 text-[11px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <colgroup>
          <col style={{ width: 140 }} />
          <col style={{ width: 80 }} />
          {MONTHS.map((m) => (
            <col key={m} style={{ width: 90 }} />
          ))}
          <col style={{ width: 100 }} />
          <col style={{ width: 90 }} />
        </colgroup>

        {/* Header: month names */}
        <thead>
          <tr>
            <th className="bg-[#a0522d] text-white p-2" colSpan={2}>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white/80" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Seven Arrows</span>
              </div>
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                className="bg-foreground text-white text-center p-2 font-semibold uppercase tracking-wider"
              >
                {m}
              </th>
            ))}
            <th className="bg-foreground text-white text-center p-2 font-semibold uppercase tracking-wider">Totals</th>
            <th className="bg-foreground text-white text-center p-2 font-semibold uppercase tracking-wider">Averages</th>
          </tr>
        </thead>

        <tbody>
          {/* Month-end complete checkbox row */}
          <tr>
            <td className="bg-gray-200 font-semibold text-center p-2" colSpan={2}>Month End Complete</td>
            {MONTH_END_COMPLETE.map((done, i) => (
              <td key={i} className="bg-gray-100 text-center p-2">
                <Checkbox checked={done} />
              </td>
            ))}
            <td className="bg-gray-100" />
            <td className="bg-gray-100" />
          </tr>

          {/* Three payroll months row */}
          <tr>
            <td className="bg-amber-200 font-semibold text-center p-2" colSpan={2}>3 Payroll Months</td>
            {THREE_PAYROLL_MONTHS.map((done, i) => (
              <td key={i} className="bg-amber-50 text-center p-2">
                <Checkbox checked={done} />
              </td>
            ))}
            <td className="bg-amber-50" />
            <td className="bg-amber-50" />
          </tr>

          {/* Spacer */}
          <tr>
            <td colSpan={16} className="h-2" />
          </tr>

          {/* Department groups */}
          {DEPARTMENTS.map((dept, idx) => (
            <DeptBlock key={dept.name} dept={dept} zebra={idx % 2 === 0} />
          ))}

          {/* Other expenses */}
          <tr>
            <td colSpan={2} className="bg-emerald-300 font-semibold text-center p-2">Other Expenses</td>
            {OTHER_EXPENSES.map((n, i) => (
              <td key={i} className="bg-white text-right px-2 py-1.5 tabular-nums border-b border-gray-100">
                {fmt(n)}
              </td>
            ))}
            <td className="bg-white" />
            <td className="bg-white" />
          </tr>

          {/* Black spacer band */}
          <tr>
            <td colSpan={16} className="bg-foreground h-6" />
          </tr>

          {/* Revenue / Income / Operating Margin */}
          <SummaryRow label="Revenue" values={REVENUE} tone="neutral" totalTone="neutral" total={592092.58} average={49341.05} />
          <SummaryRow label="Income" values={INCOME} tone="good" totalTone="good" total={48481.11} average={24240.56} />
          <tr>
            <td colSpan={2} className="bg-gray-600 text-white font-semibold text-center p-2">Operating Margin</td>
            {OPERATING_MARGIN.map((p, i) => (
              <td
                key={i}
                className={`text-right px-2 py-1.5 tabular-nums border-b border-gray-800 ${
                  p === null ? 'bg-sky-700 text-white/40' : 'bg-sky-600 text-white font-semibold'
                }`}
              >
                {p === null ? '-' : fmtPct(p)}
              </td>
            ))}
            <td className="bg-sky-600 text-white font-semibold text-right px-2 tabular-nums">8.19%</td>
            <td className="bg-sky-600 text-white font-semibold text-right px-2 tabular-nums">9.49%</td>
          </tr>

          {/* Spacer */}
          <tr>
            <td colSpan={16} className="bg-foreground h-6" />
          </tr>

          {/* Total Budget */}
          <tr>
            <td colSpan={2} className="bg-gray-400 text-white font-semibold text-center p-2">Total Budget</td>
            {TOTAL_BUDGET_ROW.map((n, i) => (
              <td key={i} className="bg-white text-right px-2 py-1.5 tabular-nums border-b border-gray-200 font-medium">
                {fmt(n)}
              </td>
            ))}
            <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold border-b border-gray-200">{fmt(2796000)}</td>
            <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold border-b border-gray-200">{fmt(233000)}</td>
          </tr>

          {/* Total Expenses */}
          <tr>
            <td rowSpan={2} className="bg-gray-400 text-white font-semibold text-center p-2" colSpan={2}>
              <div>Total Expenses</div>
              <div className="text-[10px] font-normal text-white/80 mt-0.5">Billing Services</div>
            </td>
            {TOTAL_EXPENSES_ROW.map((n, i) => (
              <td key={i} className="bg-white text-right px-2 py-1.5 tabular-nums border-b border-gray-100">
                {fmt(n)}
              </td>
            ))}
            <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold">{fmt(409861.72)}</td>
            <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold">{fmt(204930.86)}</td>
          </tr>
          <tr>
            {BILLING_SERVICES_ROW.map((n, i) => (
              <td key={i} className="bg-amber-100 text-right px-2 py-1.5 tabular-nums border-b border-amber-200">
                {fmt(n)}
              </td>
            ))}
            <td className="bg-amber-100" />
            <td className="bg-amber-100" />
          </tr>

          {/* Difference row */}
          <tr>
            <td colSpan={2} className="bg-gray-400 text-white font-semibold text-center p-2">Difference</td>
            {DIFFERENCE_ROW.map((n, i) => (
              <td
                key={i}
                className={`text-right px-2 py-1.5 tabular-nums border-b border-gray-100 font-semibold ${
                  n > 0 ? 'bg-emerald-100 text-emerald-900' : n < 0 ? 'bg-red-100 text-red-900' : 'bg-white text-foreground/30'
                }`}
              >
                {fmt(n)}
              </td>
            ))}
            <td className="bg-emerald-100 text-right px-2 py-1.5 tabular-nums font-bold text-emerald-900">{fmt(89963.27)}</td>
            <td className="bg-emerald-100 text-right px-2 py-1.5 tabular-nums font-bold text-emerald-900">{fmt(44981.63)}</td>
          </tr>

          {/* Footer summary tiles */}
          <tr>
            <td colSpan={16} className="pt-6 pb-2">
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
                <FooterTile label="Total Annual Budget" value={fmtMoney(FOOTER.totalAnnualBudget)} />
                <FooterTile label="Average Budget Per Month" value={fmtMoney(FOOTER.averageBudgetPerMonth)} />
                <FooterTile label="Total Annual Expenses to Date" value={fmtMoney(FOOTER.totalAnnualExpenses)} />
                <FooterTile label="Average Expenses Per Month" value={fmtMoney(FOOTER.averageExpensesPerMonth)} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function DeptBlock({ dept }: { dept: DeptGroup; zebra: boolean }) {
  return (
    <>
      {/* Header cell spans budget+expense+difference rows */}
      <tr>
        <td
          rowSpan={3}
          className="bg-foreground text-white text-center align-middle font-semibold p-2 border-r border-gray-300"
        >
          <div>{dept.name}</div>
          <div className="text-[10px] text-white/70 font-normal mt-0.5">{dept.manager}</div>
          <div className="mt-2 inline-block bg-sky-600 text-white text-[10px] font-semibold px-2 py-1 rounded">
            {fmtMoney(dept.avgBudget)}
          </div>
        </td>
        <td className="bg-gray-100 font-semibold text-[10px] uppercase tracking-wider text-center px-2 py-1.5 text-foreground/70">
          Budget
        </td>
        {dept.budget.map((n, i) => (
          <td key={i} className="bg-sky-500/90 text-white text-right px-2 py-1.5 tabular-nums border-b border-sky-600 font-medium">
            {fmt(n)}
          </td>
        ))}
        <td className="bg-sky-500/90 text-white text-right px-2 py-1.5 tabular-nums font-bold border-b border-sky-600">{fmt(dept.totalBudget)}</td>
        <td className="bg-sky-500/90 text-white text-right px-2 py-1.5 tabular-nums font-bold border-b border-sky-600">{fmt(dept.avgBudget)}</td>
      </tr>

      {/* Expense row */}
      <tr>
        <td className="bg-gray-100 font-semibold text-[10px] uppercase tracking-wider text-center px-2 py-1.5 text-foreground/70">
          Expense
        </td>
        {dept.expense.map((n, i) => (
          <td key={i} className="bg-white text-right px-2 py-1.5 tabular-nums border-b border-gray-100">
            {fmt(n)}
          </td>
        ))}
        <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold">{fmt(dept.totalExpense)}</td>
        <td className="bg-white text-right px-2 py-1.5 tabular-nums font-semibold">{fmt(dept.avgExpense)}</td>
      </tr>

      {/* Difference row */}
      <tr>
        <td className="bg-gray-100 font-semibold text-[10px] uppercase tracking-wider text-center px-2 py-1.5 text-foreground/70">
          Difference
        </td>
        {dept.budget.map((b, i) => {
          const e = dept.expense[i];
          const hasExpense = e !== 0;
          const diff = hasExpense ? b - e : 0;
          return (
            <td
              key={i}
              className={`text-right px-2 py-1.5 tabular-nums border-b border-gray-100 font-semibold ${
                !hasExpense ? 'bg-gray-100 text-foreground/30' : diffTone(diff)
              }`}
            >
              {hasExpense ? fmt(diff) : ''}
            </td>
          );
        })}
        <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${diffTone(dept.totalBudget - dept.totalExpense)}`}>
          {fmt(dept.totalBudget - dept.totalExpense)}
        </td>
        <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${diffTone(dept.avgBudget - dept.avgExpense)}`}>
          {fmt(dept.avgBudget - dept.avgExpense)}
        </td>
      </tr>

      {/* Extras (Billing Services under Admin, etc.) */}
      {dept.extras?.map((extra) => (
        <tr key={extra.label}>
          <td className="bg-foreground/80 text-white text-center text-[10px] font-semibold uppercase tracking-wider p-2" colSpan={2}>
            {extra.label}
          </td>
          {extra.values.map((n, i) => (
            <td
              key={i}
              className={`text-right px-2 py-1.5 tabular-nums border-b border-amber-200 ${
                extra.tone === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-white'
              }`}
            >
              {fmt(n)}
            </td>
          ))}
          <td className={`text-right px-2 py-1.5 tabular-nums font-semibold ${extra.tone === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-white'}`}>
            {fmt(extra.total)}
          </td>
          <td className={`text-right px-2 py-1.5 tabular-nums font-semibold ${extra.tone === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-white'}`}>
            {fmt(extra.average)}
          </td>
        </tr>
      ))}

      {/* Spacer between departments */}
      <tr>
        <td colSpan={16} className="h-1.5" />
      </tr>
    </>
  );
}

function SummaryRow({
  label,
  values,
  total,
  average,
  tone,
}: {
  label: string;
  values: number[];
  total: number;
  average: number;
  tone: 'neutral' | 'good';
  totalTone: 'neutral' | 'good';
}) {
  const cellClass =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-900 font-semibold'
      : 'bg-white text-foreground/80';
  return (
    <tr>
      <td colSpan={2} className="bg-gray-500 text-white font-semibold text-center p-2">{label}</td>
      {values.map((n, i) => (
        <td
          key={i}
          className={`${cellClass} text-right px-2 py-1.5 tabular-nums border-b border-gray-200`}
        >
          {fmt(n)}
        </td>
      ))}
      <td className={`${cellClass} text-right px-2 py-1.5 tabular-nums border-b border-gray-200 font-bold`}>{fmt(total)}</td>
      <td className={`${cellClass} text-right px-2 py-1.5 tabular-nums border-b border-gray-200 font-bold`}>{fmt(average)}</td>
    </tr>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`inline-flex items-center justify-center w-4 h-4 border border-foreground/40 ${
        checked ? 'bg-foreground text-white' : 'bg-white'
      }`}
    >
      {checked && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

function FooterTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-foreground text-white rounded-sm">
      <div className="px-4 py-2 border-r border-white/20 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider leading-tight text-white/80">{label}</p>
      </div>
      <div className="pr-4 py-2 tabular-nums text-sm font-bold">{value}</div>
    </div>
  );
}
