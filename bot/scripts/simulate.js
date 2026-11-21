import { parseMessage } from '../src/parser.js'

const text = process.argv.slice(2).join(' ')
if (!text) {
  console.log('Contoh: npm run simulate -- "masuk uang 500 ribu"')
  process.exit(0)
}
console.log(JSON.stringify(parseMessage(text), null, 2))
