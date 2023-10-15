import { parse } from 'yaml'
import { readFileSync } from 'node:fs'

console.log(parse(readFileSync('./config.yaml', 'utf8')))