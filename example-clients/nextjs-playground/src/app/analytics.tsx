import dynamic from "next/dynamic";

const GoogleAnalytics = dynamic(
  async () => (await import("nextjs-google-analytics")).GoogleAnalytics
);

export function ClientGoogleAnalytics(props: any) {
  return <GoogleAnalytics {...props} />;
}
