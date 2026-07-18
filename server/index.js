const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const BOARD_FQBN = {
  uno: "arduino:avr:uno",
  nano: "arduino:avr:nano",
};

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/compile", async (req, res) => {
  const { board, code } = req.body;

  if (!BOARD_FQBN[board]) {
    res.status(400).json({ error: "Unsupported board" });
    return;
  }

  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  const id = crypto.randomUUID();
  const sketchName = "NewBeginMakesSketch";
  const root = path.join(__dirname, "tmp", id);
  const sketchDir = path.join(root, sketchName);
  const buildPath = path.join(root, "build");
  const inoPath = path.join(sketchDir, `${sketchName}.ino`);

  try {
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.mkdir(buildPath, { recursive: true });
    await fs.writeFile(inoPath, code, "utf8");

    await run(
      "C:\\arduino-cli\\arduino-cli.exe",
      [
        "compile",
        "--fqbn",
        BOARD_FQBN[board],
        "--build-path",
        buildPath,
        sketchDir,
      ],
      root,
    );

    const files = await fs.readdir(buildPath);
    const hexFile = files.find((file) => file.endsWith(".hex"));

    if (!hexFile) {
      res.status(500).json({ error: "HEX file was not generated" });
      return;
    }

    const hex = await fs.readFile(path.join(buildPath, hexFile), "utf8");

    res.json({
      ok: true,
      board,
      fqbn: BOARD_FQBN[board],
      hex,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e.message || e),
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

app.listen(8787, "0.0.0.0", () => {
  console.log("NewBegin Makes compile server running on http://0.0.0.0:8787");
});
