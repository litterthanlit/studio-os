"use client";

import * as React from "react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import {
  CODE_LANGUAGES,
  type CodeItem,
} from "@/lib/canvas/unified-canvas-state";
import {
  InspectorSection,
  InspectorTextInput,
  InspectorTextarea,
  InspectorSelect,
} from "./InspectorField";

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
) {
  const timeoutRef = React.useRef<number | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);
  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );
}

export function CodeItemInspector({ item }: { item: CodeItem }) {
  const { dispatch } = useCanvas();
  const [name, setName] = React.useState(item.name);
  const [content, setContent] = React.useState(item.content);

  React.useEffect(() => {
    setName(item.name);
    setContent(item.content);
  }, [item.id, item.name, item.content]);

  const debouncedContent = useDebouncedCallback((...args: unknown[]) => {
    const next = args[0] as string;
    dispatch({ type: "PUSH_HISTORY", description: "Edit code" });
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      changes: { content: next } as Partial<CodeItem>,
    });
  }, 400);

  return (
    <div className="px-4 pb-4">
      <InspectorSection label="Code">
        <InspectorTextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim() || "Code";
            setName(next);
            if (next === item.name) return;
            dispatch({ type: "PUSH_HISTORY", description: "Rename code" });
            dispatch({
              type: "UPDATE_ITEM",
              itemId: item.id,
              changes: { name: next } as Partial<CodeItem>,
            });
          }}
          placeholder="Label"
        />
        <div className="mt-2">
          <InspectorSelect
            value={item.language}
            onChange={(e) => {
              dispatch({ type: "PUSH_HISTORY", description: "Set code language" });
              dispatch({
                type: "UPDATE_ITEM",
                itemId: item.id,
                changes: { language: e.target.value } as Partial<CodeItem>,
              });
            }}
          >
            {!CODE_LANGUAGES.includes(item.language as typeof CODE_LANGUAGES[number]) && (
              <option value={item.language}>{item.language}</option>
            )}
            {CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </InspectorSelect>
        </div>
      </InspectorSection>

      <InspectorSection label="Content">
        <InspectorTextarea
          value={content}
          rows={12}
          spellCheck={false}
          className="min-h-[180px] font-mono"
          placeholder="Paste code or spec…"
          onChange={(e) => {
            setContent(e.target.value);
            debouncedContent(e.target.value);
          }}
        />
      </InspectorSection>
    </div>
  );
}
