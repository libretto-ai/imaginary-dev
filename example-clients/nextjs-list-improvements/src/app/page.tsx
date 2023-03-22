"use client";
import functions from "@/imaginary";
import { wrapRemoteImaginaryFunctions } from "@imaginary-dev/nextjs-util/browser";
import { useCallback, useEffect, useState } from "react";

import styles from "./page.module.css";

const imaginaryFunctions = wrapRemoteImaginaryFunctions(
  functions,
  "/api/imaginary/"
);
export default function Home() {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [busyCount, setBusyCount] = useState(0);
  const [listName, setListName] = useState("");
  const onAddItem = useCallback(
    (e: any) => {
      e.preventDefault();
      setItems((prevItems) => [...prevItems, newItem]);
      setNewItem("");
    },
    [newItem]
  );
  const onRemoveItem = useCallback((value: string) => {
    setItems((prevItems) => prevItems.filter((i) => i !== value));
  }, []);

  const onSuggest = useCallback(async () => {
    setBusyCount((busy) => busy + 1);

    try {
      const newItem = await imaginaryFunctions.getAdditionalItem(
        listName,
        items
      );
      if (newItem) {
        setNewItem(newItem);
      }
    } finally {
      setBusyCount((busy) => busy - 1);
    }
  }, [items, listName]);
  const suggestEnabled = items.length >= 3;
  const addEnabled = newItem.trim().length > 0;
  const itemCount = items.length;
  useEffect(() => {
    async function getName() {
      setBusyCount((busy) => busy + 1);
      try {
        const newName = await imaginaryFunctions.getNameForList(items);
        if (newName) {
          setListName(newName);
        }
      } finally {
        setBusyCount((busy) => busy - 1);
      }
    }
    if (items.length > 3) {
      getName();
    }
  }, [items]);

  return (
    <main className={styles.body}>
      <div className={styles.container}>
        <h1 className={styles.h1}>Add Items to List</h1>
        <h2 className={styles.h2}>{listName}</h2>
        <ul className={styles.ul}>
          {items.map((item, index) => (
            <li className={styles.li} key={index}>
              {item}
              <button
                className={styles.removeButton}
                onClick={() => onRemoveItem(item)}
                type="button"
              >
                x
              </button>
            </li>
          ))}
        </ul>

        <form className={styles.form} onSubmit={onAddItem}>
          <input
            className={styles.input}
            type="text"
            id="item"
            placeholder="Enter an item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <div className={styles.buttonbar}>
            <button
              className={styles.button}
              type="button"
              onClick={onAddItem}
              disabled={!addEnabled}
            >
              Add Item
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={onSuggest}
              disabled={!suggestEnabled}
            >
              Suggest
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
