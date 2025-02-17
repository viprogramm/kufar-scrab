import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { DATA_FOLDER } from "../common/global-envs.js";

const logPath = `../${DATA_FOLDER}/log.txt`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appendLog = (message, maxLines) => {
  const fullLogPath = path.resolve(__dirname, logPath);
  const existingLines = fs.existsSync(fullLogPath)
    ? fs.readFileSync(fullLogPath, "utf-8").split("\n")
    : [];

  existingLines.unshift(message); // Add the new message to the start of the array

  if (existingLines.length > maxLines) {
    existingLines.length = maxLines; // Cut the array down to size
  }

  fs.writeFileSync(fullLogPath, existingLines.join("\n"));
};

export const log = (message) => {
  const logPath = path.resolve(__dirname, logPath);

  fs.writeFileSync(logPath, `${message}\n`, {
    flag: "w",
  });
};
