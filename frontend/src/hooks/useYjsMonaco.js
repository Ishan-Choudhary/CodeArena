import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { MonacoBinding } from "y-monaco";
import { useAuthStore } from "../store/authStore";

export const useYjsMonaco = (roomCode) => {
    const editorRef = useRef(null);
    const yDocRef = useRef(null);
    const yTextRef = useRef(null);
    const providerRef = useRef(null);
    const bindingRef = useRef(null);
    const undoManagerRef = useRef(null);
    const username = useAuthStore((state) => state.username);

    useEffect(() => {
        if (!roomCode) return;

        const yDoc = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: "ws://127.0.0.1:1234",
            name: roomCode,
            document: yDoc,
        });

        yDocRef.current = yDoc;
        providerRef.current = provider;

        if (editorRef.current) {
            setupBinding(editorRef.current, yDoc, provider);
        }

        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
            provider.destroy();
            yDoc.destroy();
        };
    }, [roomCode]);

    const setupBinding = (editor, yDoc, provider) => {
        if (bindingRef.current) return;

        const model = editor.getModel();
        if (!model) return;

        provider.awareness.setLocalStateField("user", {
            name: username,
            color: "#9fed2b",
        });

        const type = yDoc.getText("monaco");
        yTextRef.current = type;

        const binding = new MonacoBinding(
            type,
            model,
            new Set([editor]),
            provider.awareness
        );

        bindingRef.current = binding;

        const yUndoManager = new Y.UndoManager(type, {
            trackedOrigins: new Set([binding]),
        });

        undoManagerRef.current = yUndoManager;

        editor.layout();
        setTimeout(() => {
            if (editor && editor.getModel()) {
                editor.focus();
                editor.setPosition({ lineNumber: 1, column: 1 });
            }
        }, 100);
    };

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;

        const model = editor.getModel();

        if (model) {
            model.setEOL(monaco.editor.EndOfLineSequence.LF);
        }

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
            undoManagerRef.current?.undo();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
            undoManagerRef.current?.redo();
        });

        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
            () => {
                undoManagerRef.current?.redo();
            }
        );

        const yDoc = yDocRef.current;
        const provider = providerRef.current;

        if (yDoc && provider) {
            setupBinding(editor, yDoc, provider);
        }
    };

    const getCode = () => {
        if (!yTextRef.current) return "";
        return yTextRef.current.toString();
    };

    return {
        handleEditorMount,
        getCode,
    };
};
