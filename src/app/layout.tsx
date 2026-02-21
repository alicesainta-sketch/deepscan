import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import AppShell from "@/components/AppShell";
import QueryClientProvider from "@/components/QueryClientProvider";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeScript from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: "DeepScan",
  description: "Chat with DeepSeek models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider>
        <html lang="en" suppressHydrationWarning>
          <body className="min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
            <ThemeScript />
            <ThemeProvider>
              <AppShell>{children}</AppShell>
            </ThemeProvider>
          </body>
        </html>
      </QueryClientProvider>
    </ClerkProvider>
  ) : (
    <QueryClientProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
          <ThemeScript />
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </body>
      </html>
    </QueryClientProvider>
  );
}
