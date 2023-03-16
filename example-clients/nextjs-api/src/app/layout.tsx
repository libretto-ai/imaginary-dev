/* eslint-disable @next/next/no-page-custom-font */
import { ClientGoogleAnalytics } from "./analytics";
import "./globals.css";

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
        <head>
          <link
            href="https://fonts.googleapis.com/css?family=Bungee+Inline&display=optional"
            rel="stylesheet"
          />
        </head>

        <body>{children}</body>
      </html>
    </>
  );
}
