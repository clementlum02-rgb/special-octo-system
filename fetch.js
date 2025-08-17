import fs from 'fs'
import csv from 'csv-parser'
import { parse } from 'json2csv'

const inputFile = './all_us_stocks.csv' // your existing CSV
const outputFile = './all_stocks_sorted.csv'

const stocks = []

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    // Assuming CSV has "Symbol" and "Name" columns
    if (row.Symbol && row.Name) {
      stocks.push({ symbol: row.Symbol.trim(), name: row.Name.trim() })
    }
  })
  .on('end', () => {
    // Sort alphabetically by symbol
    stocks.sort((a, b) => a.symbol.localeCompare(b.symbol))

    // Convert back to CSV
    const csvData = parse(stocks, { fields: ['symbol', 'name'], header: true })

    // Save sorted CSV
    fs.writeFileSync(outputFile, csvData)
    console.log(`Sorted CSV saved as ${outputFile}`)
  })
