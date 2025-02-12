import Datastore from "nedb";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../db/products.db");

export const productsDB = new Datastore({ filename: dbPath, autoload: true });
