const yargs = require('yargs');
const moment = require('moment');
const yahooFinance = require('yahoo-finance');
const numeral = require('numeral');
const columnify = require('columnify')
const fs = require('fs');
global.fetch = require('node-fetch');

const date = moment().format('MM/DD/YYYY hh:mm');
const width = 25;

const argv = yargs
  .options({
    s: {
      demand: false,
      alias: 'stocks',
      describe: 'name of .json stock list to fetch data for',
      string: true
    }
  })
  .help()
  .alias('help', 'h')
  .argv;

const file = argv.stocks ? argv.stocks : 'portfolio.json';
const lastfile = argv.stocks ? 'last-' + argv.stocks.split('.', 1) + '.json' : 'last-portfolio.json';
const portfolios = 'portfolios/';
const portfolio = require('./' + portfolios + file);
const lastPortfolio = require('./' + portfolios + lastfile);

//import orderBy from 'lodash-es/orderBy';

let stocks = [];

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
    stocks.push(stock);
  }
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
  console.log(`${'Date:'.padEnd(8)} ${date}`);
  divider();
  let stocks = {};
  let stocksTotal = 0;
  for(let stock in stockData) {
    let padding = width - (stock.length + stockData[stock].price.regularMarketPrice.length);
    let price = numeral(stockData[stock].price.regularMarketPrice).format('1,000.00');
    let leftPad =  10 - stock.length;
    let lastPrice = (lastPortfolio.stocks && lastPortfolio.stocks[stock] && lastPortfolio.stocks[stock].lastPrice) ? lastPortfolio.stocks[stock].lastPrice : null;
    let purchasePrice = (portfolio.stocks && portfolio.stocks[stock] && portfolio.stocks[stock]['purchase-price']) ? portfolio.stocks[stock]['purchase-price'] : null;

    stocks[stock] = {
      "lastPrice": parseFloat(price.replace(/[^\d\.]/g,''))
    };

    let lastColor = getColor(price.replace(/[^\d\.]/g,''), lastPrice);
    let purchaseColor = getColor(price.replace(/[^\d\.]/g,''), purchasePrice);

    price += '';
    console.log(`${colorize(purchaseColor, stock.padEnd(10))} | ${colorize(lastColor, price.padStart(12))}`);
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
  let stocksColor = getColor(lastStocksTotal, stocksTotal);
  stocksTotal = numeral(stocksTotal).format('1,000.00');

  divider();
  console.log(`Total:     |   ${colorize(stocksColor, stocksTotal.padStart(10))}`);
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
