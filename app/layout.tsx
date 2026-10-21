import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "lebron.io — NBA teammate chain", description: "The daily NBA teammate connection game." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
