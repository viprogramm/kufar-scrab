import Datastore from "@yetzt/nedb";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../db/users.db");

export const usersDB = new Datastore({ filename: dbPath, autoload: true });
