import { NextResponse } from 'next/server';
import { qbFetch } from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

interface CompanyInfoResponse {
  CompanyInfo: {
    CompanyName: string;
    LegalName?: string;
    CompanyAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string };
    PrimaryPhone?: { FreeFormNumber?: string };
    Email?: { Address?: string };
    FiscalYearStartMonth?: string;
    Country?: string;
  };
}

interface BalancesResponse {
  QueryResponse: {
    Account?: Array<{ Id: string; Name: string; AccountType: string; CurrentBalance?: number }>;
  };
}

// GET /api/quickbooks/company — returns company info + top account balances.
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [company, balances] = await Promise.all([
      qbFetch<CompanyInfoResponse>('/companyinfo/1'),
      qbFetch<BalancesResponse>(
        `/query?query=${encodeURIComponent(
          "SELECT Id, Name, AccountType, CurrentBalance FROM Account WHERE AccountType IN ('Bank','Accounts Receivable','Accounts Payable','Credit Card') MAXRESULTS 20"
        )}`
      ),
    ]);
    return NextResponse.json({
      company: company.CompanyInfo,
      accounts: balances.QueryResponse.Account || [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
