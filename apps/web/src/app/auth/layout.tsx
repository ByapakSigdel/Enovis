export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4a7c59]/30 via-[#a8d5a2]/20 to-[#fafdf7] px-4 py-8">
      {children}
    </div>
  );
}
