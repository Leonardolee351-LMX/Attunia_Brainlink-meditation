export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-cream">
      <main className="flex-1 px-5 pt-2 pb-6">{children}</main>
    </div>
  );
}
