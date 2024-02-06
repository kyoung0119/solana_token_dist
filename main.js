const { PublicKey } = require('@solana/web3.js')
const {
    Token,
    Percent,
    TokenAmount,
    TOKEN_PROGRAM_ID
} = require('@raydium-io/raydium-sdk')

const { createToken } = require('./create_token.js')
const { createMarket } = require('./create_market.js')
const { createPool } = require('./create_pool.js')
const { execSwap } = require('./exec_swap.js')

const {
    connection,
    myKeyPair,
    DEFAULT_TOKEN,
} = require('./config.js')

const {
    getWalletTokenAccount,
    sleepTime,
    formatAmmKeysById
} = require('./util.js')

const prompt = require('prompt-sync')({ sigint: true });

const BN = require('bn.js');

require('dotenv').config({ path: `.env.${process.env.NETWORK}` })

// const secretKeyString = fs.readFileSync('./id.json', 'utf8');
// const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
// const keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);

console.log("...Token Info Input...")
const amount = Number(prompt('amount(default: 10000): ')) || 10000;
const decimals = Number(prompt('amount(default: 9): ')) || 9;
const symbol = prompt('amount(default: "TMT"): ') || 'TMT';
const tokenName = prompt('amount(default: "Test Mock Token"): ') || 'Test Mock Token';

const tokenInfo = {
    amount,
    decimals,
    metadata: "",
    symbol,
    tokenName
}

main(tokenInfo)

async function main(tokenInfo) {
    console.log('tokenInfo', tokenInfo, 'tokenInfo')

    console.log("Creating Token...")
    const mintAddress = await createToken(tokenInfo)

    const baseToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(mintAddress), tokenInfo.decimals, tokenInfo.symbol, tokenInfo.tokenName)
    const quoteToken = DEFAULT_TOKEN.WSOL

    console.log("Creating Market...")
    const targetMarketId = await createMarket({
        baseToken,
        quoteToken,
        wallet: myKeyPair,
    })

    // create pool
    const addBaseAmount = new BN(100 * (10 ** tokenInfo.decimals)) // custom token
    const addQuoteAmount = new BN(1 * (10 ** tokenInfo.decimals)) // WSOL

    const startTime = Math.floor(Date.now() / 1000) // start immediately
    // const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 2  // 2 hours later

    console.log("wait 10 seconds for changes to apply...")
    await sleepTime(10000)
    console.log("Creating Pool...")

    const walletTokenAccounts = await getWalletTokenAccount(connection, myKeyPair.publicKey)

    const targetPoolPubkey = await createPool({
        baseToken,
        quoteToken,
        addBaseAmount,
        addQuoteAmount,
        targetMarketId,
        startTime,
        walletTokenAccounts
    })

    // const targetPool = '9cAk6wsiehHoPyEwUJ9Vy8fpb5iHz5uCupgAMRKxVfbN' // replace pool id
    const targetPool = targetPoolPubkey.toString()

    console.log("Executing Swaps...")

    const wallet_array = [
        "5PEpnjfJogn3odSK7MtBaaYjTV8G2F69Gy7cmZFo5WjXYNYwDgnvHihqexSPnVwZCEz2F4aZn7UfwTwVWHxxQCt",
        "4TCkT2SLdDVyKtU5MdXdiU7y6JR3WiyfxitVibQ5mgZL4WEnw5c3h84axZpZescw8jNsTn8ckqCMneFFLff93mfz"
    ]
    // const baseToken = new Token(TOKEN_PROGRAM_ID, new PublicKey("D8VCsDwkTBMTAcsBLF9UZ8vYD4U7FvcJp1fMi9n9QqhE"), tokenInfo.decimals, tokenInfo.symbol, tokenInfo.tokenName)
    // const quoteToken = DEFAULT_TOKEN.WSOL

    const inputToken = quoteToken // WSOL
    const outputToken = baseToken // custom token
    const inputTokenAmount = new TokenAmount(inputToken, 1000000)
    const slippage = new Percent(1, 100)

    wallet_array.forEach(async wallet => {
        const res = await execSwap({
            targetPool,
            inputTokenAmount,
            outputToken,
            slippage,
            wallet
        })
    });
}


