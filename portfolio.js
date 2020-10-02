const yargs = require("yargs");
const moment = require("moment");
const yahooFinance = require("yahoo-finance");
const numeral = require("numeral");
const fs = require("fs");
global.fetch = require("node-fetch");

const date = moment().format("MM/DD/YYYY hh:mm");

const argv = yargs
  .options({
    p: {
      demand: false,
      alias: "portfolio",
      describe: "name of .json portfolio to fetch data for",
      string: true,
      default: "portfolio.json",
    },
    s: {
      demand: false,
      alias: "sort",
      describe: "sort portfolio by stock, quantity and purchasePrice",
      string: true,
      default: "stock",
    },
    sd: {
      demand: false,
      alias: "sortDirection",
      describe: "sort direction asc or desc",
      string: true,
      default: "asc",
    },
  })
  .help()
  .alias("help", "h").argv;

const file = argv.portfolio;
const sort = argv.sort;
const sortDirection = argv.sortDirection;
const lastfile = argv.stocks
  ? "last-" + argv.stocks.split(".", 1) + ".json"
  : "last-portfolio.json";
const portfolios = "portfolios/";
const portfolio = require("./" + portfolios + file);
const lastPortfolio = require("./" + portfolios + lastfile);

const orderBy = require("lodash.orderby");
const colLengths = [6, 8, 10, 9, 7, 9, 11, 11, 11];
const width = colLengths.reduce((sum, x) => sum + x);
const calculatedValues = [];

let stocks = [];
let mappedStocks = [];

let divider = () => {
  console.log("-".repeat(width));
};

const ansi = {
  green: "\x1B[32m",
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  none: "\x1B[0m",
};
const blankColumn = {
  value: "",
  color: "none",
};

let colorize = (color, str) => {
  if (color) {
    return ansi[color] + str + ansi.none;
  } else {
    return str;
  }
};

if (portfolio.hasOwnProperty("stocks")) {
  for (let stock in portfolio.stocks) {
    let arrayOfStock = portfolio.stocks[stock];
    arrayOfStock.test = 0;
    const reducedStock = arrayOfStock.reduce((a, b) => ({
      quantity: a.quantity + b.quantity,
      "purchase-price": a["purchase-price"] + b["purchase-price"] * b.quantity,
      test: a.test + b.quantity,
    }));
    /// ****
    mappedStocks.push({
      stock: stock,
      purchasePrice: reducedStock["purchase-price"],
      quantity: parseFloat(reducedStock.quantity),
    });
  }
  const sortedStocks = orderBy(mappedStocks, [sort], [sortDirection]);
  stocks = sortedStocks.map((a) => a.stock);
}

let getStocks = yahooFinance.quote(
  {
    symbols: stocks,
    modules: ["price", "summaryDetail"],
  },
  function (err, quotes) {
    return quotes;
  }
);

let getColor = (price, lastPrice) => {
  price = parseFloat(price);
  lastPrice = parseFloat(lastPrice);
  switch (true) {
    case lastPrice == null:
      color = "none";
      break;
    case price < lastPrice:
      color = "red";
      break;
    case price > lastPrice:
      color = "green";
      break;
    case lastPrice == price:
      color = "yellow";
      break;
    default:
      color = "none";
  }

  return color;
};

let columize = (
  col1 = blankColumn,
  col2 = blankColumn,
  col3 = blankColumn,
  col4 = blankColumn,
  col5 = blankColumn,
  col6 = blankColumn,
  col7 = blankColumn,
  col8 = blankColumn,
  col9 = blankColumn
) => {
  const row =
    colorize(col1.color, col1.value.padEnd(colLengths[0])) +
    colorize(col2.color, col2.value.padStart(colLengths[1])) +
    colorize(col3.color, col3.value.padStart(colLengths[2])) +
    colorize(col4.color, col4.value.padStart(colLengths[3])) +
    colorize(col5.color, col5.value.padStart(colLengths[4])) +
    colorize(col6.color, col6.value.padStart(colLengths[5])) +
    colorize(col7.color, col7.value.padStart(colLengths[6])) +
    colorize(col8.color, col8.value.padStart(colLengths[7])) +
    colorize(col9.color, col9.value.padStart(colLengths[8]));
  console.log(row);
};

let render = (calculatedValues, totals) => {
  console.log();
  divider();
  console.log(`${"Date:".padEnd(23)} ${date}`);
  divider();
  columize(
    { value: "Ticker" },
    { value: "#" },
    { value: "Pur $" },
    { value: "Cur $" },
    { value: "%" },
    { value: "Day +/-" },
    { value: "Cur +/-" },
    { value: "Day $ +/-" },
    { value: "Total +/-" }
  );
  divider();
  for (let row of calculatedValues) {
    columize(
      row.col1,
      row.col2,
      row.col3,
      row.col4,
      row.col5,
      row.col6,
      row.col7,
      row.col8,
      row.col9
    );
  }
  divider();
  columize(
    totals[0],
    totals[1],
    totals[2],
    totals[3],
    totals[4],
    totals[5],
    totals[6],
    totals[7],
    totals[8]
  );
  divider();
  console.log();
};

let log = (stockData) => {
  let stocks = {};
  let stocksTotal = 0;
  let daysGainLossTotal = 0;
  let totalPurchasePrice = 0;
  for (let stock in stockData) {
    //console.log("stock", stock, stockData[stock]);
    let price = numeral(stockData[stock].price.regularMarketPrice).format(
      "1,000.00"
    );
    let lastPrice =
      lastPortfolio.stocks &&
      lastPortfolio.stocks[stock] &&
      lastPortfolio.stocks[stock].lastPrice
        ? lastPortfolio.stocks[stock].lastPrice
        : null;
    let yesterdaysPrice = stockData[stock].price.regularMarketPreviousClose
      ? stockData[stock].price.regularMarketPreviousClose
      : null;
    let todaysPriceGainLoss =
      stockData[stock].price.regularMarketPrice &&
      stockData[stock].price.regularMarketOpen
        ? numeral(
            stockData[stock].price.regularMarketPrice -
              stockData[stock].price.regularMarketOpen
          ).format("1,000.00")
        : null;
    console.log(
      stock,
      lastPrice,
      todaysPriceGainLoss,
      yesterdaysPrice,
      stockData[stock].price.regularMarketPrice,
      stockData[stock].price.regularMarketOpen,
      todaysPriceGainLoss
    );

    for (let [index, purchasedStocks] of portfolio.stocks[stock].entries()) {
      let purchasePrice =
        portfolio.stocks &&
        portfolio.stocks[stock] &&
        portfolio.stocks[stock][index]["purchase-price"]
          ? portfolio.stocks[stock][index]["purchase-price"]
          : 0;
      let quantity =
        portfolio.stocks &&
        portfolio.stocks[stock] &&
        portfolio.stocks[stock][index]["quantity"]
          ? portfolio.stocks[stock][index]["quantity"]
          : 0;
      totalPurchasePrice += purchasePrice * quantity;
      let gainLoss = numeral(
        parseFloat(price.replace(/[^\d\.]/g, "")) * quantity -
          purchasePrice * quantity
      ).format("1,000.00");
      let lastGainLoss = numeral(
        parseFloat(price.replace(/[^\d\.]/g, "")) * quantity -
          lastPrice * quantity
      ).format("1,000.00");
      let yesterdayGainLoss = numeral(
        parseFloat(price.replace(/[^\d\.]/g, "")) * quantity -
          yesterdaysPrice * quantity
      ).format("1,000.00");
      stocks[stock] = {
        lastPrice: parseFloat(price.replace(/[^\d\.]/g, "")),
      };

      let lastColor = getColor(price.replace(/[^\d\.]/g, ""), lastPrice);
      let purchaseColor = getColor(
        price.replace(/[^\d\.]/g, ""),
        purchasePrice
      );
      let yesterdayGainLossColor = getColor(
        price.replace(/[^\d\.]/g, ""),
        yesterdaysPrice
      );
      let percentChange = ((price - purchasePrice) / purchasePrice) * 100;

      let vals = {
        col1: {
          value: stock,
          color: purchaseColor,
        },
        col2: {
          value: numeral(quantity.toString()).format("1,000.00"),
        },
        col3: {
          value: numeral(purchasePrice.toString()).format("1,000.00"),
        },
        col4: {
          value: price,
          color: lastColor,
        },
        col5: {
          value: numeral(percentChange.toString()).format("0.0"),
          color: purchaseColor,
        },
        col6: {
          value: price,
          color: lastColor,
        },
        col6: {
          value: yesterdayGainLoss,
          color: yesterdayGainLossColor,
        },
        col7: {
          value: lastGainLoss,
          color: lastColor,
        },
        col8: {
          value: todaysPriceGainLoss,
          color: yesterdayGainLossColor,
        },
        col9: {
          value: gainLoss,
          color: purchaseColor,
        },
      };
      calculatedValues.push(vals);
      if (portfolio.stocks[stock][index]["quantity"]) {
        stocksTotal +=
          portfolio.stocks[stock][index]["quantity"] *
          price.replace(/[^\d\.]/g, "");
        daysGainLossTotal += parseFloat(yesterdayGainLoss);
      }
    }
  }

  lastData = {
    stocks,
    stocksTotal: stocksTotal,
    grandTotal: parseFloat(numeral(stocksTotal).format("1000.00")),
  };
  let jsonData = JSON.stringify(lastData, null, 2);
  fs.writeFileSync(portfolios + lastfile, jsonData);

  const lastStocksTotal = lastPortfolio.stocksTotal;

  let stocksColor = getColor(stocksTotal, lastStocksTotal);
  let gainColor = getColor(stocksTotal, totalPurchasePrice);
  const totalGain = numeral(stocksTotal - totalPurchasePrice).format(
    "1,000.00"
  );
  let lastDiff = numeral(stocksTotal - lastStocksTotal).format("1.00");
  stocksTotal = numeral(stocksTotal).format("1,000.00");

  let totals = [
    { value: "Total" },
    { value: "" },
    { value: "" },
    { value: "" },
    { value: "" },
    {
      value: numeral(daysGainLossTotal).format("1,000.00"),
      color: getColor(daysGainLossTotal, 0),
    },
    { value: lastDiff, color: stocksColor },
    { value: "" },
    { value: totalGain, color: gainColor },
  ];

  render(calculatedValues, totals);
};

Promise.all([getStocks])
  .then(function ([stockData]) {
    log(stockData);
  })
  .catch(function (err) {
    console.error("Promise.all error", err);
  });
