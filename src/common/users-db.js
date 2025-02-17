import Datastore from "@yetzt/nedb";
import path from "path";
import { fileURLToPath } from "url";

import { DATA_FOLDER } from "../common/global-envs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, `../${DATA_FOLDER}/users.db`);

export const usersDB = new Datastore({ filename: dbPath, autoload: true });
