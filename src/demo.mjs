import { quoteTotal } from './quote.mjs';
import { roundMoney } from './money.mjs';
console.log(JSON.stringify({ items: [10, 20, 12.5], total: roundMoney(quoteTotal([10, 20, 12.5])) }, null, 2));
