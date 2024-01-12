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
exports.GenerateTest = void 0;
const node_process_1 = __importDefault(require("node:process"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_child_process_1 = __importDefault(require("node:child_process"));
const ms_1 = __importDefault(require("ms"));
class GenerateTest {
    constructor(config) {
        this.testCount = 0;
        this.testRange = [];
        this.testCode = '';
        this.RegExp = {
            arrayReg_1: /^\[(.+), (.+)\]$/,
            arrayReg_2: /^\[(.+), (.+) - (.+)\]$/,
            seqReg: /^\[(.+) -> (.+)\]/,
            revSegReg: /^\[(.+) <- (.+)\]/,
            assignReg: /^(.+) = (.+)$/,
            getCachedReg: /\[(.+)\]/,
            getRangeReg: /\[(.+) - (.+)\]/,
            constReg: /\[(.+)\]/,
            rangeReg: /\[(.+) - (.+)\]/,
            valueReg: /{(.+)}/,
        };
        this.cached = new Map();
        this.defineVar = new Map();
        this.MainCodePath = null;
        this.IOFilename = '';
        this.Compiler = null;
        this.CppVersion = null;
        this.TestcasesPath = '';
        this.OJ_TestcasesPath = null;
        this.TestcasesZipPath = null;
        this.OJ_TestcasesZipPath = null;
        this.Zip_Program = null;
        if (config)
            this.setConfig(config);
    }
    setConfig(config) {
        this.testCount = config.TestCount;
        this.testRange = config.TestRange
            .map((val) => {
            const cond = val.count < 1 && val.count > 0;
            if (cond == true)
                return { range: val.range, count: val.count * this.testCount, func: val.func };
            else
                return val;
        });
        this.parseCode(config.TestCode);
        this.MainCodePath = config.MainCodePath;
        this.IOFilename = config.IOFilename;
        this.Compiler = config.Compiler || 'g++';
        this.CppVersion = config.CppVersion || 'c++17';
        this.TestcasesPath = config.TestcasesPath;
        this.TestcasesZipPath = config.TestcasesZipPath;
        this.OJ_TestcasesPath = config.OJ_TestcasesPath;
        this.OJ_TestcasesZipPath = config.OJ_TestcasesZipPath;
        this.Zip_Program = config.Zip_Program || 'package';
    }
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            let report = [];
            const dirContents = node_fs_1.default.readdirSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath));
            dirContents.forEach((val) => node_fs_1.default.rmSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath, val), { recursive: true, force: true }));
            const configs = Array(this.testCount).fill(null).map((val, index) => {
                let lastIndex = { index: -1, count: 0 };
                const config = this.testRange.find((val, ind) => {
                    if (lastIndex.index != ind) {
                        lastIndex.count += val.count;
                        lastIndex.index = ind;
                    }
                    return index + 1 <= lastIndex.count;
                });
                if (!config)
                    throw new Error(`Cant find config for test ${index}`);
                return config;
            });
            const commandLines = this.testCode.split('\n');
            for (let [index, config] of configs.entries()) {
                if (!node_fs_1.default.existsSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`)))
                    node_fs_1.default.mkdirSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`));
                // const writeStream = fs.createWriteStream(
                //     path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`),
                //     { encoding: 'utf-8', flags: 'w' }
                // )
                let result = [];
                let timeStart = Date.now();
                while (true) {
                    result = [];
                    for (let [ind, line] of commandLines.entries()) {
                        const isArray = this.RegExp.arrayReg_1.test(line) ||
                            this.RegExp.arrayReg_2.test(line);
                        const range = Array.isArray(config.range[0]) ? config.range[ind] : config.range;
                        // let writeCb: boolean;
                        if (isArray)
                            result.push(...this.parseArray(line, range));
                        // writeCb = writeStream.write(this.parseArray(line, range).join(' ') + '\n')
                        else
                            result.push(this.parseLine(line, range).join(' '));
                        // writeCb = writeStream.write(this.parseLine(line, range).join(' ') + '\n')
                    }
                    const func = config.func;
                    if (!func)
                        break;
                    else {
                        const test = result.join('\n');
                        const res = yield Promise.resolve(func(test));
                        if (res == true)
                            break;
                    }
                    console.log(`[REGENERATE] [TEST_${index}] Regenerating...`);
                }
                let time = Date.now() - timeStart;
                node_fs_1.default.writeFileSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`), result.join('\n'), { encoding: 'utf-8' });
                const usageRamRaw = node_process_1.default.memoryUsage();
                const usageRam = {
                    heapUsed: (usageRamRaw.heapUsed / 1024 / 1024).toFixed(3),
                    heapTotal: (usageRamRaw.heapTotal / 1024 / 1024).toFixed(3),
                    external: (usageRamRaw.external / 1024 / 1024).toFixed(3),
                    arrayBuffers: (usageRamRaw.arrayBuffers / 1024 / 1024).toFixed(3)
                };
                report.push({
                    id: index,
                    memoryUsage: usageRamRaw,
                    time
                });
                console.log(`[REPORT] [TEST_${index + 1}] Time: ${(0, ms_1.default)(time)} | V8: ${usageRam.heapUsed}/${usageRam.heapTotal} (MB) | C++: ${usageRam.external} (MB) | ArrayBuffers: ${usageRam.arrayBuffers} (MB)`);
                if (global.gc)
                    global.gc();
            }
            return report;
        });
    }
    runFile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!!this.OJ_TestcasesPath)
                node_fs_1.default.readdirSync(this.OJ_TestcasesPath)
                    .forEach(file => node_fs_1.default.unlinkSync(node_path_1.default.join(this.OJ_TestcasesPath, file)));
            if (!this.MainCodePath)
                throw new Error("MainCodePath is undefined");
            const binaryFile = node_os_1.default.platform() == 'win32'
                ? 'main.exe'
                : 'main.out';
            let paths = {
                cwd: this.MainCodePath.split(/(\/|\\)/),
                testcases: node_path_1.default.join(__dirname, '..', this.TestcasesPath),
                testcasesZip: !!this.TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.TestcasesZipPath) : undefined,
                oj: !!this.OJ_TestcasesPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesPath) : undefined,
                ojZip: !!this.OJ_TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesZipPath) : undefined,
            };
            const compileCommand = `${this.Compiler} -std=${this.CppVersion} -Wall -Wextra -Wpedantic -Wunused-variable -Wtype-limits -o ${binaryFile} ${paths.cwd.shift()}`;
            console.log(`[COMPILER] Compiling....\n\t----- Live logging from compiler ----\n`);
            console.log(`> ${compileCommand}`);
            const spawnCb = yield this.spawn(compileCommand, paths.cwd.join(' '), { stdout: node_process_1.default.stdout, stderr: node_process_1.default.stderr });
            console.log(`\n\t----- \t ----\n`);
            if (spawnCb.code != 0)
                throw new Error(`compiler throw code ${spawnCb.code}`);
            for (let index = 0; index < this.testCount; index++) {
                const binaryPath = paths.cwd, testcase = node_path_1.default.join(paths.testcases, `TEST_${index + 1}`), testcaseZip = paths.testcasesZip, oj = paths.oj, ojZip = paths.ojZip;
                if (node_fs_1.default.existsSync(node_path_1.default.join(testcase, binaryFile)))
                    node_fs_1.default.unlinkSync(node_path_1.default.join(testcase, binaryFile));
                node_fs_1.default.copyFileSync(node_path_1.default.join(...binaryPath), testcase);
                const startTime = Date.now();
                const spawnCb = yield this.spawn(binaryFile, node_path_1.default.join(...binaryPath));
                const execTime = Date.now() - startTime;
                if (spawnCb.code != 0) {
                    console.log(spawnCb.stdout);
                    throw new Error(`binary file throw code ${spawnCb.code} at test ${index + 1}`);
                }
                if (!node_fs_1.default.existsSync(node_path_1.default.join(testcase, `${this.IOFilename}.OUT`)))
                    throw new Error(`cant find output file at test ${index + 1}`);
                if (oj) {
                    node_fs_1.default.copyFileSync(node_path_1.default.join(testcase, `${this.IOFilename}.INP`), node_path_1.default.join(oj, `${this.IOFilename}_${index + 1}.INP`));
                    node_fs_1.default.copyFileSync(node_path_1.default.join(testcase, `${this.IOFilename}.OUT`), node_path_1.default.join(oj, `${this.IOFilename}_${index + 1}.OUT`));
                }
                console.log(`[EXEC_FILE] [TEST_${index + 1}] Time: ${(0, ms_1.default)(execTime)}`);
            }
        });
    }
    zip(path, outFile) {
        switch (this.Zip_Program) {
            case 'jar':
                break;
            default:
            case 'package':
                break;
            case 'system':
                switch (node_os_1.default.platform()) {
                    case 'win32':
                        break;
                    default:
                        break;
                }
                break;
        }
    }
    spawn(command, cwd, pipe) {
        return new Promise((resolve, reject) => {
            var _a, _b;
            const compileCommand = command.split(' ');
            const childSpawn = node_child_process_1.default.spawn(compileCommand[0], compileCommand.slice(1), {
                cwd,
            });
            if (pipe === null || pipe === void 0 ? void 0 : pipe.stdout)
                (_a = childSpawn.stdout) === null || _a === void 0 ? void 0 : _a.pipe(pipe.stdout);
            if (pipe === null || pipe === void 0 ? void 0 : pipe.stderr)
                (_b = childSpawn.stdout) === null || _b === void 0 ? void 0 : _b.pipe(pipe.stderr);
            let stdout = '';
            childSpawn.stdout.on('data', (chunk) => stdout += chunk + '\n');
            childSpawn.stderr.on('data', (chunk) => stdout += chunk + '\n');
            childSpawn.on('error', (err) => { throw err; });
            childSpawn.on('close', (code) => resolve({ code, stdout }));
        });
    }
    parseCode(loadCode) {
        const [header, code] = loadCode.split(/-{5,}/);
        this.parseHeader(header);
        this.testCode = code.replace(/\t/gi, '').trim();
    }
    parseHeader(header) {
        header = header.replace(/\t/gi, '');
        const defineList = header.split('\n');
        for (let line of defineList) {
            const parameter = line.split(' ');
            const keyword = parameter[0];
            const dataType = parameter[1];
            const dataRange = dataType == 'char'
                ? [parameter[2] + (parameter.length == 4 ? ' ' : ''), '']
                : [parameter[2], parameter[3]].map(Number);
            const negative = dataType == 'char'
                ? false
                : Number(parameter[2]) < 0;
            this.defineVar.set(keyword, {
                dataRange,
                dataType,
                negative
            });
        }
        return undefined;
    }
    parseArray(command, testRange) {
        let result = [];
        const array = this.RegExp.arrayReg_2.exec(command) ||
            this.RegExp.arrayReg_1.exec(command) ||
            [];
        const commands = array[1].split('; ');
        const [column, row] = (this.RegExp.arrayReg_2.test(command)
            ? [array[2], array[3]]
            : [array[2], 1])
            .map((val) => this.cached.get(val.toString()) || val)
            .map(Number);
        for (let i = 0; i < column; i++) {
            const seq = this.RegExp.seqReg.test(command);
            const revSeq = this.RegExp.revSegReg.test(command);
            let line = '';
            if (seq == true) {
                const seqExec = this.RegExp.seqReg.exec(command) || [];
                for (let j = 0; j < row; j++) {
                    const begin = this.temp.lastItem || seqExec[1];
                    const end = this.cached.get(seqExec[2]) ? j / row * Number(this.cached.get(seqExec[2])) : Number(seqExec[2]);
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line = generated;
                }
            }
            else if (revSeq == true) {
                const seqExec = this.RegExp.revSegReg.exec(command) || [];
                for (let j = 0; j < row; j++) {
                    const begin = this.cached.get(seqExec[2]) ? (row - j + 1) / row * Number(this.cached.get(seqExec[2])) : Number(seqExec[2]);
                    const end = this.temp.lastItem || seqExec[1];
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line = generated;
                }
            }
            else
                for (let j = 0; j < row; j++)
                    for (let command of commands)
                        line += this.parseLine(command, testRange) + ' ';
            result.push(line);
        }
        return result;
    }
    parseLine(line, testRange) {
        const commands = line.split(';');
        let result = [];
        for (let command of commands)
            result.push(this.parseCommand(command, testRange));
        return result;
    }
    parseCommand(fullCommand, testRange) {
        var _a;
        fullCommand = fullCommand.trim();
        if (fullCommand == '')
            return '';
        if (this.RegExp.constReg.test(fullCommand)) {
            const keyword = (this.RegExp.constReg.exec(fullCommand) || [])[1];
            return ((_a = this.cached.get(keyword)) === null || _a === void 0 ? void 0 : _a.toString()) || '';
        }
        else if (this.RegExp.valueReg.test(fullCommand)) {
            const keyword = (this.RegExp.valueReg.exec(fullCommand) || [])[1];
            return eval(keyword) || '';
        }
        else if (this.RegExp.rangeReg.test(fullCommand)) {
            const line = this.RegExp.rangeReg.exec(fullCommand) || [];
            const [start, end] = [this.cached.get(line[1]) || line[1], this.cached.get(line[2]) || line[2]].map(Number);
            return this.getRandomInt(start, end).toString();
        }
        else {
            let command = fullCommand.split(' ');
            let ghost = command.includes('ghost'), cache = command.includes('const');
            [ghost, cache]
                .filter(val => val == true)
                .forEach(() => void command.shift());
            const define = this.defineVar.get(command[0]);
            // console.log({ command, define, testRange })
            if (!define)
                throw new Error('Cant find define of command: ' + command);
            let result = '';
            if (define.dataType == 'char')
                result = this.getRandomCharacter(define.dataRange[0]);
            else if (define.dataType == 'number')
                result = this.getRandomInt((define.dataRange[1] - define.dataRange[0]) * testRange[0] + define.dataRange[0], (define.dataRange[1] - define.dataRange[0]) * testRange[1] + define.dataRange[0]) * (define.negative == true
                    ? Math.floor(Math.random()) == 0 ? 1 : -1
                    : 1);
            if (cache)
                this.cached.set(command[0], result);
            return ghost == true ? '' : result.toString();
        }
    }
    getRandomInt(min, max) {
        min = Math.floor(min);
        max = Math.floor(max);
        return node_crypto_1.default.randomInt(min, max);
    }
    getRandomCharacter(str) {
        return str[node_crypto_1.default.randomInt(0, str.length - 1)];
    }
}
exports.GenerateTest = GenerateTest;
