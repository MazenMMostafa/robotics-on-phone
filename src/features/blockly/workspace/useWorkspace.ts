import { useEffect, useRef } from "react";
import type { WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import type { BoardType } from "../../../core/types/board";
import { useBlocklyStore } from "../store/blocklyStore";
import { registerAllBlocks, registerAllGenerators } from "../blocks/registry";
import { setupGetCode } from "../generators/cppGenerator";
import { buildToolbox } from "./toolbox";
import { ExtensionManager } from "../../../core/services/extension/ExtensionManager";

export function useWorkspace(
  containerRef: React.RefObject<HTMLDivElement | null>,
  board: BoardType,
  initialXml?: string,
  onChange?: (xml: string) => void,
) {
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const initialXmlRef = useRef(initialXml);
  const init = useBlocklyStore((s) => s.init);
  const setLoading = useBlocklyStore((s) => s.setLoading);
  const setError = useBlocklyStore((s) => s.setError);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    initialXmlRef.current = initialXml;
  }, [initialXml]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let disposed = false;
    let ws: WorkspaceSvg | null = null;
    let loaded = false;

    async function setupBlockly() {
      setLoading(true);
      setError(null);

      try {
        const Blockly = await import("blockly");
        if (disposed || !containerRef.current) return;

        registerAllBlocks(Blockly);
        registerAllGenerators(javascriptGenerator);

        ExtensionManager.init();
        ExtensionManager.registerBlocksWithBlockly(Blockly);
        ExtensionManager.registerGenerators(javascriptGenerator);

        ws = Blockly.inject(containerRef.current, {
          toolbox: buildToolbox(board),
          grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
          zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.4 },
          trashcan: true,
          renderer: "zelos",
          move: { scrollbars: true, drag: true, wheel: false },
        });

        workspaceRef.current = ws;
        init(ws);

        // Toolbox toggle behavior
        const setupToolboxToggle = () => {
          const toolbox = document.querySelector(".blocklyToolboxDiv");
          if (!toolbox) return undefined;

          toolbox.classList.add("rb-toolbox-collapsed");

          const openToolbox = () => {
            toolbox.classList.add("rb-toolbox-open");
            setTimeout(() => { if (ws) Blockly.svgResize(ws); }, 50);
          };

          const closeToolbox = () => {
            toolbox.classList.remove("rb-toolbox-open");
            setTimeout(() => { if (ws) Blockly.svgResize(ws); }, 50);
          };

          const stopCloseFromToolbox = (event: Event) => event.stopPropagation();
          toolbox.addEventListener("pointerdown", stopCloseFromToolbox);
          toolbox.addEventListener("click", openToolbox);

          const workspaceEl = containerRef.current;
          workspaceEl?.addEventListener("pointerdown", closeToolbox);

          return () => {
            toolbox.removeEventListener("pointerdown", stopCloseFromToolbox);
            toolbox.removeEventListener("click", openToolbox);
            workspaceEl?.removeEventListener("pointerdown", closeToolbox);
          };
        };

        const cleanupToolbox = setupToolboxToggle();
        setupGetCode(ws, javascriptGenerator, Blockly);

        // Load initial XML
        const xmlToLoad = initialXmlRef.current;
        if (xmlToLoad) {
          try {
            const dom = Blockly.utils.xml.textToDom(xmlToLoad);
            Blockly.Xml.domToWorkspace(dom, ws);
          } catch { /* ignore corrupt xml */ }
        }

        loaded = true;
        setLoading(false);

        // Change listener
        ws.addChangeListener((event: { isUiEvent?: boolean }) => {
          if (!loaded) return;
          if (event?.isUiEvent) return;
          if (!onChangeRef.current || !ws) return;
          const dom = Blockly.Xml.workspaceToDom(ws);
          onChangeRef.current(Blockly.Xml.domToText(dom));
        });

        // Resize handler
        const resize = () => { if (ws) Blockly.svgResize(ws); };
        window.addEventListener("resize", resize);
        setTimeout(resize, 0);
        ws.addChangeListener(() => resize());

        return () => {
          window.removeEventListener("resize", resize);
          cleanupToolbox?.();
        };
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Failed to load Blockly");
          setLoading(false);
        }
      }
    }

    let cleanup: (() => void) | undefined;
    setupBlockly().then((cleanupFn) => { cleanup = cleanupFn; });

    return () => {
      disposed = true;
      cleanup?.();
      if (ws) {
        ws.dispose();
        workspaceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // Handle initialXml updates
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws || !initialXml) return;
    import("blockly").then((Blockly) => {
      try {
        const dom = Blockly.utils.xml.textToDom(initialXml!);
        Blockly.Xml.clearWorkspaceAndLoadFromXml(dom, ws);
      } catch { /* ignore corrupt xml */ }
    });
  }, [initialXml]);

  return workspaceRef;
}
