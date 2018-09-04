const yargs = require('yargs');
const moment = require('moment');
const yahooFinance = require('yahoo-finance');
const numeral = require('numeral');
const columnify = require('columnify')
const fs = require('fs');
global.fetch = require('node-fetch');

const date = moment().format('MM/DD/YYYY hh:mm');
const width = 31;

const argv = yargs
  .options({
    p: {
      demand: false,
      alias: 'portfolio',
      describe: 'name of .json portfolio to fetch data for',
      string: true,
      default: 'portfolio.json'
    },
    s: {
      demand: false,
      alias: 'sort',
      describe: 'sort portfolio by stock, quantity and purchasePrice',
      string: true,
      default: 'stock'
    },
    sd: {
      demand: false,
      alias: 'sortDirection',
      describe: 'sort direction asc or desc',
      string: true,
      default: 'asc'
    },
  })
  .help()
  .alias('help', 'h')
  .argv;

const file = argv.portfolio;
const sort = argv.sort;
const sortDirection = argv.sortDirection;
const lastfile = argv.stocks ? 'last-' + argv.stocks.split('.', 1) + '.json' : 'last-portfolio.json';
const portfolios = 'portfolios/';
const portfolio = require('./' + portfolios + file);
const lastPortfolio = require('./' + portfolios + lastfile);

const orderBy = require('lodash.orderby');

let stocks = [];
let mappedStocks = [];

let divider = () => {
  console.log('-'.repeat(width));
}

const ansi = {
  green: '\x1B[32m',
  red: '\x1B[31m',
  yellow: '\x1B[33m',
  none: '\x1B[0m'
};

let colorize = (color, str) => {
  return ansi[color] + str + ansi.none;
}

if (portfolio.hasOwnProperty('stocks')) {
  for(let stock in portfolio.stocks) {
    mappedStocks.push({
      stock: stock,
      purchasePrice: portfolio.stocks[stock]['purchase-price'],
      quantity: portfolio.stocks[stock]['quantity'],
    });
  }
  const test = orderBy(mappedStocks, [sort], [sortDirection]);
  stocks = test.map(a => a.stock);
}

let getStocks = yahooFinance.quote({
  symbols: stocks,
  modules: [ 'price', 'summaryDetail' ] // see the docs for the full list
}, function (err, quotes) {
  return quotes;
});

let getColor = (price, lastPrice) => {
  price = parseFloat(price);
  lastPrice = parseFloat(lastPrice);
  switch(true) {
    case (lastPrice == null):
      color = 'none';
      break;
    case (price < lastPrice):
      color = 'red';
      break;
    case (price > lastPrice):
      color = 'green';
      break;
    case lastPrice == price:
      color = 'yellow';
      break;
    default:
      color= 'none';
  }

  return color;
}

let log = (stockData) => {
  console.log();
  divider();
  console.log(`${'Date:'.padEnd(14)} ${date}`);
  divider();
  let stocks = {};
  let stocksTotal = 0;
  let totalPurchasePrice = 0;
  for(let stock in stockData) {
    let padding = width - (stock.length + stockData[stock].price.regularMarketPrice.length);
    let price = numeral(stockData[stock].price.regularMarketPrice).format('1,000.00');
    let leftPad =  10 - stock.length;
    let lastPrice = (lastPortfolio.stocks && lastPortfolio.stocks[stock] && lastPortfolio.stocks[stock].lastPrice) ? lastPortfolio.stocks[stock].lastPrice : null;
    let purchasePrice = (portfolio.stocks && portfolio.stocks[stock] && portfolio.stocks[stock]['purchase-price']) ? portfolio.stocks[stock]['purchase-price'] : 0;
    let quantity = (portfolio.stocks && portfolio.stocks[stock] && portfolio.stocks[stock]['quantity']) ? portfolio.stocks[stock]['quantity'] : 0;
    totalPurchasePrice += purchasePrice * quantity;
    gainLoss = numeral((price * quantity) - (purchasePrice * quantity)).format('1,000.00');

    stocks[stock] = {
      "lastPrice": parseFloat(price.replace(/[^\d\.]/g,''))
    };

    let lastColor = getColor(price.replace(/[^\d\.]/g,''), lastPrice);
    let purchaseColor = getColor(price.replace(/[^\d\.]/g,''), purchasePrice);

    console.log(`${colorize(purchaseColor, stock.padEnd(5))} ${quantity.toString().padStart(6)} ${colorize(lastColor, price.padStart(7))} ${colorize(purchaseColor, gainLoss.padStart(10))}`);
    if (portfolio.stocks[stock]['quantity']) {
      stocksTotal += portfolio.stocks[stock]['quantity'] * price.replace(/[^\d\.]/g,'');
    }
  }

  lastData = {
    stocks,
    'stocksTotal': stocksTotal,
    'grandTotal': parseFloat(numeral(stocksTotal).format('1000.00'))
  };
  let jsonData = JSON.stringify(lastData, null, 2);
  fs.writeFileSync(portfolios + lastfile, jsonData);

  const lastStocksTotal = lastPortfolio.stocksTotal;

  let stocksColor = getColor(stocksTotal, lastStocksTotal);
  let gainColor = getColor(stocksTotal, totalPurchasePrice);
  const totalGain = parseFloat(numeral(stocksTotal - totalPurchasePrice).format('1000.00')) + '';

  stocksTotal = numeral(stocksTotal).format('1,000.00');

  divider();
  console.log(`+/-            ${colorize(gainColor, totalGain.padStart(16))}`);
  //console.log(`Total:         ${colorize(stocksColor, stocksTotal.padStart(10))}`);
  divider();
  console.log();
}

Promise.all([getStocks])
.then(function([stockData]){
  log(stockData);
})
.catch(function(err){
  console.error('Promise.all error', err);
});
