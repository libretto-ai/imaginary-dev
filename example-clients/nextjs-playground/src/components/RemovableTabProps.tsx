"use client";
import {
  Box,
  Button,
  Icon,
  IconButton,
  TabProps,
  useMultiStyleConfig,
  useTab,
} from "@chakra-ui/react";
import { ForwardedRef, forwardRef } from "react";
import { MdDelete } from "react-icons/md";

type RemovableTabProps = {
  onRemove: () => void;
  isRemoveDisabled?: boolean;
} & TabProps;

/** A custom tab with a trash can */
export const RemovableTab = forwardRef(function SimpleTabR(
  { children, onRemove, isRemoveDisabled, ...props }: RemovableTabProps,
  ref: ForwardedRef<HTMLElement>
) {
  // 1. Reuse the `useTab` hook
  const tabProps = useTab({ ...props, ref });
  const isSelected = !!tabProps["aria-selected"];

  // 2. Hook into the Tabs `size`, `variant`, props
  const styles = useMultiStyleConfig("Tabs", tabProps);
  const { onClick, ...otherTabProps } = tabProps;

  return (
    <Box
      {...otherTabProps}
      __css={styles.tab}
      display="flex"
      justifyContent="space-between"
      gap={2}
      overflow="hidden"
    >
      <Button
        onClick={onClick}
        variant="unstyled"
        whiteSpace="nowrap"
        textOverflow="ellipsis"
        overflow="hidden"
        size="sm"
      >
        {children}
      </Button>
      <IconButton
        isDisabled={isRemoveDisabled}
        aria-label="remove item"
        size="xs"
        icon={<Icon as={MdDelete} />}
        onMouseDown={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      />
    </Box>
  );
});
