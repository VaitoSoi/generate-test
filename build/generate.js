"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const unzip_1 = require("./unzip");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const rawConfig = yaml_1.default.parse(node_fs_1.default.readFileSync(process.argv[2] || 'config.yaml', 'utf8'));
let config = {
    TestCount: rawConfig.TestCount,
    TestRange: rawConfig.TestRange.map((val) => {
        let resObj = val;
        if (!!val.func)
            resObj.func = require(node_path_1.default.join(__dirname, '..', val.func));
        else
            val.func = undefined;
        return resObj;
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
};
const generate = new index_1.GenerateTest();
generate.setConfig(config);
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.argv.includes('-g') || process.argv.includes('--generate')) {
            console.time('Generate time');
            yield generate.generate();
            console.timeEnd('Generate time');
        }
        else if (process.argv.includes('-u') || process.argv.includes('--unzip')) {
            const dirContents = node_fs_1.default.readdirSync(config.TestcasesPath);
            dirContents.forEach((val) => node_fs_1.default.rmSync(node_path_1.default.join(config.TestcasesPath, val), { recursive: true, force: true }));
            yield (0, unzip_1.UnZip)(config.TestcasesZipPath, config.TestcasesPath);
            const tests = node_fs_1.default.readdirSync(config.TestcasesPath).length;
            console.log(`[UNZIPPER] Unzipped ${tests} testcases`);
            if (!!tests)
                generate.setTestCount = tests;
        }
        if (!!config.MainCodePath && (process.argv.includes('-r') || process.argv.includes('--run')))
            yield generate.runFile();
        if (process.argv.includes('-z') || process.argv.includes('--z'))
            yield generate.zip({ oj: process.argv.includes('-r') || process.argv.includes('--run') });
    });
}
