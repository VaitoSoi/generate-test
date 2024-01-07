"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const yaml_1 = __importDefault(require("yaml"));
const fs_1 = __importDefault(require("fs"));
const config = yaml_1.default.parse(fs_1.default.readFileSync(process.argv[2] || 'config.yaml', 'utf8'));
const generate = new index_1.GenerateTest();
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
});
console.time('generate');
generate.generate();
console.timeEnd('generate');
