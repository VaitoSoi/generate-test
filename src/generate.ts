import { GenerateTest, ReportArray, TestRange } from './index'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import zip_stream from 'node-stream-zip'

async function UnZip(sourceDir: string, destinationDir: string): Promise<number | undefined> {
    const stream = new zip_stream.async({ file: sourceDir })
    const entries = await stream.extract(null, destinationDir)
    stream.close()
    return entries
}

const rawConfig = yaml.parse(fs.readFileSync(process.argv[2] || 'config.yaml', 'utf8')) as any
let config = {
    TestCount: rawConfig.TestCount,
    TestRange: (rawConfig.TestRange as { range: [number, number], count: number, func?: string }[]).map<TestRange>((val) => {
        let resObj: any = val;
        if (!!val.func) resObj.func = require(path.join(__dirname, '..', val.func)).default || require(path.join(__dirname, '..', val.func))
        else val.func = undefined;

        return resObj
    }),
    TestCode: rawConfig.TestCode,

    MainCodePath: rawConfig.MainCodePath,
    TestcasesPath: rawConfig.TestcasesPath?.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    TestcasesZipPath: rawConfig.TestcasesZip?.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    OJ_TestcasesPath: rawConfig.OJ_TestcasesPath?.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    OJ_TestcasesZipPath: rawConfig.OJ_TestcasesZip?.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),

    Compiler: rawConfig.Compiler,
    CppVersion: rawConfig.CppVersion,
    IOFilename: rawConfig.IOFilename,
    Zip_Program: rawConfig.Zip_Program,
}
const generate = new GenerateTest()
generate.setConfig(config)
run()

async function run() {
    let report: ReportArray[] = []

    if (process.argv.includes('-g') || process.argv.includes('--generate')) {
        console.time('Generate time')
        report = await generate.generate()
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

    if (process.argv.includes('--report')) {
        if (!process.argv.includes('-g') && !process.argv.includes('--generate')) throw new Error('No report')
        const totalTime = report.reduce((acc, val) => acc + val.time, 0)
        const totalMemory = report.reduce((acc, val) => acc + val.memoryUsage.rss, 0) / 1024 / 1024
        const totalV8Memory = report.reduce((acc, val) => acc + val.memoryUsage.heapUsed, 0) / 1024 / 1024
        const totalCppMemory = report.reduce((acc, val) => acc + val.memoryUsage.external, 0) / 1024 / 1024
        const totalArrayMemory = report.reduce((acc, val) => acc + val.memoryUsage.arrayBuffers, 0) / 1024 / 1024
        console.log(
            `Report:\n` +
            `> Avr. Time: ${totalTime / report.length} (ms)\n` +
            `> Avr. Memory: ${(totalMemory / report.length).toFixed(3)} (MB)\n` +
            `> Avr. V8 Memory: ${(totalV8Memory / report.length).toFixed(3)} (MB)\n` +
            `> Avr. Cpp Memory: ${(totalCppMemory / report.length).toFixed(3)} (MB)\n` +
            `> Avr. Array Memory: ${(totalArrayMemory / report.length).toFixed(3)} (MB)`
        )
    }
}