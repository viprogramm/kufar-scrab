// import puppeteer from "puppeteer";

const puppeteer = require("puppeteer-core");
const chromium = require("chrome-aws-lambda");

import { Bot } from "grammy";

import { productsDB } from "./common/products-db.js";
import { usersDB } from "./common/users-db.js";
import { TOKEN } from "./common/global-envs.js";
import { appendLog } from "./helpers/logs.js";

export const scrub = async () => {
  console.log("START_SCRUB");

  const date = new Date();
  const formattedDate = date.toLocaleString();

  appendLog(`Script ran at: ${formattedDate}`, 10);

  productsDB.ensureIndex({ fieldName: "url", unique: true }, (err) => {
    if (err) console.log("Error when creating index", err);
  });

  const bot = new Bot(TOKEN);

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    headless: chromium.headless,
  });

  // const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto("https://kufar.by");
  } catch (error) {
    console.log("Page navigation failed", error);
    await browser.close();
    return;
  }

  // Check for politics button and click it if exists
  try {
    const politicsButton = await page.$(
      'div[class^="Politics_styles_buttons__"] button'
    );
    if (politicsButton) {
      await politicsButton.click();
    }
  } catch (error) {
    console.log("Error when selecting or clicking politics button", error);
  }

  // Take screenshot after loading main page
  // await page.screenshot({ path: "homepage.png" });

  try {
    let oldContent = await page.evaluate(
      () =>
        document.querySelector('div[data-name="listings"] section a')
          .textContent
    );

    // Find the search form, input 'nintendo', and submit
    await page.type('[data-testid="searchbar-input"]', "nintendo");
    await page.waitForFunction(
      "document.querySelector('[data-testid=\"searchbar-search-button\"]').disabled === false"
    );

    await page.click('[data-testid="searchbar-search-button"]');

    await page.waitForFunction(
      (selector, oldContent) =>
        document.querySelector(selector).textContent !== oldContent,
      {},
      'div[data-name="listings"] section a',
      oldContent
    );
  } catch (error) {
    console.log("Error when search products", error);
  }

  // Take screenshot after redirecting to search results
  // await page.screenshot({ path: "search_results.png" });

  let productDetails;
  try {
    productDetails = await page.evaluate(() => {
      const productElements = Array.from(
        document.querySelectorAll('div[data-name="listings"] section a')
      );
      return productElements.map((productElem) => {
        const url = productElem.getAttribute("href");
        const titleElem = productElem.querySelector("h3");
        const imgElem = productElem.querySelector("img");
        const price = productElem.querySelector(
          'p[class^="styles_price__"]'
        ).textContent;

        const title = titleElem ? titleElem.textContent : null;
        const imgUrl = imgElem ? imgElem.src : null;

        return { url, title, imgUrl, price, created: Date.now() };
      });
    });
  } catch (error) {
    console.log("Error when evaluating product details", error);
    await browser.close();
    return;
  }

  try {
    productDetails.forEach((product) => {
      const containSearchItems = ["ds"].some((item) =>
        product.title.toLowerCase().includes(item)
      );

      if (containSearchItems) {
        let url = new URL(product.url);
        url.searchParams.delete("r_block");
        url.searchParams.delete("rank");
        url.searchParams.delete("searchId");
        product.url = url.href;

        productsDB.insert(product, async (err, newDoc) => {
          if (err && err.errorType !== "uniqueViolated") {
            console.log("Error when inserting product into database", err);
          } else if (newDoc) {
            console.log("Saved new product:", newDoc);

            // Fetch all users from usersDB
            usersDB.find({}, async (err, users) => {
              if (err) {
                console.log("Error fetching users", err);
              } else {
                // Send a message to each user about the new product
                for (const user of users) {
                  await bot.api.sendMessage(
                    user.id,
                    `New Product Alert! \n${newDoc.url}`
                  );
                }
              }
            });
          }
        });
      }
    });
  } catch (error) {
    console.log("Error when inserting product details to db", error);
  }

  await browser.close();
  console.log("Scraping Finished =)");
};

if (import.meta.url === `file://${process.argv[1]}`) {
  scrub();
}
