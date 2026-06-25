import type { Metadata } from 'next';
import UsersContent from '../team/content';

export const metadata: Metadata = {
  title: 'Users - Feather',
};

// Everyone who has signed into Feather — staff AND alumni. The /feather/team
// page renders the same grid scoped to employees only; this one shows all
// user kinds together.
export default function UsersPage() {
  return <UsersContent scope="all" />;
}
