"use client";
import { useShareState } from "@/util/persistState";
import {
  Button,
  Flex,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useClipboard,
} from "@chakra-ui/react";
import { FC, useEffect, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

export const ShareDialog: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const getPersistedState = useShareState();
  const [shareLink, setShareLink] = useState("");
  useEffect(() => {
    if (isOpen) {
      setShareLink(makeShareUrl(getPersistedState()));
    }
  }, [getPersistedState, isOpen]);
  const { onCopy, hasCopied } = useClipboard(shareLink);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Share an Imaginary Function</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Flex gap={3}>
            <Input
              flex={1}
              readOnly
              value={shareLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              onClick={() => {
                onCopy();
                setTimeout(onClose, 1000);
              }}
              isDisabled={hasCopied}
              rightIcon={<Icon as={hasCopied ? FiCheck : FiCopy}></Icon>}
            >
              {"Copy Link"}
            </Button>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

function makeShareUrl(state: string) {
  const url = new URL(window.location.toString());
  url.searchParams.set("state", state);
  return url.toString();
}
