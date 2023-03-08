"use client";
import { ChakraProvider } from "@chakra-ui/react";
import { FC, PropsWithChildren } from "react";
import { RecoilRoot } from "recoil";

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <RecoilRoot>
      <ChakraProvider>{children}</ChakraProvider>
    </RecoilRoot>
  );
};
