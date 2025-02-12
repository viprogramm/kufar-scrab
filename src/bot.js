import { Bot } from "grammy";

import { usersDB } from "./common/users-db.js";
import { TOKEN } from "./common/global-envs.js";

// Ensure that the 'id' field is unique in the database
usersDB.ensureIndex({ fieldName: "id", unique: true }, function (err) {
  if (err) console.log("Error creating index", err);
});

export const runBot = () => {
  console.log("BOT_RUNNED");
  const bot = new Bot(TOKEN);

  bot.command("start", (ctx) => {
    ctx.reply("Greetings traveler. Take a moment to rest at this bonfire! 🔥");

    if (ctx.from) {
      let user = {
        id: ctx.from.id,
        username: ctx.from.username || "Unknown",
      };

      // Insert User into database
      usersDB.insert(user, (err, newDoc) => {
        // If error is not about unique constraint, log error
        if (err && err.errorType !== "uniqueViolated") {
          console.log("Error when inserting user into database", err);
        } else if (newDoc) {
          console.log("Saved new user:", newDoc);
        }
      });
    }
  });

  bot.start();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runBot();
}
