import { NextRequest, NextResponse } from 'next/server';
import {
  qbApiFetch,
  listStoredTokens,
  getStoredToken,
} from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/quickbooks/data?report=<type>&realm_id=<id>&...
//
// Unified read endpoint for QuickBooks Online data. `report` selects the
// shape and underlying QBO call; `realm_id` selects which connected Intuit
// company to hit.
//
// Supported reports:
//   list                   → no realm_id, lists connected companies
//   status                 → is the given realm_id connected + token fresh
//   company-info           → CompanyInfo
//   accounts               → All accounts via /query
//   profit-loss            → ProfitAndLoss summary (Month range by default)
//   profit-loss-detail     → ProfitAndLossDetail
//   profit-loss-monthly    → ProfitAndLoss with summarize_column_by=Month
//   balance-sheet          → BalanceSheet summary
//   balance-sheet-detail   → BalanceSheetDetail
//   trial-balance          → TrialBalance
//   general-ledger         → GeneralLedger with explicit columns
//
// Optional date range query params for reports: start_date, end_date (YYYY-MM-DD).
// If omitted, QBO defaults apply.
//
// Admin-only.

const MINOR_VERSION = '75';

function adminGuard() {
  return async () => {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
    if (!row?.is_admin) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    return { ok: true as const };
  };
}

function buildReportPath(
  report: string,
  params: URLSearchParams,
  extras: Record<string, string> = {}
): string {
  const qp = new URLSearchParams();
  const start = params.get('start_date');
  const end = params.get('end_date');
  if (start) qp.set('start_date', start);
  if (end) qp.set('end_date', end);
  // Pass-through for account-scoped report filters. QBO accepts
  // comma-separated lists of Intuit account ids on most reports.
  const accountList = params.get('account_list');
  if (accountList) qp.set('account_list', accountList);
  const dateMacro = params.get('date_macro');
  if (dateMacro) qp.set('date_macro', dateMacro);
  for (const [k, v] of Object.entries(extras)) qp.set(k, v);
  qp.set('minorversion', MINOR_VERSION);
  return `/reports/${report}?${qp.toString()}`;
}

export async function GET(req: NextRequest) {
  const guard = await adminGuard()();
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const report = url.searchParams.get('report') || '';
  const realmId = url.searchParams.get('realm_id') || '';

  // -------------- list --------------------------------------------------
  // No realm_id needed. Enumerate stored companies so the UI can render a
  // picker. We don't return secrets.
  if (report === 'list') {
    try {
      const rows = await listStoredTokens();
      const companies = rows.map((r) => ({
        realm_id: r.realm_id,
        expires_at: r.expires_at,
        updated_at: r.updated_at,
      }));
      return NextResponse.json({ companies });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  if (!report) {
    return NextResponse.json({ error: 'Missing report param' }, { status: 400 });
  }
  if (!realmId) {
    return NextResponse.json({ error: 'Missing realm_id param' }, { status: 400 });
  }

  // -------------- status ------------------------------------------------
  // Cheap check: is there a token row for this realm_id and is it not past
  // its refresh window? Doesn't call Intuit.
  if (report === 'status') {
    const row = await getStoredToken(realmId);
    if (!row) {
      return NextResponse.json({ connected: false, realm_id: realmId });
    }
    return NextResponse.json({
      connected: true,
      realm_id: realmId,
      expires_at: row.expires_at,
      updated_at: row.updated_at,
    });
  }

  try {
    switch (report) {
      case 'company-info': {
        const data = await qbApiFetch<unknown>(
          realmId,
          `/companyinfo/${realmId}?minorversion=${MINOR_VERSION}`
        );
        return NextResponse.json(data);
      }

      case 'accounts': {
        const query = encodeURIComponent(
          'SELECT Id, Name, AcctNum, AccountType, AccountSubType, Classification, CurrentBalance, Active FROM Account MAXRESULTS 1000'
        );
        const data = await qbApiFetch<unknown>(
          realmId,
          `/query?query=${query}&minorversion=${MINOR_VERSION}`
        );
        return NextResponse.json(data);
      }

      case 'profit-loss': {
        const path = buildReportPath('ProfitAndLoss', url.searchParams);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'profit-loss-detail': {
        const path = buildReportPath('ProfitAndLossDetail', url.searchParams);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'profit-loss-monthly': {
        // Default to the current calendar year (Jan 1 – Dec 31) so the
        // report always has 12 monthly columns — future months just
        // return zero. Callers can still override with start/end.
        const hasRange =
          url.searchParams.get('start_date') ||
          url.searchParams.get('end_date') ||
          url.searchParams.get('date_macro');
        const extras: Record<string, string> = { summarize_column_by: 'Month' };
        if (!hasRange) {
          const year = new Date().getFullYear();
          extras.start_date = `${year}-01-01`;
          extras.end_date = `${year}-12-31`;
        }
        const path = buildReportPath('ProfitAndLoss', url.searchParams, extras);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'balance-sheet': {
        const path = buildReportPath('BalanceSheet', url.searchParams);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'balance-sheet-detail': {
        const path = buildReportPath('BalanceSheetDetail', url.searchParams);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'trial-balance': {
        const path = buildReportPath('TrialBalance', url.searchParams);
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      case 'general-ledger': {
        // GL needs explicit column list or QBO returns a very sparse report.
        const path = buildReportPath('GeneralLedger', url.searchParams, {
          columns:
            'tx_date,txn_type,doc_num,name,memo,account_name,debt_amt,credit_amt,subt_nat_amount',
        });
        const data = await qbApiFetch<unknown>(realmId, path);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'auth_expired') {
      return NextResponse.json({ error: 'auth_expired' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
