"use client";
import { imaginaryFunctionMap } from "@/emojify";
import { wrapRemoteImaginaryFunctions } from "@imaginary-dev/nextjs-util/browser";
import { useState } from "react";
import styles from "./page.module.css";

const fns = wrapRemoteImaginaryFunctions(
  imaginaryFunctionMap,
  "/api/functions/"
);

const Spinner = () => <div className={styles.spinner}></div>;
export default function Home() {
  const [text, setText] = useState("");
  const [singleEmojiResult, setSingleEmojiResult] = useState<string>();
  const [multiEmojiResult, setMultiEmojiResult] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const onSubmit = async () => {
    setError(undefined);
    setBusy(true);
    try {
      setSingleEmojiResult(undefined);
      setMultiEmojiResult(undefined);

      const singleEmojiPromise = fns.singleEmojiForText(text);
      const multiEmojiPromise = fns.moreEmoji(text);
      setSingleEmojiResult(await singleEmojiPromise);
      setMultiEmojiResult(await multiEmojiPromise);
    } catch (ex) {
      setSingleEmojiResult(undefined);
      setMultiEmojiResult(undefined);
      setError(ex as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h2>The Emojifier</h2>
        <textarea
          className={styles.inputText}
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type some text you would like to emojify."
        />
        <button
          className={styles.emojifyButton}
          onClick={onSubmit}
          disabled={busy || !text}
        >
          Emojify!
          {busy && <Spinner />}
        </button>
        {singleEmojiResult && (
          <div>
            <div className={styles.emojiResultDescription}>
              As a single emoji:
            </div>
            <div className={styles.emojiResult}>{singleEmojiResult}</div>
            <div className={styles.emojiResultDescription}>
              As multiple emoji:
            </div>
            <div className={styles.emojiResult}>{multiEmojiResult}</div>
          </div>
        )}
        {error && <p>{`${error}`}</p>}
      </div>
    </main>
  );
}
