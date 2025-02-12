import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dotenvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: dotenvPath });

export const TOKEN = process.env.TOKEN;
