const moment = require('moment');
const googleStocks = require('google-stocks');
const numeral = require('numeral');
const cc = require('cryptocompare');
const columnify = require('columnify')
global.fetch = require('node-fetch');

const portfolio = require("./portfolio.json");
const date = moment().format('MM/DD/YYYY hh:mm');
const width = 25;

let stocks = [];
let cryptos = [];

let divider = () => {
  console.log('-'.repeat(width));
}

divider();
console.log(date);

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

let getStocks = googleStocks(stocks)
  .then(function(data) {
    return data;
  })
  .catch(function(error) {
    /* error logic */
  });

let getCryptos = cc.priceMulti(cryptos, ['USD'])
  .then(prices => {
    return prices;
})
.catch(console.error);

let log = (stockData, cryptoData) => {
  divider();
  let stocksTotal = 0;
  console.log('-STOCKS-');
  for(let stock in stockData) {
    let symbol = stockData[stock].symbol;
    let padding = width - (symbol.length + stockData[stock].l.length);
    let leftPad =  10 - symbol.length;
    console.log(`${symbol.padEnd(10)} | ${stockData[stock].l.padStart(12)}`);
    stocksTotal += portfolio.stocks[symbol]['quantity'] * stockData[stock].l.replace(/[^\d\.]/g,'');
  }

  let cryptosTotal = 0;
  divider();
  console.log('-CRYPTOS-');
  for (const [crypto, value] of Object.entries(cryptoData)) {
    const val = numeral(value['USD']).format('1,000.0000');
    console.log(`${crypto.padEnd(10)} | ${val.padStart(12)}`);
    cryptosTotal += value['USD'] * portfolio.cryptos[crypto]['quantity'];
  }

  const grandTotal = numeral(stocksTotal + cryptosTotal).format('1,000');
  cryptosTotal = numeral(cryptosTotal).format('1,000');
  stocksTotal = numeral(stocksTotal).format('1,000');
  divider();
  console.log(`Stocks Total: $${stocksTotal.padStart(10)}`);
  console.log(`Crypto Total: $${cryptosTotal.padStart(10)}`);
  divider();
  console.log(`Grand Total:  $${grandTotal.padStart(10)}`);
  divider();
}

Promise.all([getStocks, getCryptos])
.then(function([stockData, cryptoData]){
  log(stockData, cryptoData);
})
.catch(function(err){
  console.error('Promise.all error', err);
});
