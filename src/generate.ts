import { GenerateTest } from './index'
import yaml from 'yaml'
import archiver from 'archiver'
import fs from 'fs'

const config = yaml.parse(fs.readFileSync(process.argv[2] || 'config.yaml', 'utf8')) as any

const generate = new GenerateTest()

generate.setConfig({
    TestCount: config.TestCount,
    TestRange: config.TestRange,
    TestCode: config.TestCode,

    MainCodePath: config.MainCodePath,
    TestcasesPath: config.TestcasesPath,
    TestcasesZip: config.TestcasesZip,
    OJ_TestcasesPath: config.OJ_TestcasesPath,
    OJ_TestcasesZip: config.OJ_TestcasesZip,

    Compiler: config.Compiler,
    CppVersion: config.CppVersion,
    IOFilename: config.IOFilename,
    Zip_Program: config.Zip_Program,
})

console.time('generate')
generate.generate()
console.timeEnd('generate')