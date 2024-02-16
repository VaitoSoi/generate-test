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
const archiver_1 = __importDefault(require("archiver"));
const package_json_1 = __importDefault(require("../package.json"));
class GenerateTest {
    constructor(config) {
        this.testCount = 0;
        this.testRange = [];
        this.testCode = '';
        this.temp = {};
        this.RegExp = {
            arrayReg_1: /^\[(.+), (.+)\]$/,
            arrayReg_2: /^\[(.+), (.+) - (.+)\]$/,
            arrayReg_3: /^\[(.+), (.+) - (.+), ""\]$/,
            arrayReg_4: /^\[(.+), (.+) - (.+), "(.+)"\]$/,
            seqReg: /^\[(.+) -> (.+)\]$/,
            revSegReg: /^\[(.+) <- (.+)\]$/,
            assignReg: /^const (.+) = (.+)$/,
            constReg: /^\[(.+)\]$/,
            rangeReg: /^\[(.+) - (.+)\]$/,
            valueReg: /^{(.+)}$/,
            maxOfDefine: /^max\((.+)\)$/,
            minOfDefine: /^min\((.+)\)$/,
            function: /^(.+)\((.+)\)$/
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
        this.Zip_Program = config.Zip_Program;
    }
    set setTestCount(count) {
        this.testCount = count;
    }
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            let report = [];
            const testcasesPath = node_path_1.default.join(__dirname, '..', this.TestcasesPath);
            this.mkdir(testcasesPath);
            const dirContents = node_fs_1.default.readdirSync(testcasesPath);
            dirContents.forEach((val) => node_fs_1.default.rmSync(node_path_1.default.join(testcasesPath, val), { recursive: true, force: true }));
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
                this.temp = {};
                this.temp.currentTest = index;
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
                            this.RegExp.arrayReg_2.test(line) ||
                            this.RegExp.arrayReg_3.test(line) ||
                            this.RegExp.arrayReg_4.test(line);
                        const range = config.range;
                        // let writeCb: boolean;
                        if (isArray)
                            this.largePush(this.parseArray(line, range), result);
                        // writeCb = writeStream.write(this.parseArray(line, range).join(' ') + '\n')
                        else
                            result.push(this.parseLine(line, range).join(' '));
                        // writeCb = writeStream.write(this.parseLine(line, range).join(' ') + '\n')
                    }
                    const func = config.func;
                    if (!func || typeof func != 'function')
                        break;
                    else {
                        const test = result.join('\n');
                        const res = yield Promise.resolve(func(test, { currentTest: index, testCount: this.testCount }));
                        if (res == true)
                            break;
                    }
                    console.log(`[REGENERATE] [TEST_${index + 1}] Regenerating...`);
                }
                let time = Date.now() - timeStart;
                node_fs_1.default.writeFileSync(node_path_1.default.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`), result
                    .filter((val) => val.trim() != '')
                    .join('\n'), { encoding: 'utf-8' });
                const usageRamRaw = node_process_1.default.memoryUsage();
                const usageRam = {
                    heapUsed: (usageRamRaw.heapUsed / 1024 / 1024).toFixed(3),
                    heapTotal: (usageRamRaw.heapTotal / 1024 / 1024).toFixed(3),
                    external: (usageRamRaw.external / 1024 / 1024).toFixed(3),
                    arrayBuffers: (usageRamRaw.arrayBuffers / 1024 / 1024).toFixed(3),
                    rss: (usageRamRaw.rss / 1024 / 1024).toFixed(3)
                };
                report.push({
                    id: index,
                    memoryUsage: usageRamRaw,
                    time
                });
                console.log(`[REPORT] [TEST_${index + 1}] Time: ${(0, ms_1.default)(time)} | Total: ${usageRam.rss} (MB) | V8: ${usageRam.heapUsed}/${usageRam.heapTotal} (MB) | C++: ${usageRam.external} (MB) | ArrayBuffers: ${usageRam.arrayBuffers} (MB)`);
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
            const binaryFilePath = node_os_1.default.platform() == 'win32'
                ? 'main.exe'
                : './main.out';
            let paths = {
                cwd: this.MainCodePath.split(/(\/|\\)/gi),
                testcases: node_path_1.default.join(__dirname, '..', this.TestcasesPath),
                testcasesZip: !!this.TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.TestcasesZipPath) : undefined,
                oj: !!this.OJ_TestcasesPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesPath) : undefined,
                ojZip: !!this.OJ_TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesZipPath) : undefined,
            };
            if (!!paths.testcases)
                this.mkdir(paths.testcases);
            if (!!paths.testcasesZip)
                this.mkdir(paths.testcasesZip);
            if (!!paths.oj)
                this.mkdir(paths.oj);
            if (!!paths.ojZip)
                this.mkdir(paths.ojZip);
            const compileCommand = `${this.Compiler} -std=${this.CppVersion} -Wall -Wextra -Wpedantic -Wunused-variable -Wtype-limits -o ${binaryFile} ${paths.cwd.pop()}`;
            console.log(`[COMPILER] Compiling....`);
            console.log(`\t----- Live logging from compiler ----`);
            console.log(`> ${compileCommand}`);
            const execCb = yield this.exec(compileCommand, paths.cwd.join('/'), { stdout: node_process_1.default.stdout, stderr: node_process_1.default.stderr });
            console.log(`\n\t-------------------------------------`);
            if (execCb.code != 0)
                throw new Error(`compiler throw code ${execCb.code}`);
            for (let index = 0; index < this.testCount; index++) {
                const binaryPath = paths.cwd, testcase = node_path_1.default.join(paths.testcases, `TEST_${index + 1}`), oj = paths.oj;
                if (node_fs_1.default.existsSync(node_path_1.default.join(testcase, binaryFile)))
                    node_fs_1.default.unlinkSync(node_path_1.default.join(testcase, binaryFile));
                node_fs_1.default.copyFileSync(node_path_1.default.join(...binaryPath, binaryFile), node_path_1.default.join(testcase, binaryFile));
                const startTime = Date.now();
                const execCb = yield this.exec(binaryFilePath, testcase);
                const execTime = Date.now() - startTime;
                if (execCb.code != 0) {
                    console.log(execCb.stdout);
                    // console.log({ binaryPath, testcase })
                    throw new Error(`binary file throw code ${execCb.code} at test ${index + 1}`);
                }
                if (!node_fs_1.default.existsSync(node_path_1.default.join(testcase, `${this.IOFilename}.OUT`)))
                    throw new Error(`cant find output file at test ${index + 1}`);
                if (!!oj) {
                    node_fs_1.default.copyFileSync(node_path_1.default.join(testcase, `${this.IOFilename}.INP`), node_path_1.default.join(oj, `${this.IOFilename}_${index + 1}.INP`));
                    node_fs_1.default.copyFileSync(node_path_1.default.join(testcase, `${this.IOFilename}.OUT`), node_path_1.default.join(oj, `${this.IOFilename}_${index + 1}.OUT`));
                }
                console.log(`[EXEC_FILE] [TEST_${index + 1}] Time: ${(0, ms_1.default)(execTime)}`);
            }
        });
    }
    zip(config = { oj: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            let paths = {
                testcases: node_path_1.default.join(__dirname, '..', this.TestcasesPath),
                testcasesZip: !!this.TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.TestcasesZipPath) : undefined,
                oj: !!this.OJ_TestcasesPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesPath) : undefined,
                ojZip: !!this.OJ_TestcasesZipPath ? node_path_1.default.join(__dirname, '..', this.OJ_TestcasesZipPath) : undefined,
            };
            if (paths.testcasesZip) {
                console.log(`[ZIPPER] Zipping testcases...`);
                yield this.zip_(paths.testcases, paths.testcasesZip, this.Zip_Program);
                console.log(`[ZIPPER] Done`);
            }
            if (paths.oj && paths.ojZip && config.oj == true) {
                console.log(`[ZIPPER] Zipping testcases (OJ format)...`);
                yield this.zip_(paths.oj, paths.ojZip, this.Zip_Program);
                console.log(`[ZIPPER] Done`);
            }
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
        const args = this.RegExp.arrayReg_4.exec(command) ||
            this.RegExp.arrayReg_3.exec(command) ||
            this.RegExp.arrayReg_2.exec(command) ||
            this.RegExp.arrayReg_1.exec(command) ||
            [];
        const [column, row] = (this.RegExp.arrayReg_4.test(command) || this.RegExp.arrayReg_3.test(command) || this.RegExp.arrayReg_2.test(command)
            ? [args[2], args[3]]
            : [args[2], 1])
            .map((val) => this.cached.get(val.toString()) || val)
            .map(Number);
        const join = this.RegExp.arrayReg_4.test(command)
            ? args[4]
            : '';
        for (let i = 0; i < column; i++) {
            const seq = this.RegExp.seqReg.test(args[1]);
            const revSeq = this.RegExp.revSegReg.test(args[1]);
            let line = '';
            if (seq == true) {
                const seqExec = this.RegExp.seqReg.exec(args[1]) || [];
                for (let j = 0; j < row; j++) {
                    const begin = this.temp.lastItem || seqExec[1];
                    const end = this.cached.get(seqExec[2]) ? (j + 1) / row * Number(this.cached.get(seqExec[2])) : seqExec[2];
                    // console.log({ begin, end, cache: this.cached })
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line += generated + join;
                }
            }
            else if (revSeq == true) {
                const seqExec = this.RegExp.revSegReg.exec(args[1]) || [];
                for (let j = 0; j < row; j++) {
                    const begin = this.cached.get(seqExec[2]) ? (row - j + 1) / row * Number(this.cached.get(seqExec[2])) : seqExec[2];
                    const end = this.temp.lastItem || seqExec[2];
                    // console.log({ begin, end, cache: this.cached })
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line += generated + join;
                }
            }
            else
                for (let j = 0; j < row; j++)
                    line += this.parseLine(args[1], testRange).join(' ') + join;
            result.push(line);
            // console.log({ line, result })
        }
        return result;
    }
    parseLine(line, testRange) {
        let result = [];
        if (!this.RegExp.valueReg.test(line)) {
            const commands = line.split(';');
            for (let command of commands)
                result.push(this.parseCommand(command, testRange));
        }
        else
            result = [
                this.parseCommand(line, testRange)
            ];
        return result;
    }
    parseCommand(fullCommand, testRange) {
        // console.log({ fullCommand })
        var _a;
        fullCommand = fullCommand.trim();
        if (fullCommand == '')
            return '';
        if (this.RegExp.minOfDefine.test(fullCommand)) {
            const minODExec = this.RegExp.minOfDefine.exec(fullCommand) || [];
            const define = this.defineVar.get(minODExec[1]);
            if (!define)
                throw new Error('cant find define of command: ' + minODExec[1]);
            const range = Array.isArray(testRange[0])
                ? testRange[Array.from(this.defineVar).findIndex((val) => val[0] == minODExec[1])]
                : testRange;
            return (define.dataRange[1] - define.dataRange[0]) * range[0] + define.dataRange[0];
        }
        else if (this.RegExp.maxOfDefine.test(fullCommand)) {
            const maxODExec = this.RegExp.maxOfDefine.exec(fullCommand) || [];
            const define = this.defineVar.get(maxODExec[1]);
            if (!define)
                throw new Error('cant find define of command: ' + maxODExec[1]);
            const range = Array.isArray(testRange[0])
                ? testRange[Array.from(this.defineVar).findIndex((val) => val[0] == maxODExec[1])]
                : testRange;
            return (define.dataRange[1] - define.dataRange[0]) * range[1] + define.dataRange[0];
        }
        else if (this.RegExp.assignReg.test(fullCommand)) {
            const assignExec = this.RegExp.assignReg.exec(fullCommand) || [];
            const keyword = assignExec[1];
            const command = assignExec[2];
            const value = this.parseCommand(command, testRange);
            this.cached.set(keyword, value);
            return value;
        }
        else if (this.RegExp.rangeReg.test(fullCommand)) {
            const line = this.RegExp.rangeReg.exec(fullCommand) || [];
            let [start, end] = [this.cached.get(line[1]) || line[1], this.cached.get(line[2]) || line[2]].map(String);
            if (this.RegExp.function.test(start) || this.RegExp.valueReg.test(start))
                start = this.parseCommand(start, testRange);
            if (this.RegExp.function.test(end) || this.RegExp.valueReg.test(end))
                end = this.parseCommand(end, testRange);
            // console.log({ start, end });
            [start, end] = [start, end].map(Number);
            return this.getRandomInt(start, end).toString();
        }
        else if (this.RegExp.valueReg.test(fullCommand)) {
            const keyword = (this.RegExp.valueReg.exec(fullCommand) || [])[1];
            const user = {
                max: (define) => this.parseCommand(`max(${define})`, testRange),
                min: (define) => this.parseCommand(`min(${define})`, testRange),
                get: (define) => this.cached.get(define),
                set: (define, value) => this.cached.set(define, value),
                cmd: (command) => {
                    const isArray = this.RegExp.arrayReg_1.test(command) ||
                        this.RegExp.arrayReg_2.test(command) ||
                        this.RegExp.arrayReg_3.test(command) ||
                        this.RegExp.arrayReg_4.test(command);
                    if (isArray)
                        return this.parseArray(command, testRange).join('\n');
                    else
                        return this.parseLine(command, testRange);
                },
                current: () => this.temp.currentTest,
                total: () => this.testCount,
            };
            return eval(keyword) || '';
        }
        else if (this.RegExp.constReg.test(fullCommand)) {
            const keyword = (this.RegExp.constReg.exec(fullCommand) || [])[1];
            return ((_a = this.cached.get(keyword)) === null || _a === void 0 ? void 0 : _a.toString()) || '';
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
                throw new Error('cant find define of command: ' + command);
            const range = Array.isArray(testRange[0])
                ? testRange[Array.from(this.defineVar).findIndex((val) => val[0] == command[0])]
                : testRange;
            let result = '';
            if (define.dataType == 'char')
                result = this.getRandomCharacter(define.dataRange[0]);
            else if (define.dataType == 'number')
                result = this.getRandomInt((define.dataRange[1] - define.dataRange[0]) * range[0] + define.dataRange[0], (define.dataRange[1] - define.dataRange[0]) * range[1] + define.dataRange[0]) * (define.negative == true
                    ? Math.floor(Math.random()) == 0 ? 1 : -1
                    : 1);
            if (cache)
                this.cached.set(command[0], result);
            return ghost == true ? '' : result.toString();
        }
    }
    getRandomInt(min, max) {
        min = Math.floor(min);
        max = Math.ceil(max);
        if (min == max)
            return min;
        else
            return node_crypto_1.default.randomInt(min, max);
    }
    getRandomCharacter(str) {
        return str[node_crypto_1.default.randomInt(0, str.length - 1)];
    }
    largePush(src, dest) {
        for (let index of src) {
            dest.push(index);
        }
    }
    mkdir(directory) {
        let temp = '';
        for (let dir of directory.split('/').slice(0, -1)) {
            temp = node_path_1.default.join(temp, dir);
            if (!node_fs_1.default.existsSync(temp))
                node_fs_1.default.mkdirSync(temp);
        }
        return undefined;
    }
    zip_(sourceDir, outPath, ZipProgram) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (ZipProgram) {
                default:
                    console.log(`[ZIPPER] WARNING: Using default zip program: package (archiver ${package_json_1.default.dependencies.archiver})`);
                case 'package':
                    return yield this.zipDirectory(sourceDir, outPath);
                    break;
                case 'system':
                    switch (node_os_1.default.type()) {
                        case 'Linux':
                            yield this.exec(`zip -r temp.zip .`, sourceDir);
                            node_fs_1.default.copyFileSync(sourceDir + '/temp.zip', outPath);
                            node_fs_1.default.rmSync(sourceDir + '/temp.zip');
                            return undefined;
                            break;
                        default:
                            outPath = outPath.endsWith('.zip') ? outPath.slice(0, -'.zip'.length) : outPath;
                            return void (yield this.exec(`Compress-Archive -Path ${sourceDir} -DestinationPath ${outPath}`));
                            break;
                    }
                    break;
                case 'jar':
                    return void (yield this.exec(`jar -cMf ${outPath} -C ${sourceDir} ./`));
                    break;
            }
        });
    }
    zipDirectory(sourceDir, outPath) {
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const stream = node_fs_1.default.createWriteStream(outPath);
        return new Promise((resolve, reject) => {
            archive.directory(sourceDir, false);
            archive.on('error', (err) => { throw err; });
            archive.pipe(stream);
            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
    spawn(command, cwd, pipe) {
        return new Promise((resolve, reject) => {
            var _a, _b;
            const compileCommand = command.split(' ');
            const childSpawn = !!cwd ? node_child_process_1.default.spawn(compileCommand[0], compileCommand.slice(1), {
                cwd,
            }) : node_child_process_1.default.spawn(compileCommand[0], compileCommand.slice(1));
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
    exec(command, cwd, pipe) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d;
            const childExec = !!cwd ? node_child_process_1.default.exec(command, {
                cwd,
            }) : node_child_process_1.default.exec(command);
            if (pipe === null || pipe === void 0 ? void 0 : pipe.stdout)
                (_a = childExec.stdout) === null || _a === void 0 ? void 0 : _a.pipe(pipe.stdout);
            if (pipe === null || pipe === void 0 ? void 0 : pipe.stderr)
                (_b = childExec.stdout) === null || _b === void 0 ? void 0 : _b.pipe(pipe.stderr);
            let stdout = '';
            (_c = childExec.stdout) === null || _c === void 0 ? void 0 : _c.on('data', (chunk) => stdout += chunk + '\n');
            (_d = childExec.stderr) === null || _d === void 0 ? void 0 : _d.on('data', (chunk) => stdout += chunk + '\n');
            childExec.on('error', (err) => { throw err; });
            childExec.on('close', (code) => resolve({ code, stdout }));
        });
    }
}
exports.GenerateTest = GenerateTest;
