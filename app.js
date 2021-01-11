const express = require('express')
const app = express();
const https = require('https');

const web3Modul = require('./web3Module')

const PORT = 3000
const CURRENT_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
const MINUTES_TO_WAIT = 15
const MINUTES_TO_CHECK = 1

var prices = []
var cntForPrices = 0
var is15minPassed = false
var isTransactionInProgress = false // if transaction is wainting more than one minute, another transaction can start
                                    // because timestamp on contract is not changed yet, so we prevent it with this

// -------------------------------------- server backend --------------------------------------

app.get('/get-price', (req, res) => {
    Promise.all([getCurrentPrice(),getPriceFromContract()])
        .then( array => {
            var data = {
                'currentPrice':array[0],
                'contractPrice':array[1]
            }
            res.type('json')
            res.send(data)
        })
        .catch( err => {
            return err;
        })
})

app.listen(PORT, startConstantPriceCheck);

function startConstantPriceCheck(){  // start checking for price every minute
    timeoutForContractCheck(MINUTES_TO_WAIT);
    setInterval(checkForCurrentPrice, MINUTES_TO_CHECK * 1000 * 60); // in miliseconds ( to get 1 minute, 1000 * 60)
}

// -------------------------------------- end server --------------------------------------

// To prevent calling smart contract first 15 minutes after server starts ( no need for that ), 
// 15 minutes after every contract write
// and n minutes to wait after last write contract ( if someone else write it)
function timeoutForContractCheck(minutes){ 
    is15minPassed = false;
    setTimeout( () => {
        is15minPassed = true; 
    }, minutes * 60 * 1000)
}

async function checkForCurrentPrice(){ // it must be async cause it needs to wait for get call to finish
    try{
        var price = await getCurrentPrice()
    }catch(err){
        console.log(currentTime() + ': Error with getting price: ' + err)
        return err
    }
    addCurrentPrice(price)
    if( is15minPassed  && ! isTransactionInProgress ){
        if( await isContractTimestampPassed() ){
            if( await isPriceChanged2Pct()){
                try{
                    await writeContract()
                    isTransactionInProgress = false
                    console.log(currentTime() + ": Successful transaction!")
                }catch(err){
                    console.log(currentTime() + ': Error with finishing transaction:' + err)
                }
            }else {
                console.log(currentTime() + ': Price is not changed enough.')
            } 
        }else{
            console.log(currentTime() + ': Not enough time has passed.')
        }
        
    }
}

function addCurrentPrice(price){ // add new price to array every minute
    prices[cntForPrices] = price;
    cntForPrices = ++cntForPrices % 15; // to use only 15 spaces in array
}

function getCurrentPrice() {
    return new Promise( (resolve, reject) => {
        https.get(CURRENT_PRICE_URL, (response) => { // sending get request to get price
            response.on('data', (data) => {
                var price = JSON.parse(data).ethereum.usd; // and we got the price
                resolve(price);
            })
        })
        .on("error", (err) => {
            console.log(currentTime() + ": Error with getting price: " + err.message);
            reject(err);
        });
    });
}

function getAveragePrice(){
    var add = 0;
    for(var i = 0; i < MINUTES_TO_WAIT; i++){
        add += prices[i]    
    }
    return add/MINUTES_TO_WAIT
}

function currentTime(){
    var today = new Date()
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds()
    return date + ' ' + time
}

// -------------------------------------- web3 --------------------------------------

async function writeContract(){
    try {
        isTransactionInProgress = true;
        await web3Modul.writeContract(getAveragePrice())
        timeoutForContractCheck(MINUTES_TO_WAIT)
    }catch(err){
        console.log(currentTime() + ': Error with transaction: ' + err)
    }
}

async function isContractTimestampPassed(){
    try{
        return await web3Modul.isTimestampPassed()
    }catch(minutes){
        console.log(currentTime() + ': Error with timestamp, ' + minutes + ' more minutes to wait before next check to write contract.')
        timeoutForContractCheck(minutes)
        return false
    }
}

async function isPriceChanged2Pct(){
    try {
        return await web3Modul.isPriceChanged2Percent(getAveragePrice())
    }catch(err){
        console.log(currentTime() + ': Error with price:' + err)
        return false
    }
}

async function getPriceFromContract(){
    return await web3Modul.getPriceFromContract();
}