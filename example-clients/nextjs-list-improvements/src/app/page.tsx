import functions from "@/imaginary";
import { wrapRemoteImaginaryFunctions } from "@imaginary-dev/nextjs-util/browser";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

const imaginaryFunctions = wrapRemoteImaginaryFunctions(
  functions,
  "/api/imaginary"
);
export default function Home() {
  return <main>STuff here</main>;
}
