// Route group layout for authenticated app pages.
// During migration, the app shell (sidebar, header) is provided by
// RootShell in the root layout. Once old routes are removed, the shell
// will move here.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
