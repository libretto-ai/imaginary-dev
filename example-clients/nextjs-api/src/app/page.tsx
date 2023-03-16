"use client";
import { ApiResponse } from "@/ApiResponse";
import { useState } from "react";
import styles from "./page.module.css";

const Spinner = () => <div className={styles.spinner}></div>;
export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ApiResponse>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const onSubmit = async () => {
    setError(undefined);
    setBusy(true);
    try {
      const response = await fetch(
        `/api/hello?query=${encodeURIComponent(text)}`
      );
      setResult(await response.json());
    } catch (ex) {
      setResult(undefined);
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
        {result && (
          <div>
            <div className={styles.emojiResultDescription}>
              As a single emoji:
            </div>
            <div className={styles.emojiResult}>{result.emojified}</div>
            <div className={styles.emojiResultDescription}>
              As multiple emoji:
            </div>
            <div className={styles.emojiResult}>{result.multiMoji}</div>
          </div>
        )}
        {error && <p>{`${error}`}</p>}
      </div>
    </main>
  );
}
