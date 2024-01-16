import { GTOptions, GenerateTest, TestRange } from './index'
import { UnZip } from './unzip'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'

const rawConfig = yaml.parse(fs.readFileSync(process.argv[2] || 'config.yaml', 'utf8')) as any
let config = {
    TestCount: rawConfig.TestCount,
    TestRange: (rawConfig.TestRange as {range: [number, number], count: number, func?: string}[]).map<TestRange>((val) => {
        let resObj: any = val;
        if (!!val.func) resObj.func = require(path.join(__dirname, '..', val.func))
        else val.func = undefined;

        return resObj
    }),
    TestCode: rawConfig.TestCode,

    MainCodePath: rawConfig.MainCodePath,
    TestcasesPath: rawConfig.TestcasesPath.replace(/\{IO\}/gi, rawConfig.IOFilename),
    TestcasesZipPath: rawConfig.TestcasesZip.replace(/\{IO\}/gi, rawConfig.IOFilename),
    OJ_TestcasesPath: rawConfig.OJ_TestcasesPath.replace(/\{IO\}/gi, rawConfig.IOFilename),
    OJ_TestcasesZipPath: rawConfig.OJ_TestcasesZip.replace(/\{IO\}/gi, rawConfig.IOFilename),

    Compiler: rawConfig.Compiler,
    CppVersion: rawConfig.CppVersion,
    IOFilename: rawConfig.IOFilename,
    Zip_Program: rawConfig.Zip_Program,
}
const generate = new GenerateTest()
generate.setConfig(config)
run()

async function run() {
    if (process.argv.includes('-g') || process.argv.includes('--generate')) {
        console.time('Generate time')
        await generate.generate()
        console.timeEnd('Generate time')
    } else if (process.argv.includes('-u') || process.argv.includes('--unzip')) {
        const dirContents = fs.readdirSync(config.TestcasesPath)
        dirContents.forEach((val) => fs.rmSync(path.join(config.TestcasesPath, val), { recursive: true, force: true }))

        await UnZip(
            config.TestcasesZipPath,
            config.TestcasesPath
        )
        
        const tests = fs.readdirSync(config.TestcasesPath).length

        console.log(`[UNZIPPER] Unzipped ${tests} testcases`)
        if (!!tests) generate.setTestCount = tests
    }

    if (!!config.MainCodePath && (process.argv.includes('-r') || process.argv.includes('--run'))) await generate.runFile()

    if (process.argv.includes('-z') || process.argv.includes('--z')) await generate.zip({ oj: process.argv.includes('-r') || process.argv.includes('--run') })
}