import { GenerateTest } from './index'
import yaml from 'yaml'
import fs from 'fs'

const config = yaml.parse(fs.readFileSync(process.argv[2] || 'config.yaml', 'utf8')) as any

const generate = new GenerateTest()

generate.setConfig({
    TestCount: config.TestCount,
    TestRange: config.TestRange,
    TestCode: config.TestCode,

    MainCodePath: config.MainCodePath,
    TestcasesPath: config.TestcasesPath.replace(/\{IO\}/gi, config.IOFilename),
    TestcasesZipPath: config.TestcasesZip.replace(/\{IO\}/gi, config.IOFilename),
    OJ_TestcasesPath: config.OJ_TestcasesPath.replace(/\{IO\}/gi, config.IOFilename),
    OJ_TestcasesZipPath: config.OJ_TestcasesZip.replace(/\{IO\}/gi, config.IOFilename),

    Compiler: config.Compiler,
    CppVersion: config.CppVersion,
    IOFilename: config.IOFilename,
    Zip_Program: config.Zip_Program,
})
run()

async function run() {
    console.time('generate')
    await generate.generate()
    console.timeEnd('generate')

    if (!!config.MainCodePath) await generate.runFile()
}
// console.log(generate.parseCommand('[1 - 10]', [0, 1]))