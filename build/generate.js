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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const node_stream_zip_1 = __importDefault(require("node-stream-zip"));
const node_process_1 = __importDefault(require("node:process"));
function UnZip(sourceDir, destinationDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const stream = new node_stream_zip_1.default.async({ file: sourceDir });
        const entries = yield stream.extract(null, destinationDir);
        stream.close();
        return entries;
    });
}
const rawConfig = yaml_1.default.parse(node_fs_1.default.readFileSync(node_process_1.default.argv[2] || 'config.yaml', 'utf8'));
let config = {
    TestCount: rawConfig.TestCount,
    TestRange: rawConfig.TestRange.map((val) => {
        let resObj = val;
        if (!!val.func)
            resObj.func = require(node_path_1.default.join(__dirname, '..', val.func)).default || require(node_path_1.default.join(__dirname, '..', val.func));
        else
            val.func = undefined;
        return resObj;
    }),
    TestCode: rawConfig.TestCode,
    MainCodePath: rawConfig.MainCodePath,
    TestcasesPath: (_a = rawConfig.TestcasesPath) === null || _a === void 0 ? void 0 : _a.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    TestcasesZipPath: (_b = rawConfig.TestcasesZip) === null || _b === void 0 ? void 0 : _b.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    OJ_TestcasesPath: (_c = rawConfig.OJ_TestcasesPath) === null || _c === void 0 ? void 0 : _c.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
    OJ_TestcasesZipPath: (_d = rawConfig.OJ_TestcasesZip) === null || _d === void 0 ? void 0 : _d.replace(/\{IO\}/gi, rawConfig.IOFilename || '{IO}'),
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
        let report = [];
        if (node_process_1.default.argv.includes('-g') || node_process_1.default.argv.includes('--generate')) {
            console.time('Generate time');
            report = yield generate.generate();
            console.timeEnd('Generate time');
        }
        else if (node_process_1.default.argv.includes('-u') || node_process_1.default.argv.includes('--unzip')) {
            const dirContents = node_fs_1.default.readdirSync(config.TestcasesPath);
            dirContents.forEach((val) => node_fs_1.default.rmSync(node_path_1.default.join(config.TestcasesPath, val), { recursive: true, force: true }));
            yield UnZip(config.TestcasesZipPath, config.TestcasesPath);
            const tests = node_fs_1.default.readdirSync(config.TestcasesPath).length;
            console.log(`[UNZIPPER] Unzipped ${tests} testcases`);
            if (!!tests)
                generate.setTestCount = tests;
        }
        if (!!config.MainCodePath && (node_process_1.default.argv.includes('-r') || node_process_1.default.argv.includes('--run')))
            yield generate.runFile();
        if (node_process_1.default.argv.includes('-z') || node_process_1.default.argv.includes('--zip'))
            yield generate.zip({ oj: node_process_1.default.argv.includes('-r') || node_process_1.default.argv.includes('--run') });
        if (node_process_1.default.argv.includes('--report')) {
            if (!node_process_1.default.argv.includes('-g') && !node_process_1.default.argv.includes('--generate') || report.length == 0)
                throw new Error('No report');
            const totalTime = report.reduce((acc, val) => acc + val.time, 0);
            const totalMemory = report.reduce((acc, val) => acc + val.memoryUsage.rss, 0) / 1024 / 1024;
            const totalV8Memory = report.reduce((acc, val) => acc + val.memoryUsage.heapUsed, 0) / 1024 / 1024;
            const totalCppMemory = report.reduce((acc, val) => acc + val.memoryUsage.external, 0) / 1024 / 1024;
            const totalArrayMemory = report.reduce((acc, val) => acc + val.memoryUsage.arrayBuffers, 0) / 1024 / 1024;
            console.log(`Report:\n` +
                `> Avr. Time: ${totalTime / report.length} (ms)\n` +
                `> Avr. Memory: ${(totalMemory / report.length).toFixed(3)} (MB)\n` +
                `> Avr. V8 Memory: ${(totalV8Memory / report.length).toFixed(3)} (MB)\n` +
                `> Avr. Cpp Memory: ${(totalCppMemory / report.length).toFixed(3)} (MB)\n` +
                `> Avr. Array Memory: ${(totalArrayMemory / report.length).toFixed(3)} (MB)`);
        }
    });
}
