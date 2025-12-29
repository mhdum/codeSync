"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import * as diff from "diff";

function boolFromParam(p: string | null) {
  return p === "true" || p === "1";
}

function DiffViewer({
  original,
  modified,
}: {
  original: string | null;
  modified: string | null;
}) {
  const safeOriginal = original ?? "";
  const safeModified = modified ?? "";

  const differences = diff.diffLines(safeOriginal, safeModified);
  return (
    <div className="font-mono text-sm bg-gray-900 p-2 rounded max-h-40 overflow-auto">
      {differences.map((part, index) => {
        const color = part.added ? "bg-green-900" : part.removed ? "bg-red-900" : "bg-gray-800";
        const prefix = part.added ? "+" : part.removed ? "-" : " ";
        return (
          <div key={index} className={`${color} px-1 py-0.5`}>
            <span className="opacity-70">{prefix}</span>

            {(part.value ?? "")
              .split("\n")
              .map(
                (line, lineIndex) =>
                  line !== "" && (
                    <div key={lineIndex} className="whitespace-pre">
                      {line}
                    </div>
                  )
              )}
          </div>
        );
      })}
    </div>
  );
}

// compute line-based changes
function computeLineChanges(original: string, modified: string) {
  const differences = diff.diffLines(original, modified);
  const changes = {
    addedLines: [] as { line: string; index: number }[],
    removedLines: [] as { line: string; index: number }[],
    modifiedLines: [] as { oldLine: string; newLine: string; index: number }[],
  };

  let lineIndex = 0;

  differences.forEach((part) => {
    const lines = part.value.split("\n").filter((line) => line !== "");

    if (part.added) {
      lines.forEach((line) => {
        changes.addedLines.push({ line, index: lineIndex });
        lineIndex++;
      });
    } else if (part.removed) {
      lines.forEach((line) => {
        changes.removedLines.push({ line, index: lineIndex });
      });
    } else {
      lineIndex += lines.length;
    }
  });

  return changes;
}

/* revertCollaboratorChanges (three-way-aware, block-safe) */
function revertCollaboratorChanges(currentContent: string, proposal: any): string {
  if (!proposal || proposal.changeType !== "diff" || !proposal.originalContent) {
    return proposal?.originalContent ?? currentContent;
  }

  const base = proposal.originalContent as string;
  const theirs = proposal.content as string;

  if (currentContent === base) {
    console.log("🔁 Current content equals proposal base — returning base");
    return base;
  }

  const parts = diff.diffLines(base, theirs);
  let result = currentContent;

  console.log("🔍 revertCollaboratorChanges: parts count", parts.length);

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const blockRaw = part.value;
    const blockTrimmed = blockRaw.replace(/\n$/, "");
    if (!blockTrimmed) continue;

    if (part.added) {
      const idx = result.indexOf(blockTrimmed);
      if (idx !== -1) {
        console.log("➖ Removing collaborator-added block at", idx);
        result = result.slice(0, idx) + result.slice(idx + blockTrimmed.length);
      } else {
        const lines = blockTrimmed.split("\n").filter(Boolean);
        if (lines.length) {
          let removedAny = false;
          for (let start = result.indexOf(lines[0]); start !== -1; start = result.indexOf(lines[0], start + 1)) {
            const candidate = result.slice(start, start + blockTrimmed.length);
            if (candidate.indexOf(lines.join("\n")) !== -1) {
              result = result.slice(0, start) + result.slice(start + blockTrimmed.length);
              removedAny = true;
              break;
            }
          }
          if (!removedAny) {
            console.log("⚠️ Could not find collaborator-added block to remove — preserving admin edits");
          } else {
            console.log("➖ Removed collaborator block by heuristic");
          }
        }
      }
    } else if (part.removed) {
      const linesToRestore = blockTrimmed.split("\n").filter(Boolean);
      if (!linesToRestore.length) continue;

      let anchorText = "";
      for (let j = i - 1; j >= 0; j--) {
        if (!parts[j].added && !parts[j].removed) {
          const candidate = parts[j].value.replace(/\n$/, "");
          if (candidate.trim()) {
            anchorText = candidate;
            break;
          }
        }
      }
      if (!anchorText) {
        for (let j = i + 1; j < parts.length; j++) {
          if (!parts[j].added && !parts[j].removed) {
            const candidate = parts[j].value.replace(/\n$/, "");
            if (candidate.trim()) {
              anchorText = candidate;
              break;
            }
          }
        }
      }

      const restoreBlock = linesToRestore.join("\n");
      let inserted = false;
      if (anchorText) {
        const anchorIdx = result.indexOf(anchorText);
        if (anchorIdx !== -1) {
          const insertPos = anchorIdx + anchorText.length;
          console.log("➕ Restoring collaborator-removed block after anchor at", insertPos);
          result = result.slice(0, insertPos) + "\n" + restoreBlock + result.slice(insertPos);
          inserted = true;
        }
      }
      if (!inserted) {
        console.log("⚠️ Anchor not found — appending restored lines at end");
        if (!result.endsWith("\n")) result += "\n";
        result += restoreBlock;
      }
    } else {
      // neutral - nothing
    }
  }

  result = result.replace(/\n{3,}/g, "\n\n");
  console.log("✅ revertCollaboratorChanges complete. result length:", result.length);
  return result;
}

export default function ProjectEditorPage() {
  const params = useSearchParams();
  const filename = params.get("filename") || "untitled";
  const extension = params.get("extension") || "js";
  const fileId = params.get("fileId") || "";
  const projectId = params.get("projectId") || "";

  // userRole param: "viewer" or "editor"
  const userRole = params.get("userRole") || "";
  const isAdmin = boolFromParam(params.get("isAdmin"));
  const isViewer = userRole === "viewer";
  const isEditor = userRole === "editor";

  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [userProposalStatus, setUserProposalStatus] = useState<any | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [currentContent, setCurrentContent] = useState<string>("");
  const [showDiff, setShowDiff] = useState(false);
  const [yjsConnected, setYjsConnected] = useState(false);
  const [editorContent, setEditorContent] = useState<string>(""); // used for diffs/UI, not as controlled editor value
  const [inputArgs, setInputArgs] = useState("");

  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<any>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const proposeTimeout = useRef<NodeJS.Timeout | null>(null);
  const proposeListenerRef = useRef<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const lastProposedContent = useRef<string>("");
  const sessionStartContent = useRef<string>("");
  const seededRef = useRef<boolean>(false);

  // const remoteDecorationsRef = useRef<Map<number, string[]>>(new Map());
  // const remoteWidgetsRef = useRef<Map<number, any>>(new Map());
  // const remoteColorsRef = useRef<Map<number, string>>(new Map());



  const pickColorFor = (idOrEmail: string) => {
    // deterministic hash -> color
    let hash = 0;
    for (let i = 0; i < idOrEmail.length; i++) hash = (hash << 5) - hash + idOrEmail.charCodeAt(i);
    const color = `#${((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
    return color;
  };


  // const upsertOverlayWidget = (
  //   clientId: number,
  //   pos: any,
  //   label: string,
  //   color: string
  // ) => {
  //   const editor = editorRef.current;
  //   if (!editor || !pos) return;

  //   // remove old widget
  //   const existing = remoteWidgetsRef.current.get(clientId);
  //   if (existing) {
  //     try { editor.removeOverlayWidget(existing); } catch { }
  //   }

  //   const dom = document.createElement("div");
  //   dom.className = "remote-cursor-widget";

  //   const caret = document.createElement("div");
  //   caret.className = "remote-caret";
  //   caret.style.borderLeftColor = color;

  //   const labelDom = document.createElement("div");
  //   labelDom.className = "remote-cursor-label";
  //   labelDom.textContent = label;
  //   labelDom.style.background = color;

  //   dom.appendChild(caret);
  //   dom.appendChild(labelDom);

  //   const widget = {
  //     getId: () => `remote-cursor-${clientId}`,
  //     getDomNode: () => dom,

  //     // 🔴 THIS WAS THE BUG
  //     getPosition: () => ({
  //       position: pos,
  //       preference: [
  //         (window as any).monaco.editor.OverlayWidgetPositionPreference.TOP_CENTER
  //       ]
  //     }),
  //   };

  //   editor.addOverlayWidget(widget);
  //   remoteWidgetsRef.current.set(clientId, widget);
  // };


  // const removeRemoteClient = (clientId: number) => {
  //   try {
  //     const editor = editorRef.current;
  //     if (!editor) return;

  //     // remove decorations
  //     const oldDec = remoteDecorationsRef.current.get(clientId) || [];
  //     if (oldDec.length) {
  //       try {
  //         editor.deltaDecorations(oldDec, []);
  //       } catch (e) { }
  //       remoteDecorationsRef.current.delete(clientId);
  //     }

  //     // remove widget
  //     const widget = remoteWidgetsRef.current.get(clientId);
  //     if (widget) {
  //       try { editor.removeOverlayWidget(widget); } catch (e) { }
  //       remoteWidgetsRef.current.delete(clientId);
  //     }

  //     // remove stored color
  //     remoteColorsRef.current.delete(clientId);
  //   } catch (e) {
  //     console.warn("removeRemoteClient error", e);
  //   }
  // };


  // Helper: wait for Yjs to seed/sync or timeout
  const waitForYjsSeed = async (timeoutMs = 2500) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (yTextRef.current && seededRef.current) {
        return true;
      }
      if (yTextRef.current && yTextRef.current.length > 0) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };

  // Load initial file content
  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;

    (async () => {
      try {
        const fileRes = await fetch(`/api/files/${fileId}`);
        const fileData = await fileRes.json();
        const content = fileData?.content ?? "// Start coding here...";
        if (cancelled) return;
        setOriginalContent(content);
        setCurrentContent(content);
        setEditorContent(content);
        lastProposedContent.current = content;
        sessionStartContent.current = content;
        console.log("📥 Initial content loaded", fileId);
      } catch (err) {
        console.error("❌ Error loading file content:", err);
        const fallback = "// Start coding here...";
        if (cancelled) return;
        setOriginalContent(fallback);
        setCurrentContent(fallback);
        setEditorContent(fallback);
        lastProposedContent.current = fallback;
        sessionStartContent.current = fallback;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  // Initialize Yjs
  useEffect(() => {
    if (!fileId) return;

    try {
      providerRef.current?.destroy();
      providerRef.current = null;
    } catch { }
    try {
      ydocRef.current?.destroy();
      ydocRef.current = null;
    } catch { }
    yTextRef.current = null;
    seededRef.current = false;

    // initialize if admin, viewer, or an editor who started a session
    const shouldInit = isAdmin || isViewer || (isEditor && sessionActive);
    if (!shouldInit) {
      console.log("🚫 Yjs not initialized (not admin/viewer/editor-in-session)");
      return;
    }

    console.log("✅ Initializing Yjs room for file:", fileId);

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      `wss://yjs-websocket-server-hfb8.onrender.com/collaboration/${fileId}`,
      "",
      ydoc
    );
    providerRef.current = provider;

    provider.on("status", (ev: any) => {
      console.log("🔌 y-websocket status:", ev.status);
      setYjsConnected(ev.status === "connected");
    });

    try {
      const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "anonymous" : "anonymous";
      provider.awareness.setLocalState({
        user: {
          id: userEmail,
          name: userEmail.split("@")[0],
          isAdmin,
          isViewer,
          sessionActive,
        },
        cursor: {
          anchor: 0,
          head: 0,
          name: userEmail.split("@")[0],
        },
      });
    } catch (e) {
      console.warn("awareness set failed", e);
    }

    const yText = ydoc.getText("monaco");
    yTextRef.current = yText;

    const initialToSeed = currentContent ?? originalContent ?? "// Start coding here...";
    const onSync = (isSynced: boolean) => {
      try {
        console.log("🔁 provider sync:", isSynced, "yText length:", yText.length);
        if (!seededRef.current) {
          if (yText.length === 0 && initialToSeed) {
            try {
              yText.insert(0, initialToSeed);
              console.log("📝 seeded Y.Text (post-sync) with initial content");
            } catch (e) {
              console.warn("seed insert failed", e);
            }
          } else {
            const remote = yText.toString();
            if (remote) {
              setCurrentContent(remote);
              setEditorContent(remote);
              // don't directly set editor.value here — MonacoBinding will sync editor model
            }
          }
          seededRef.current = true;
        }
      } catch (e) {
        console.error("onSync handler error", e);
      }
    };

    try {
      provider.on("sync", onSync);
    } catch (e) {
      setTimeout(() => {
        if (!seededRef.current) {
          if (yText.length === 0 && initialToSeed) {
            try {
              yText.insert(0, initialToSeed);
              seededRef.current = true;
              console.log("📝 seeded Y.Text (fallback timeout)");
            } catch (err) {
              console.warn("fallback seed failed", err);
            }
          } else {
            const remote = yText.toString();
            if (remote) {
              setCurrentContent(remote);
              setEditorContent(remote);
              seededRef.current = true;
            }
          }
        }
      }, 800);
    }

    const onYdocUpdate = () => {
      try {
        const txt = yTextRef.current?.toString() ?? "";
        // update state for UI/diff use; MonacoBinding will update editor model directly
        setCurrentContent(txt);
        setEditorContent(txt);
      } catch (e) { }
    };
    ydoc.on("update", onYdocUpdate);

    const awareness = provider.awareness;
    const electLeader = () => {
      const states = Array.from(awareness.getStates().values()) as any[];
      const clients = states.filter(Boolean);
      if (clients.length === 0) {
        setIsLeader(true);
        return;
      }
      const adminClient = clients.find((c) => c.user?.isAdmin);
      if (adminClient) {
        setIsLeader(ydoc.clientID === adminClient.clientId);
      } else {
        const ids = clients.map((c) => c.clientId).filter(Boolean);
        const min = Math.min(...ids);
        setIsLeader(ydoc.clientID === min);
      }
    };
    awareness.on("update", electLeader);
    electLeader();

    const onAutoSave = () => {
      if (!isLeader) return;
      const content = yTextRef.current?.toString() ?? "";
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await fetch(`/api/files/${fileId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          setOriginalContent(content);
          console.log("💾 Autosaved file content (leader)");
        } catch (err) {
          console.error("autosave error", err);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    };
    ydoc.on("update", onAutoSave);

    return () => {
      try {
        ydoc.off("update", onAutoSave);
      } catch { }
      try {
        ydoc.off("update", onYdocUpdate);
      } catch { }
      try {
        awareness.off("update", electLeader);
      } catch { }
      try {
        provider.off("sync", onSync);
      } catch { }
      try {
        provider.destroy();
      } catch { }
      try {
        ydoc.destroy();
      } catch { }
      providerRef.current = null;
      ydocRef.current = null;
      yTextRef.current = null;
      if (bindingRef.current) {
        try {
          (bindingRef.current as any).destroy?.();
        } catch (e) { }
        bindingRef.current = null;
      }
      seededRef.current = false;
      console.log("🧹 Yjs cleaned for file:", fileId);
    };
  }, [fileId, isAdmin, isViewer, isEditor, sessionActive]);

  // Create MonacoBinding
  useEffect(() => {
    const editor = editorRef.current;
    const yText = yTextRef.current;
    const provider = providerRef.current;



    if (!editor || !yText || !provider) return;
    if (bindingRef.current) return;
    const awareness = provider.awareness;
    if (!awareness) return;
    try {
      const model = editor.getModel();
      if (!model) {
        console.warn("No model to bind yet");
        return;
      }

      bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
      console.log("✅ MonacoBinding created");

      const yjsVal = yText.toString();
      // only set editor value if different to avoid cursor jumps
      if (yjsVal && editor.getValue() !== yjsVal) {
        try {
          editor.setValue(yjsVal);
        } catch (e) {
          console.warn("editor.setValue after binding failed", e);
        }
      }

      return () => {
        try {
          (bindingRef.current as any)?.destroy?.();
        } catch (e) {
          console.warn("binding destroy error", e);
        } finally {
          bindingRef.current = null;
        }
      };
    } catch (err) {
      console.error("Failed to create MonacoBinding:", err);
    }
  }, [yjsConnected, fileId]);

  // useEffect(() => {

  //   if (!bindingRef.current) return;
  //   const editor = editorRef.current;
  //   const provider = providerRef.current;

  //   if (!editor || !provider) return;

  //   const awareness = provider.awareness;

  //   const updateCursor = () => {
  //     const selection = editor.getSelection();
  //     if (!selection) return;

  //     const model = editor.getModel();
  //     if (!model) return;

  //     const anchor = model.getOffsetAt(selection.getStartPosition());
  //     const head = model.getOffsetAt(selection.getEndPosition());

  //     awareness.setLocalStateField("cursor", {
  //       anchor,
  //       head,
  //       name:
  //         awareness.getLocalState()?.user?.name ||
  //         "anonymous",
  //     });
  //   };

  //   const disposable = editor.onDidChangeCursorSelection(updateCursor);
  //   updateCursor(); // initial

  //   return () => {
  //     disposable.dispose();
  //   };
  // }, [yjsConnected, fileId]);

  // useEffect(() => {
  //   const provider = providerRef.current;
  //   const editor = editorRef.current;

  //   if (!provider || !editor) return;

  //   const awareness = provider.awareness;
  //   if (!awareness) return;

  //   const applyAwareness = () => {
  //     const model = editor.getModel();
  //     if (!model) return;

  //     const states = Array.from(awareness.getStates().entries());
  //     const localEmail = localStorage.getItem("userEmail") || "anonymous";
  //     const presentClientIds = new Set<number>();

  //     for (const [clientId, state] of states as any) {
  //       if (!state) continue;

  //       const cursor = state.cursor;
  //       const user = state.user || {};
  //       const ownerId = user.id || String(clientId);

  //       if (clientId === provider.awareness.clientID) continue;


  //       presentClientIds.add(clientId);

  //       const color =
  //         remoteColorsRef.current.get(clientId) || pickColorFor(ownerId);
  //       remoteColorsRef.current.set(clientId, color);

  //       if (!cursor) {
  //         removeRemoteClient(clientId);
  //         continue;
  //       }

  //       const anchor = Math.min(cursor.anchor, model.getValueLength());
  //       const head = Math.min(cursor.head, model.getValueLength());

  //       const start = Math.min(anchor, head);
  //       const end = Math.max(anchor, head);

  //       const newDecs =
  //         end > start
  //           ? [
  //             {
  //               range: new (window as any).monaco.Range(
  //                 model.getPositionAt(start).lineNumber,
  //                 model.getPositionAt(start).column,
  //                 model.getPositionAt(end).lineNumber,
  //                 model.getPositionAt(end).column
  //               ),
  //               options: { inlineClassName: "remote-selection" },
  //             },
  //           ]
  //           : [];

  //       const oldIds = remoteDecorationsRef.current.get(clientId) || [];
  //       const newIds = editor.deltaDecorations(oldIds, newDecs);
  //       remoteDecorationsRef.current.set(clientId, newIds);

  //       upsertOverlayWidget(
  //         clientId,
  //         model.getPositionAt(head),
  //         (cursor.name || user.name || ownerId).split("@")[0],
  //         color
  //       );
  //     }

  //     for (const cid of Array.from(remoteDecorationsRef.current.keys())) {
  //       if (!presentClientIds.has(cid)) removeRemoteClient(cid);
  //     }
  //   };

  //   awareness.on("update", applyAwareness);
  //   applyAwareness();

  //   return () => {
  //     awareness.off("update", applyAwareness);
  //     remoteDecorationsRef.current.forEach((_, cid) => removeRemoteClient(cid));
  //   };
  // }, [yjsConnected, fileId]);


  // Editor mount handler
  const handleEditorMount = useCallback(
    (editor: any) => {
      console.log("📝 Editor mounted");
      editorRef.current = editor;

      // set initial content only if editor is empty to avoid overwriting user's typing
      try {
        const currentVal = editor.getValue?.() ?? "";
        if (!currentVal && editorContent) {
          editor.setValue(editorContent);
        }
      } catch (e) {
        console.warn("initial setValue failed", e);
      }

      // compute edit permissions: admin always can edit, editors can edit only during session
      const canEdit = isAdmin || (isEditor && sessionActive);
      editor.updateOptions({ readOnly: !canEdit, minimap: { enabled: true } });

      // only attach propose listener for editors (not viewer) when NOT in realtime session
      if (isEditor && !isAdmin && !sessionActive) {
        if (proposeListenerRef.current) {
          try {
            proposeListenerRef.current.dispose();
          } catch { }
        }
        proposeListenerRef.current = editor.onDidChangeModelContent(() => {
          // do NOT call editor.setValue here — this is the user's typing
          const content = editor.getValue();
          setEditorContent(content); // used for diffs/UI only
          if (proposeTimeout.current) clearTimeout(proposeTimeout.current);
          proposeTimeout.current = setTimeout(() => {
            // noop - you can trigger something here if required
          }, 800);
        });
      } else {
        if (proposeListenerRef.current) {
          try {
            proposeListenerRef.current.dispose();
          } catch { }
          proposeListenerRef.current = null;
        }
      }

      const yText = yTextRef.current;
      const provider = providerRef.current;
      if (yText && provider && !bindingRef.current) {
        setTimeout(() => {
          try {
            const model = editor.getModel();
            if (!model) return;
            // bindingRef.current = new MonacoBinding(
            //   yText,
            //   model,
            //   new Set([editor]),
            //   provider.awareness
            // );

            const awareness = provider.awareness;
            console.log("✅ Immediate MonacoBinding created after mount");
            // editor.onDidChangeCursorPosition((e: any) => {
            //   awareness.setLocalStateField("cursor", {
            //     anchor: model.getOffsetAt(e.position),
            //     head: model.getOffsetAt(e.position),
            //     name: localStorage.getItem("userEmail") || "unknown",
            //     color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            //   });
            // });


            // editor.onDidChangeCursorPosition((e: any) => {
            //   const email = localStorage.getItem("userEmail") || "U";
            //   const initial = email.charAt(0).toUpperCase();
            //   console.log("🖋️ updating cursor position for", initial);
            //   awareness.setLocalStateField("cursor", {
            //     anchor: model.getOffsetAt(e.position),
            //     head: model.getOffsetAt(e.position),
            //     user: {
            //       name: initial,
            //       color: "#8282eaff",
            //     },
            //   });
            // });

            // Run ONCE after provider is ready
            const email = localStorage.getItem("userEmail") || "U";
            const initial = email.charAt(0).toUpperCase();

            awareness.setLocalStateField("user", {
              name: initial,
              color: "#8282eaff",
            });
            // clear cursor when user leaves the page
            window.addEventListener("beforeunload", () => {
              awareness.setLocalStateField("cursor", null);
            });
          } catch (e) {
            console.warn("Immediate binding failed", e);
          }
        }, 50);
      }
    },
    [editorContent, isAdmin, isViewer, isEditor, sessionActive]
  );

  // Submit proposal with changes
  const submitProposal = async (finalContent: string) => {
    try {
      const proposerEmail = localStorage.getItem("userEmail") || "unknown";
      const changes = computeLineChanges(sessionStartContent.current, finalContent);

      console.log("📨 submitting proposal with changes:", {
        added: changes.addedLines.length,
        removed: changes.removedLines.length,
      });

      const res = await fetch("/api/changes/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          proposerId: proposerEmail,
          proposerEmail,
          content: finalContent,
          originalContent: sessionStartContent.current,
          changes: changes,
          changeType: "diff",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setUserProposalStatus({ status: "pending", proposalId: json.id });
        lastProposedContent.current = finalContent;
        console.log("✅ proposal saved id:", json.id);
      } else {
        console.error("❌ proposal failed", await res.text());
      }
    } catch (err) {
      console.error("❌ proposal error", err);
    }
  };

  // START SESSION (editor flow)
  const startSession = async () => {
    try {
      if (!isEditor || isAdmin) {
        console.warn("startSession: user not allowed to start session");
        return;
      }

      const userEmail = localStorage.getItem("userEmail") || "unknown";

      setSessionActive(true);
      try {
        editorRef.current?.updateOptions({ readOnly: true });
      } catch { }

      const yjsReady = await waitForYjsSeed(2200);
      let authoritativeBase = "";

      if (yjsReady && yTextRef.current) {
        authoritativeBase = yTextRef.current.toString();
        console.log("startSession: using yText as authoritative base (length)", authoritativeBase.length);
      } else {
        try {
          const fileRes = await fetch(`/api/files/${fileId}`);
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            authoritativeBase = fileData?.content ?? "";
            console.log("startSession: fetched server file as fallback (length)", authoritativeBase.length);
            if (yTextRef.current && yTextRef.current.length === 0 && authoritativeBase) {
              try {
                yTextRef.current.insert(0, authoritativeBase);
                seededRef.current = true;
              } catch (e) {
                console.warn("seed yText fallback failed", e);
              }
            }
          } else {
            console.warn("startSession: fetch server file failed; will use editor value");
            authoritativeBase = editorRef.current?.getValue?.() ?? currentContent;
          }
        } catch (e) {
          console.warn("startSession: error fetching server file", e);
          authoritativeBase = editorRef.current?.getValue?.() ?? currentContent;
        }
      }

      sessionStartContent.current = authoritativeBase ?? (editorRef.current?.getValue?.() ?? currentContent);
      setEditorContent(sessionStartContent.current);
      setCurrentContent(sessionStartContent.current);
      setOriginalContent((prev) => prev || sessionStartContent.current);
      try {
        // only set value if different
        if (editorRef.current?.getValue?.() !== sessionStartContent.current) {
          editorRef.current?.setValue(sessionStartContent.current);
        }
      } catch (e) {
        console.warn("editor setValue failed", e);
      }

      if (yTextRef.current) {
        const remote = yTextRef.current.toString();
        if (remote !== sessionStartContent.current) {
          try {
            yTextRef.current.delete(0, yTextRef.current.length);
            yTextRef.current.insert(0, sessionStartContent.current);
            seededRef.current = true;
            console.log("startSession: synced yText to authoritative base");
          } catch (e) {
            console.warn("startSession: syncing yText failed", e);
          }
        }
      }

      await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, userId: userEmail, userEmail }),
      });

      try {
        editorRef.current?.updateOptions({ readOnly: false });
      } catch { }

      console.log("✅ session started and base established (length):", sessionStartContent.current.length);
    } catch (e) {
      console.error("❌ start session failed", e);
      setSessionActive(true);
      try {
        editorRef.current?.updateOptions({ readOnly: false });
      } catch { }
    }
  };

  const endSession = async () => {
    try {
      if (!isEditor || isAdmin) {
        console.warn("endSession: user not allowed to end session");
        return;
      }

      const userEmail = localStorage.getItem("userEmail") || "unknown";
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, userId: userEmail }),
      });

      setSessionActive(false);
      editorRef.current?.updateOptions({ readOnly: true });

      const finalContent = editorRef.current?.getValue?.() ?? currentContent;

      const hasChanges = finalContent !== sessionStartContent.current;
      const isNewProposal = finalContent !== lastProposedContent.current;

      if (hasChanges && isNewProposal) {
        await submitProposal(finalContent);
        lastProposedContent.current = finalContent;
        console.log("✅ session ended with changes - proposal submitted");
      } else if (!hasChanges) {
        console.log("ℹ️ no changes made during session - skipping proposal");
      } else {
        console.log("ℹ️ same content already proposed - skipping duplicate");
      }
    } catch (e) {
      console.error("❌ end session failed", e);
    }
  };

  // const endSession = async () => {
  //   try {
  //     if (!isEditor || isAdmin) {
  //       console.warn("endSession: user not allowed to end session");
  //       return;
  //     }

  //     const userEmail = localStorage.getItem("userEmail") || "unknown";

  //     const finalContent =
  //       editorRef.current?.getValue?.() ?? currentContent;

  //     const hasChanges = finalContent !== sessionStartContent.current;
  //     const isNewProposal = finalContent !== lastProposedContent.current;

  //     // 🔹 prepare diff only if needed
  //     const changes = hasChanges
  //       ? computeLineChanges(sessionStartContent.current, finalContent)
  //       : null;

  //     // 🔥 RUN API CALLS IN PARALLEL
  //     const tasks: Promise<any>[] = [];

  //     // 1️⃣ end session
  //     tasks.push(
  //       fetch("/api/session/end", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ fileId, userId: userEmail }),
  //       })
  //     );

  //     // 2️⃣ submit proposal (existing behavior)
  //     if (hasChanges && isNewProposal) {
  //       tasks.push(
  //         submitProposal(finalContent).then(() => {
  //           lastProposedContent.current = finalContent;
  //         })
  //       );
  //     }

  //     // 3️⃣ version control snapshot (🔥 NEW — uses ONLY existing data)
  //     if (hasChanges) {
  //       tasks.push(
  //         fetch("/api/version-control/create", {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({
  //             projectId,                 // already exists in your app
  //             fileId,
  //             collaboratorId: userEmail,
  //             collaboratorEmail: userEmail,

  //             originalContent: sessionStartContent.current,
  //             finalContent,
  //             changes,
  //           }),
  //         })
  //       );
  //     }

  //     // 🚀 do not block UI
  //     Promise.allSettled(tasks).catch(console.error);

  //     // UI updates immediately
  //     setSessionActive(false);
  //     editorRef.current?.updateOptions({ readOnly: true });

  //     if (hasChanges && isNewProposal) {
  //       console.log("✅ session ended — proposal + version stored");
  //     } else if (!hasChanges) {
  //       console.log("ℹ️ no changes made during session");
  //     } else {
  //       console.log("ℹ️ duplicate proposal skipped");
  //     }
  //   } catch (e) {
  //     console.error("❌ end session failed", e);
  //   }
  // };


  // Admin polls proposals
  useEffect(() => {
    if (!fileId || !isAdmin) return;
    let cancelled = false;

    const fetchProposals = async () => {
      try {
        const res = await fetch(`/api/changes/list?fileId=${fileId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const unique = (json.proposals || []).filter((p: any, idx: number, arr: any[]) => {
          const isUniqueId = idx === arr.findIndex((q: any) => q.id === p.id);
          const isUniqueContent =
            idx ===
            arr.findIndex((q: any) => q.originalContent === p.originalContent && q.content === p.content);
          return isUniqueId && isUniqueContent;
        });

        setProposals(unique);
      } catch (e) {
        console.error("Failed to fetch proposals", e);
      }
    };

    fetchProposals();
    const iv = setInterval(fetchProposals, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [fileId, isAdmin]);

  // Collaborator/editor polls proposal status (viewers excluded)
  useEffect(() => {
    if (!userProposalStatus?.proposalId || isAdmin || isViewer) return;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/changes/status?proposalId=${userProposalStatus.proposalId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        if (json.status && json.status !== "pending") {
          setUserProposalStatus(json);

          if (json.status === "approved") {
            const fileRes = await fetch(`/api/files/${fileId}`);
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              const newContent = fileData.content ?? "";
              setOriginalContent(newContent);
              setCurrentContent(newContent);
              setEditorContent(newContent);
              if (editorRef.current && editorRef.current.getValue() !== newContent) editorRef.current.setValue(newContent);

              if (yTextRef.current) {
                yTextRef.current.delete(0, yTextRef.current.length);
                yTextRef.current.insert(0, newContent);
              }
            }
            console.log("✅ Proposal approved - content updated");
          } else if (json.status === "rejected") {
            try {
              const propRes = await fetch(`/api/changes/get?proposalId=${userProposalStatus.proposalId}`);
              if (propRes.ok) {
                const proposalObj = await propRes.json();
                const cur = editorRef.current?.getValue?.() ?? currentContent;
                const contentAfterRejection = revertCollaboratorChanges(cur, proposalObj);

                // Persist/re-sync
                await fetch(`/api/files/${fileId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: contentAfterRejection }),
                });

                if (yTextRef.current) {
                  yTextRef.current.delete(0, yTextRef.current.length);
                  yTextRef.current.insert(0, contentAfterRejection);
                }

                setOriginalContent(contentAfterRejection);
                setCurrentContent(contentAfterRejection);
                setEditorContent(contentAfterRejection);
                if (editorRef.current) editorRef.current.setValue(contentAfterRejection);

                console.log("❌ Proposal rejected (collaborator) - smart revert applied.");
              } else {
                console.warn("Could not fetch proposal object for rejection; reverting to session start as fallback.");
                if (editorRef.current) {
                  editorRef.current.setValue(sessionStartContent.current);
                  setEditorContent(sessionStartContent.current);
                  setCurrentContent(sessionStartContent.current);
                }
              }
            } catch (err) {
              console.error("Error handling rejection for collaborator:", err);
            }
          }
        }
      } catch (e) {
        console.error("checkStatus failed", e);
      }
    };

    checkStatus();
    const iv = setInterval(checkStatus, 2500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [userProposalStatus, fileId, isAdmin, isViewer, currentContent]);

  // Approve & Reject functions
  const approveProposal = async (proposal: any) => {
    try {
      const reviewerEmail = localStorage.getItem("userEmail") || "admin";
      let contentToApply = proposal.content;
      if (proposal.changes && proposal.changeType === "diff") contentToApply = proposal.content;

      await fetch(`/api/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToApply }),
      });

      await fetch("/api/changes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, reviewerId: reviewerEmail, reviewerEmail }),
      });

      const collaboratorId = proposal.proposerId ?? proposal.proposerEmail ?? "unknown";
      const collaboratorEmail = proposal.proposerEmail ?? proposal.proposerId ?? null;

      // Ensure "changes" is present and in the expected shape
      const changesPayload = proposal.changes ?? computeLineChanges(proposal.originalContent ?? "", proposal.content ?? "");

      const versionRes = await fetch("/api/version-control/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileId,

          collaboratorId,
          collaboratorEmail,

          originalContent: proposal.originalContent ?? "",
          finalContent: proposal.content ?? "",

          changes: changesPayload,
          proposalId: proposal.id,
        }),
      });



      if (yTextRef.current) {
        yTextRef.current.delete(0, yTextRef.current.length);
        yTextRef.current.insert(0, contentToApply);
      }

      setOriginalContent(contentToApply);
      setCurrentContent(contentToApply);
      setEditorContent(contentToApply);
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      if (editorRef.current && editorRef.current.getValue() !== contentToApply) editorRef.current.setValue(contentToApply);

      console.log("✅ Proposal approved and changes applied");
    } catch (e) {
      console.error("approve failed", e);
    }
  };

  const rejectProposal = async (proposal: any) => {
    try {
      const reviewerEmail = localStorage.getItem("userEmail") || "admin";
      const reason = prompt("Reason for rejection (optional):") || "";

      const current = editorRef.current?.getValue?.() ?? currentContent;
      const contentAfterRejection = revertCollaboratorChanges(current, proposal);

      await fetch(`/api/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentAfterRejection }),
      });

      await fetch("/api/changes/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, reviewerId: reviewerEmail, reviewerEmail, message: reason }),
      });

      if (yTextRef.current) {
        yTextRef.current.delete(0, yTextRef.current.length);
        yTextRef.current.insert(0, contentAfterRejection);
      }

      setOriginalContent(contentAfterRejection);
      setCurrentContent(contentAfterRejection);
      setEditorContent(contentAfterRejection);
      if (editorRef.current) editorRef.current.setValue(contentAfterRejection);

      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      console.log("❌ Proposal rejected - only collaborator's changes removed, admin changes preserved");
    } catch (e) {
      console.error("reject failed", e);
    }
  };

  // Run code
  const handleRun = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    setIsRunning(true);
    setOutput("");
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: extension,
          version: "*",
          files: [{ name: filename, content: code }],
          stdin: inputArgs,       // 👈 THIS LINE
        }),
      });
      const result = await res.json();
      setOutput(result.run?.output || "No output");
    } catch (err) {
      console.error("Run error", err);
      setOutput("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  const getUserRole = () => (isAdmin ? "Admin" : isViewer ? "Viewer" : isEditor ? "Editor" : "Collaborator");
  const getSessionStatus = () => (isAdmin || isViewer ? "Realtime Active" : sessionActive ? "Realtime Session" : "Proposal Mode");

  // compute canEdit for options - used in Editor props as well as updateOptions on mount
  const canEdit = isAdmin || (isEditor && sessionActive);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800">
        <h2 className="font-semibold text-lg">
          Editing: <span className="text-blue-400">{filename}.{extension}</span>
          {isSaving && (<span className="ml-2 text-sm text-gray-400 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</span>)}
          <span className={`ml-2 text-xs ${yjsConnected ? "text-green-400" : "text-red-400"}`}>{yjsConnected ? "🟢 Connected" : "🔴 Disconnected"}</span>
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{getUserRole()} • {getSessionStatus()}{isLeader && " • 🎯 Leader"}</span>

          {isAdmin && proposals.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowDiff(!showDiff)} className="flex items-center gap-2">
              {showDiff ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showDiff ? "Hide Diff" : "Show Diff"}
            </Button>
          )}

          {/* only show start/end to editors (not viewers), and not to admin */}
          {!isAdmin && isEditor && (
            <Button onClick={sessionActive ? endSession : startSession} className="flex items-center gap-2" variant={sessionActive ? "destructive" : "default"}>
              {sessionActive ? (<><Loader2 className="h-4 w-4 animate-spin" /> End Session</>) : ("Start Real-time Session")}
            </Button>
          )}

          <Button onClick={handleRun} disabled={isRunning} className="flex items-center gap-2">
            {isRunning ? (<><Loader2 className="h-4 w-4 animate-spin" /> Running...</>) : ("Run Code")}
          </Button>
        </div>
      </div>

      {/* Editor & right panel */}
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-300">Editor</h3>
            <div className="text-sm text-gray-400">{getUserRole()} • {getSessionStatus()}</div>
          </div>

          {/* IMPORTANT: use defaultValue (uncontrolled) to avoid conflicts with MonacoBinding */}
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage={extension}
            defaultValue={editorContent}
            onMount={handleEditorMount}
            options={{
              readOnly: !canEdit,
              minimap: { enabled: true },
              // keep other editor options as needed
            }}
          />
        </div>

        {/* 🔹 PROGRAM INPUT (ADD HERE) */}
        <div className="border-b border-gray-700 bg-gray-800 p-3">
          <label className="block text-xs text-gray-400 mb-1">
            Program Input (stdin / arguments)
          </label>
          <textarea
            rows={3}
            value={inputArgs}
            onChange={(e) => setInputArgs(e.target.value)}
            placeholder={`Example:
5
1 2 3 4 5`}
            className="w-full bg-black text-green-400 font-mono text-sm p-2 rounded border border-gray-700 focus:outline-none"
          />
        </div>

        <div className="w-1/3 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-300">Output</h3>
            <div className="text-xs text-gray-400">{getSessionStatus()}</div>
          </div>

          <div className="flex-1 p-3 bg-black text-green-400 font-mono overflow-auto">
            {isRunning ? (<div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Running code...</div>) : (<pre>{output}</pre>)}
          </div>

          {/* Admin proposals */}
          {isAdmin && (
            <div className="border-t border-gray-700 p-3 bg-gray-900 max-h-80 overflow-auto">
              <h4 className="font-semibold mb-2">Pending Proposals ({proposals.length})</h4>
              {proposals.length === 0 ? (<p className="text-sm text-gray-400">No pending proposals</p>) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="bg-gray-800 p-3 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-400">From: {proposal.proposerEmail || proposal.proposerId}</div>
                        <div className="text-xs text-gray-500">{new Date(proposal.createdAt).toLocaleString()}</div>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">Changes Made:</div>
                        <DiffViewer original={proposal.originalContent} modified={proposal.content} />
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => approveProposal(proposal)} className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Apply Changes
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectProposal(proposal)} className="flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Reject Changes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Editor's proposal status (only for editors who proposed) */}
          {!isAdmin && !isViewer && userProposalStatus && (
            <div className="p-3 border-t border-gray-700 bg-gray-900">
              <h4 className="font-semibold">Your Changes</h4>
              <div className="text-sm text-gray-300 mt-2">
                Status: <span className={userProposalStatus.status === 'pending' ? 'text-yellow-400' : userProposalStatus.status === 'approved' ? 'text-green-400' : 'text-red-400'}><b>{userProposalStatus.status}</b></span>
                {userProposalStatus.status === "rejected" && (<div className="text-sm text-red-400 mt-1">Reason: {userProposalStatus.responseMessage || "No reason provided"}</div>)}
              </div>

              {userProposalStatus.status === "pending" && sessionStartContent.current && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400 mb-1">Your changes:</div>
                  <DiffViewer original={sessionStartContent.current} modified={editorContent} />
                </div>
              )}
            </div>
          )}

          {isViewer && (
            <div className="p-3 border-t border-gray-700 bg-gray-900">
              <h4 className="font-semibold">Viewer Mode</h4>
              <p className="text-sm text-gray-400 mt-1">You are viewing this file in read-only mode. Real-time changes are active.</p>
              <p className="text-xs text-gray-500 mt-2">Connection: {yjsConnected ? '🟢 Live' : '🔴 Disconnected'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}