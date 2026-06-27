import { useState } from "react";
import HomePage from "./spa/HomePage";
import NewProjectPage from "./spa/NewProjectPage";
import ProjectsPage from "./spa/ProjectsPage";
import EditorPage from "./spa/EditorPage";
import ConnectPage from "./spa/ConnectPage";
import HelpPage from "./spa/HelpPage";

export type Page =
  | { name: "home" }
  | { name: "new" }
  | { name: "projects" }
  | { name: "editor"; id: string }
  | { name: "connect"; backTo?: Page }
  | { name: "help" };

function App() {
  const [page, setPage] = useState<Page>({ name: "home" });

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
