const publicContentPaths = new Set([
  '/', '/school', '/monastery', '/news', '/elearning', '/portal',
  '/contact', '/contact-us', '/about', '/programs', '/school-life',
]);

// These pages contain public content and can render while a session is checked.
// Login, registration and portal routes still wait for verification.
export const isPublicContentPath = (pathname: string) =>
  publicContentPaths.has(pathname.replace(/\/+$/, '') || '/');
