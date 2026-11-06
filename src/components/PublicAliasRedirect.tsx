import { Navigate, useLocation } from 'react-router-dom';

export function PublicAliasRedirect({ to, defaultHash = '' }: { to: string; defaultHash?: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash: hash || defaultHash }} replace />;
}
