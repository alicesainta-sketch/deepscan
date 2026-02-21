import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
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
              <div className="mx-auto flex h-screen w-full flex-col md:flex-row">
                <aside className="h-60 w-full md:h-screen md:w-[320px]">
                  <Navbar />
                </aside>
                <main className="flex-1 overflow-auto bg-white dark:bg-slate-900">
                  {children}
                </main>
              </div>
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
            <div className="mx-auto flex h-screen w-full flex-col md:flex-row">
              <aside className="h-60 w-full md:h-screen md:w-[320px]">
                <Navbar />
              </aside>
              <main className="flex-1 overflow-auto bg-white dark:bg-slate-900">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </QueryClientProvider>
  );
}
