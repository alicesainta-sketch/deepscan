import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import QueryClientProvider from "@/components/QueryClientProvider";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeScript from "@/components/ThemeScript";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "DeepScan",
  description: "Chat with DeepSeek models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryClientProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
          <ThemeScript />
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </QueryClientProvider>
  );
}
