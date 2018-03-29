const moment = require('moment');
const yahooFinance = require('yahoo-finance');
const numeral = require('numeral');
const cc = require('cryptocompare');
const columnify = require('columnify')
const fs = require('fs');
global.fetch = require('node-fetch');

const portfolio = require("./portfolio.json");
const lastPortfolio = require("./last-portfolio.json");
const date = moment().format('MM/DD/YYYY hh:mm');
const width = 25;

let stocks = [];
let cryptos = [];

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

if (portfolio.hasOwnProperty('cryptos')) {
  for(let crypto in portfolio.cryptos) {
    cryptos.push(crypto);
  }
}

let getStocks = yahooFinance.quote({
  symbols: stocks,
  modules: [ 'price', 'summaryDetail' ] // see the docs for the full list
}, function (err, quotes) {
  //console.log(quotes);
  return quotes;
});

let getCryptos = cc.priceMulti(cryptos, ['USD'])
  .then(prices => {
    return prices;
})
.catch(console.error);

let getColor = (lastPrice, price) => {
  switch(true) {
    case (lastPrice
      == null):
      color = 'none';
      break;
    case (lastPrice > price):
      color = 'red';
      break;
    case lastPrice < price:
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

let log = (stockData, cryptoData) => {
  console.log();
  divider();
  console.log(`${'Date:'.padEnd(8)} ${date}`);
  divider();
  let stocks = {};
  let cryptos = {};
  let stocksTotal = 0;
  console.log('-STOCKS-');
  for(let stock in stockData) {
    let padding = width - (stock.length + stockData[stock].price.regularMarketPrice.length);
    let price = numeral(stockData[stock].price.regularMarketPrice).format('1,000.00');
    let leftPad =  10 - stock.length;
    let lastPrice = (lastPortfolio.stocks[stock] && lastPortfolio.stocks[stock].lastPrice) ? lastPortfolio.stocks[stock].lastPrice : null;

    stocks[stock] = {
      "lastPrice": parseFloat(price.replace(/[^\d\.]/g,''))
    };

    let color = getColor(lastPrice, price.replace(/[^\d\.]/g,''));
    price += '';
    console.log(`${stock.padEnd(10)} | ${colorize(color, price.padStart(12))}`);
    stocksTotal += portfolio.stocks[stock]['quantity'] * price.replace(/[^\d\.]/g,'');
  }

  let cryptosTotal = 0;
  divider();
  console.log('-CRYPTOS-');
  for (const [crypto, value] of Object.entries(cryptoData)) {
    let price = value['USD'];
    let lastPrice = (lastPortfolio.cryptos[crypto] && lastPortfolio.cryptos[crypto].lastPrice) ? lastPortfolio.cryptos[crypto].lastPrice : null;
    let color = getColor(lastPrice, price);
    let val = numeral(value['USD']).format('1,000.0000');
    console.log(`${crypto.padEnd(10)} | ${colorize(color, val.padStart(12))}`);
    cryptosTotal += value['USD'] * portfolio.cryptos[crypto]['quantity'];
    cryptos[crypto] = {
      'lastPrice': value['USD']
    };
  }

  lastData = {
    stocks,
    cryptos,
    'stocksTotal': stocksTotal,
    'cryptosTotal': cryptosTotal,
    'grandTotal': parseFloat(numeral(stocksTotal + cryptosTotal).format('1000.00'))
  };
  let jsonData = JSON.stringify(lastData, null, 2);
  fs.writeFileSync('last-portfolio.json', jsonData);

  const lastGrandTotal = lastPortfolio.grandTotal;
  const lastStocksTotal = lastPortfolio.stocksTotal;
  const lastCryptosTotal = lastPortfolio.cryptosTotal;
  let grandColor = getColor(lastGrandTotal, stocksTotal + cryptosTotal);
  let stocksColor = getColor(lastStocksTotal, stocksTotal);
  let cryptosColor = getColor(lastCryptosTotal, cryptosTotal);
  const grandTotal = numeral(stocksTotal + cryptosTotal).format('1,000.00');

  cryptosTotal = numeral(cryptosTotal).format('1,000.00');
  stocksTotal = numeral(stocksTotal).format('1,000.00');
  divider();
  console.log(`Stocks Total: $${colorize(stocksColor, stocksTotal.padStart(10))}`);
  console.log(`Crypto Total: $${colorize(cryptosColor, cryptosTotal.padStart(10))}`);
  divider();
  console.log(`Grand Total:  $${colorize(grandColor, grandTotal.padStart(10))}`);
  divider();
  console.log();
}

Promise.all([getStocks, getCryptos])
.then(function([stockData, cryptoData]){
  log(stockData, cryptoData);
})
.catch(function(err){
  console.error('Promise.all error', err);
});
