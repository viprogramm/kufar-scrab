#!/usr/bin/env node

import puppeteer from "puppeteer";
import { Bot } from "grammy";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { productsDB } from "./common/products-db.js";
import { usersDB } from "./common/users-db.js";
import { TOKEN } from "./common/global-envs.js";
import { appendLog } from "./helpers/logs.js";

const SEARCH_LIST = [
  {
    search: "nintendo",
    additionalSearch: ["ds"],
  },
  {
    search: "wii u",
  },
  {
    search: "крушитель",
  },
  {
    search: "saeco",
    additionalSearch: ["veneto", "combi"],
  },
];

export const scrub = async (init = false) => {
  console.log("START_SCRUB");

  const date = new Date();
  const start_time = date.getTime();
  const formattedDate = date.toLocaleString();

  productsDB.ensureIndex({ fieldName: "url", unique: true }, (err) => {
    if (err) console.log("Error when creating index", err);
  });

  const bot = new Bot(TOKEN);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  // await page.setViewport({
  //   width: 1366,
  //   height: 768,
  // });

  for (const searchItem of SEARCH_LIST) {
    try {
      await page.goto("https://www.kufar.by/l", { timeout: 60000 });
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
    await page.screenshot({ path: "homepage.png" });
    try {
      await page.waitForSelector('div[data-name="listings"] section > a');
      let oldContent = await page.evaluate(
        () =>
          document.querySelector('div[data-name="listings"] section > a')
            .textContent
      );

      // Find the search form, input 'nintendo', and submit
      await page.type('[data-testid="searchbar-input"]', searchItem.search);
      await page.waitForFunction(
        "document.querySelector('[data-testid=\"searchbar-search-button\"]').disabled === false"
      );

      await page.click('[data-testid="searchbar-search-button"]');

      await page.waitForFunction(
        (selector, oldContent) =>
          document.querySelector(selector).textContent !== oldContent,
        {},
        'div[data-name="listings"] section > a',
        oldContent
      );
    } catch (error) {
      console.log("Error when search products", error);
    }

    // Take screenshot after redirecting to search results
    await page.screenshot({ path: "search_results.png" });

    // Check for attention button and click it if exists
    // try {
    //   const attentionButton = await page.$(
    //     'div[class^="styles_attentionContainer_"] button'
    //   );
    //   if (attentionButton) {
    //     await attentionButton.click();
    //   }
    // } catch (error) {
    //   console.log("Error when selecting or clicking attention button", error);
    // }

    let productDetails = [];
    try {
      productDetails = await page.evaluate(() => {
        const productElements = Array.from(
          document.querySelectorAll('div[data-name="listings"] section > a')
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
      console.log(
        "Error when evaluating product details",
        JSON.stringify(searchItem),
        error
      );
      await browser.close();
      return;
    }

    try {
      productDetails.forEach((product) => {
        const containSearchItems = searchItem.additionalSearch
          ? searchItem.additionalSearch.some((item) =>
              product.title.toLowerCase().includes(item)
            )
          : true;

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
              console.log("Saved new product:", searchItem.search, newDoc);

              if (!init) {
                // Fetch all users from usersDB
                usersDB.find({}, async (err, users) => {
                  if (err) {
                    console.log("Error fetching users", err);
                  } else {
                    // Send a message to each user about the new product
                    for (const user of users) {
                      await bot.api.sendMessage(
                        user.id,
                        `New Product Alert! \n${newDoc.title} \n${newDoc.price} \n${newDoc.url}`
                      );
                    }
                  }
                });
              }
            }
          });
        }
      });
    } catch (error) {
      console.log("Error when inserting product details to db", error);
    }

    const cookies = await page.cookies();
    for (let cookie of cookies) {
      await page.deleteCookie(cookie);
    }
  }

  await browser.close();
  const end_time = new Date().getTime();
  const execution_time = (end_time - start_time) / 1000;
  console.log("Scraping Finished =)", execution_time + " seconds");

  appendLog(
    `Script ran at: ${formattedDate} (execution time ${execution_time} seconds)`,
    10
  );
};

const argv = yargs(hideBin(process.argv)).argv;

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(argv.init, typeof argv.init);
  scrub(argv.init);
}
