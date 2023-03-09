import "@uiw/react-textarea-code-editor/dist.css";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import logo from "./images/playground.png";

export const metadata: Metadata = {
  title: "Imaginary Programming Playground",
  description:
    "An online playground to try out writing and running new imaginary functions.",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  icons: {
    icon: "/favicon-32x32.png",
  },
  twitter: {
    card: "summary_large_image",
    site: "@imaginary_dev",
    creator: "@imaginary_dev",
    images: [logo.src],
  },
};

const Playground = dynamic(() => import("../components/Playground"));
export default function Home() {
  return (
    <main>
      <Playground />
    </main>
  );
}
