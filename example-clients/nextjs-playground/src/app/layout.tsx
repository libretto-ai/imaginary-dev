import dynamic from "next/dynamic";
import "./globals.css";
import { Providers } from "./providers";

const ClientGoogleAnalytics = dynamic(() => import("./analytics"));
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientGoogleAnalytics trackPageViews />

      <html lang="en">
        {/*
        <head /> will contain the components returned by the nearest parent
        head.tsx. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
        <head />
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </>
  );
}
