import { SourceFileMap } from "./ts-source";

/**
 * This is state that stays within the extension host, and is not visible to
 * webviews */
export interface ExtensionHostState {
  /** The master map of all parsed imaginary functions */
  nativeSources: SourceFileMap;
}
