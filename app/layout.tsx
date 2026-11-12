import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@ui5/webcomponents-react";
import { ThemeAssets } from "@/components/ThemeAssets";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakeUFit",
  description: "Your personal fitness tracker",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider>
            <ThemeAssets />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
