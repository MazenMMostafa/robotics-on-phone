import { useState, useEffect } from "react";
import HomePage from "../features/home/pages/HomePage";
import NewProjectPage from "../features/projects/pages/NewProjectPage";
import ProjectsPage from "../features/projects/pages/ProjectsPage";
import EditorPage from "../features/editor/pages/EditorPage";
import ConnectPage from "../features/connect/pages/ConnectPage";
import HelpPage from "../features/help/pages/HelpPage";
import { initializeApp } from "../shared/store";

export type Page =
  | { name: "home" }
  | { name: "new" }
  | { name: "projects" }
  | { name: "editor"; id: string }
  | { name: "connect"; backTo?: Page }
  | { name: "help" };

function App() {
  const [page, setPage] = useState<Page>({ name: "home" });

  useEffect(() => {
    initializeApp();
  }, []);

  if (page.name === "new") return <NewProjectPage setPage={setPage} />;
  if (page.name === "projects") return <ProjectsPage setPage={setPage} />;
  if (page.name === "editor")
    return <EditorPage id={page.id} setPage={setPage} />;
  if (page.name === "connect") {
    return <ConnectPage setPage={setPage} backTo={page.backTo} />;
  }
  if (page.name === "help") return <HelpPage setPage={setPage} />;

  return <HomePage setPage={setPage} />;
}

export default App;
