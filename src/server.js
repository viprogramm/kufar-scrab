import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { productsDB } from "./common/products-db.js";
import { scrub } from "./scrub.js";
import { runBot } from "./bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${day}/${
    month > 9 ? month : "0" + month
  }/${year} ${hours}:${minutes}:${seconds}`;
}

const server = http.createServer((req, res) => {
  console.log("@req.url", req.url);
  if (req.url === "/log.txt") {
    const filePath = path.join(__dirname, "log.txt");

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.setHeader("Content-Type", "text/plain");
      res.statusCode = 200;
      res.end(data);
    });
  } else {
    // Sort items by 'created' field in descending order and pick the first 20
    productsDB
      .find({})
      .sort({ created: -1 })
      .limit(20)
      .exec((err, products) => {
        const html = generateHTMLTable(products);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
  }
});

function generateHTMLTable(products = []) {
  let html = `<table cellspacing="12" cellpadding="12"><tr><th>Image</th><th>Title</th><th>Price</th><th>Date</th></tr>`;
  products.forEach((product) => {
    html += `<tr>
    <td><a href="${product.url}" target="_blank"><img src="${
      product.imgUrl
    }" alt="${product.title}" width="100" /></a></td>
      <td><a href="${product.url}" target="_blank">${product.title}</a></td>
      <td>${product.price}</td>
      <td>${formatDate(product.created)}</td> 
    </tr>`;
  });
  html += `</table>`;
  return html;
}

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

//Run bot for registration
runBot();

const MINUTES = 3;

// Run scrub
scrub();
setInterval(() => {
  scrub();
}, MINUTES * 60 * 1000);
