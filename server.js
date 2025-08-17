import express from 'express'
import cors from 'cors'
import yahooFinance from 'yahoo-finance2'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const CSV_FILE = path.join(
  process.cwd(),
  process.env.CSV_FILE || './assets/csv/all_stocks_sorted.csv'
)

app.use(cors())
app.use(express.json())

// Load the CSV
async function loadCSV(filePath) {
  const stocks = []
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const symbol = (row.symbol || row.Symbol || '').trim()
        const name = (row.name || row.Name || '').trim()
        if (symbol && name) stocks.push({ symbol, name })
      })
      .on('end', resolve)
      .on('error', reject)
  })
  return stocks
}

// Cache top stocks
let topStocksCache = []

app.get('/top-stocks', async (req, res) => {
  try {
    if (topStocksCache.length === 0) {
      topStocksCache = await loadCSV(CSV_FILE)
      console.log(`Loaded ${topStocksCache.length} stocks from CSV`)
    }
    res.json(topStocksCache)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load top stocks' })
  }
})

app.get('/stock/:symbol', async (req, res) => {
  const { symbol } = req.params
  try {
    const quote = await yahooFinance.quote(symbol)
    const history = await yahooFinance.historical(symbol, {
      period1: '2024-01-01',
    })
    res.json({ quote, history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/whatif/:symbol', async (req, res) => {
  const { symbol } = req.params
  const { start, end, amount } = req.query

  try {
    const history = await yahooFinance.historical(symbol, {
      period1: start,
      period2: end,
    })

    if (!history || history.length === 0)
      return res.status(404).json({ error: 'No data available' })

    // Ensure ascending order by date
    const orderedHistory = history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const startPrice = orderedHistory[0].close
    const endPrice = orderedHistory[orderedHistory.length - 1].close
    const shares = amount / startPrice
    const finalValue = shares * endPrice

    res.json({
      invested: Number(amount),
      startPrice,
      endPrice,
      shares,
      finalValue,
      profit: finalValue - amount,
      history: orderedHistory,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
