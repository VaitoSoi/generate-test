import * as process from "node:process";
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from "node:path";
import * as os from 'node:os'
import * as child_process from 'node:child_process';
import * as stream from 'node:stream'
import ms from 'ms'
import archiver from "archiver";
import package_json from "../package.json"

export type Awaitable<T> = T | PromiseLike<T>
export type Executable<Param extends any[] = [], Callback extends any = void> = (...args: Param) => Awaitable<Callback>
export type DataType_ =
    | 'number'
    | 'char'
export type DataType =
    | number
    | string
export type DataRange<Param_1 extends DataType = number, Param_2 extends DataType = number> = [Param_1, Param_2]
export interface DefineVariable<R1 extends DataType = any, R2 extends DataType = any> {
    // keyword: string;
    dataType: DataType_;
    dataRange: DataRange<R1, R2>;
    negative: boolean;
}
export type TestDataRange = DataRange<number, number>
export interface TestRange {
    range: DataRange<number, number> | DataRange<number, number>[],
    count: number,
    func?: Executable<[val: string, ...param: any[]], boolean>;
}
export interface TestConfig {
    range: TestRange
    testcasePath: string;
    ojPath: string;
}
export interface GTOptions {
    TestCount: number;
    TestRange: TestRange[];

    IOFilename: string;
    TestCode: string;
    MainCodePath: string | null;
    Compiler: string | null;
    CppVersion: string | null;
    TestcasesPath: string;
    OJ_TestcasesPath: string | null;
    TestcasesZipPath: string | null;
    OJ_TestcasesZipPath: string | null;
    Zip_Program: string | null;
}
export interface ReportArray {
    id: number;
    memoryUsage: NodeJS.MemoryUsage;
    time: number;
}

export class GenerateTest {
    private testCount: number = 0;
    private testRange: TestRange[] = [];
    private testCode: string = '';

    private temp: any = {};
    private RegExp = {
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
    private cached: Map<string, DataType> = new Map();
    private defineVar: Map<string, DefineVariable> = new Map();

    private MainCodePath: string | null = null;
    private IOFilename: string = '';
    private Compiler: string | null = null;
    private CppVersion: string | null = null;
    private TestcasesPath: string = '';
    private OJ_TestcasesPath?: string | null = null;
    private TestcasesZipPath?: string | null = null;
    private OJ_TestcasesZipPath?: string | null = null;
    private Zip_Program: string | null = null;

    constructor(config?: GTOptions) {
        if (config) this.setConfig(config);
    }

    public setConfig(config: GTOptions) {
        this.testCount = config.TestCount;
        this.testRange = config.TestRange
            .map((val: TestRange): TestRange => {
                const cond = val.count < 1 && val.count > 0
                if (cond == true) return { range: val.range, count: val.count * this.testCount, func: val.func }
                else return val;
            });
        this.parseCode(config.TestCode)

        this.MainCodePath = config.MainCodePath
        this.IOFilename = config.IOFilename
        this.Compiler = config.Compiler || 'g++'
        this.CppVersion = config.CppVersion || 'c++17'
        this.TestcasesPath = config.TestcasesPath
        this.TestcasesZipPath = config.TestcasesZipPath
        this.OJ_TestcasesPath = config.OJ_TestcasesPath
        this.OJ_TestcasesZipPath = config.OJ_TestcasesZipPath
        this.Zip_Program = config.Zip_Program
    }
    set setTestCount(count: number) {
        this.testCount = count
    }
    public async generate(): Promise<ReportArray[]> {
        let report: ReportArray[] = []
        const testcasesPath: string = path.join(__dirname, '..', this.TestcasesPath)
        this.mkdir(testcasesPath)

        const dirContents = fs.readdirSync(testcasesPath)
        dirContents.forEach((val) => fs.rmSync(path.join(testcasesPath, val), { recursive: true, force: true }))

        const configs: TestRange[] = Array(this.testCount).fill(null).map((val, index) => {
            let lastIndex: { index: number, count: number } = { index: -1, count: 0 };
            const config = this.testRange.find((val, ind) => {
                if (lastIndex.index != ind) {
                    lastIndex.count += val.count;
                    lastIndex.index = ind;
                }
                return index + 1 <= lastIndex.count;
            })
            if (!config) throw new Error(`Cant find config for test ${index}`)
            return config
        })

        const commandLines = this.testCode.split('\n')

        for (let [index, config] of configs.entries()) {
            this.temp = {}
            this.temp.currentTest = index

            if (!fs.existsSync(path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`)))
                fs.mkdirSync(path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`))
            // const writeStream = fs.createWriteStream(
            //     path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`),
            //     { encoding: 'utf-8', flags: 'w' }
            // )

            let result: string[] = [];
            let timeStart = Date.now()
            while (true) {
                result = [];

                for (let [ind, line] of commandLines.entries()) {
                    const isArray =
                        this.RegExp.arrayReg_1.test(line) ||
                        this.RegExp.arrayReg_2.test(line) ||
                        this.RegExp.arrayReg_3.test(line) ||
                        this.RegExp.arrayReg_4.test(line)
                    const range = config.range

                    // let writeCb: boolean;

                    if (isArray)
                        this.largePush(this.parseArray(line, range), result)
                    // writeCb = writeStream.write(this.parseArray(line, range).join(' ') + '\n')
                    else
                        result.push(this.parseLine(line, range).join(' '))
                    // writeCb = writeStream.write(this.parseLine(line, range).join(' ') + '\n')
                }

                const func = config.func
                if (!func || typeof func != 'function') break
                else {
                    const test = result.join('\n')
                    const res = await Promise.resolve(func(test, { currentTest: index, testCount: this.testCount }))

                    if (res == true) break;
                }
                console.log(`[REGENERATE] [TEST_${index + 1}] Regenerating...`)
            }
            let time = Date.now() - timeStart;
            fs.writeFileSync(
                path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`),
                result
                    .filter((val) => val.trim() != '')
                    .join('\n'),
                { encoding: 'utf-8' }
            )

            const usageRamRaw = process.memoryUsage()
            const usageRam = {
                heapUsed: (usageRamRaw.heapUsed / 1024 / 1024).toFixed(3),
                heapTotal: (usageRamRaw.heapTotal / 1024 / 1024).toFixed(3),
                external: (usageRamRaw.external / 1024 / 1024).toFixed(3),
                arrayBuffers: (usageRamRaw.arrayBuffers / 1024 / 1024).toFixed(3),
                rss: (usageRamRaw.rss / 1024 / 1024).toFixed(3)
            }
            report.push({
                id: index,
                memoryUsage: usageRamRaw,
                time
            })
            console.log(`[REPORT] [TEST_${index + 1}] Time: ${ms(time)} | Total: ${usageRam.rss} (MB) | V8: ${usageRam.heapUsed}/${usageRam.heapTotal} (MB) | C++: ${usageRam.external} (MB) | ArrayBuffers: ${usageRam.arrayBuffers} (MB)`)

            if (global.gc) global.gc();
        }

        return report
    }
    public async runFile() {
        if (!!this.OJ_TestcasesPath)
            fs.readdirSync(this.OJ_TestcasesPath)
                .forEach(file => fs.unlinkSync(path.join(this.OJ_TestcasesPath as string, file)))

        if (!this.MainCodePath) throw new Error("MainCodePath is undefined")

        const binaryFile =
            os.platform() == 'win32'
                ? 'main.exe'
                : 'main.out'
        const binaryFilePath =
            os.platform() == 'win32'
                ? 'main.exe'
                : './main.out'
        let paths = {
            cwd: this.MainCodePath.split(/(\/|\\)/gi),
            testcases: path.join(__dirname, '..', this.TestcasesPath),
            testcasesZip: !!this.TestcasesZipPath ? path.join(__dirname, '..', this.TestcasesZipPath) : undefined,
            oj: !!this.OJ_TestcasesPath ? path.join(__dirname, '..', this.OJ_TestcasesPath) : undefined,
            ojZip: !!this.OJ_TestcasesZipPath ? path.join(__dirname, '..', this.OJ_TestcasesZipPath) : undefined,
        }
        if (!!paths.testcases) this.mkdir(paths.testcases)
        if (!!paths.testcasesZip) this.mkdir(paths.testcasesZip)
        if (!!paths.oj) this.mkdir(paths.oj)
        if (!!paths.ojZip) this.mkdir(paths.ojZip)

        const compileCommand = `${this.Compiler} -std=${this.CppVersion} -Wall -Wextra -Wpedantic -Wunused-variable -Wtype-limits -o ${binaryFile} ${paths.cwd.pop()}`

        console.log(`[COMPILER] Compiling....`)
        console.log(`\t----- Live logging from compiler ----`)
        console.log(`> ${compileCommand}`)
        const execCb = await this.exec(compileCommand, paths.cwd.join('/'), { stdout: process.stdout, stderr: process.stderr })
        console.log(`\n\t-------------------------------------`)
        if (execCb.code != 0) throw new Error(`compiler throw code ${execCb.code}`)

        for (let index = 0; index < this.testCount; index++) {
            const binaryPath = paths.cwd,
                testcase = path.join(paths.testcases, `TEST_${index + 1}`),
                oj = paths.oj

            if (fs.existsSync(path.join(testcase, binaryFile))) fs.unlinkSync(path.join(testcase, binaryFile))
            fs.copyFileSync(path.join(...binaryPath, binaryFile), path.join(testcase, binaryFile))

            const startTime = Date.now();
            const execCb = await this.exec(binaryFilePath, testcase);
            const execTime = Date.now() - startTime;
            if (execCb.code != 0) {
                console.log(execCb.stdout)
                // console.log({ binaryPath, testcase })
                throw new Error(`binary file throw code ${execCb.code} at test ${index + 1}`)
            }

            if (!fs.existsSync(path.join(testcase, `${this.IOFilename}.OUT`))) throw new Error(`cant find output file at test ${index + 1}`)
            if (!!oj) {
                fs.copyFileSync(path.join(testcase, `${this.IOFilename}.INP`), path.join(oj, `${this.IOFilename}_${index + 1}.INP`))
                fs.copyFileSync(path.join(testcase, `${this.IOFilename}.OUT`), path.join(oj, `${this.IOFilename}_${index + 1}.OUT`))
            }

            console.log(`[EXEC_FILE] [TEST_${index + 1}] Time: ${ms(execTime)}`)
        }
    }
    public async zip(config: { oj: boolean } = { oj: true }) {
        let paths = {
            testcases: path.join(__dirname, '..', this.TestcasesPath),
            testcasesZip: !!this.TestcasesZipPath ? path.join(__dirname, '..', this.TestcasesZipPath) : undefined,
            oj: !!this.OJ_TestcasesPath ? path.join(__dirname, '..', this.OJ_TestcasesPath) : undefined,
            ojZip: !!this.OJ_TestcasesZipPath ? path.join(__dirname, '..', this.OJ_TestcasesZipPath) : undefined,
        }

        if (paths.testcasesZip) {
            console.log(`[ZIPPER] Zipping testcases...`)
            await this.zip_(paths.testcases, paths.testcasesZip, this.Zip_Program)
            console.log(`[ZIPPER] Done`)
        }
        if (paths.oj && paths.ojZip && config.oj == true) {
            console.log(`[ZIPPER] Zipping testcases (OJ format)...`)
            await this.zip_(paths.oj, paths.ojZip, this.Zip_Program)
            console.log(`[ZIPPER] Done`)
        }
    }

    private parseCode(loadCode: string): void {
        const [header, code] = loadCode.split(/-{5,}/)

        this.parseHeader(header);
        this.testCode = code.replace(/\t/gi, '').trim();
    }
    private parseHeader(header: string): void {
        header = header.replace(/\t/gi, '');
        const defineList = header.split('\n');

        for (let line of defineList) {
            const parameter = line.split(' ');
            const keyword: string = parameter[0];
            const dataType: DataType_ = parameter[1] as any;
            const dataRange: DataRange<any, any> =
                dataType == 'char'
                    ? [parameter[2] + (parameter.length == 4 ? ' ' : ''), '']
                    : [parameter[2], parameter[3]].map(Number) as DataRange<number, number>;
            const negative: boolean =
                dataType == 'char'
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
    private parseArray(command: string, testRange: TestDataRange | TestDataRange[]): string[] {
        let result: string[] = [];

        const args =
            this.RegExp.arrayReg_4.exec(command) ||
            this.RegExp.arrayReg_3.exec(command) ||
            this.RegExp.arrayReg_2.exec(command) ||
            this.RegExp.arrayReg_1.exec(command) ||
            [];
        const [column, row] =
            (
                this.RegExp.arrayReg_4.test(command) || this.RegExp.arrayReg_3.test(command) || this.RegExp.arrayReg_2.test(command)
                    ? [args[2], args[3]]
                    : [args[2], 1]
            )
                .map((val) => this.cached.get(val.toString()) || val)
                .map(Number)
        const join =
            this.RegExp.arrayReg_4.test(command)
                ? args[4]
                : ''

        for (let i = 0; i < column; i++) {
            const seq = this.RegExp.seqReg.test(args[1])
            const revSeq = this.RegExp.revSegReg.test(args[1])

            let line: string = ''
            if (seq == true) {
                const seqExec = this.RegExp.seqReg.exec(args[1]) || []
                for (let j = 0; j < row; j++) {
                    const begin = this.temp.lastItem || seqExec[1];
                    const end = this.cached.get(seqExec[2]) ? (j + 1) / row * Number(this.cached.get(seqExec[2])) : seqExec[2];
                    // console.log({ begin, end, cache: this.cached })
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line += generated + join;
                }
            } else if (revSeq == true) {
                const seqExec = this.RegExp.revSegReg.exec(args[1]) || []
                for (let j = 0; j < row; j++) {
                    const begin = this.cached.get(seqExec[2]) ? (row - j + 1) / row * Number(this.cached.get(seqExec[2])) : seqExec[2];
                    const end = this.temp.lastItem || seqExec[2];
                    // console.log({ begin, end, cache: this.cached })
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line += generated + join;
                }
            } else
                for (let j = 0; j < row; j++)
                    line += this.parseLine(args[1], testRange).join(' ') + join

            result.push(line);
            // console.log({ line, result })
        }

        return result
    }
    private parseLine(line: string, testRange: TestDataRange | TestDataRange[]): string[] {
        let result: string[] = [];
        let commands: string[] = line.split(';').map((val) => val.trim());
        for (let start = 0; start < commands.length; start++) {
            if (commands[start].includes('{') && !commands[start].includes('}'))
                for (let end = start + 1; end < commands.length; end++)
                    if (commands[end].includes('}')) {
                        commands.splice(start, end + 1, commands.slice(start, end + 1).join('; '))
                        break;
                    }
        }

        for (let command of commands)
            result.push(this.parseCommand(command, testRange));

        return result;
    }
    public parseCommand(fullCommand: string, testRange: TestDataRange | TestDataRange[]): string {
        // console.log({ fullCommand })

        fullCommand = fullCommand.trim();
        if (fullCommand == '') return '';

        if (this.RegExp.minOfDefine.test(fullCommand)) {
            const minODExec = this.RegExp.minOfDefine.exec(fullCommand) || []
            const define = this.defineVar.get(minODExec[1])
            if (!define) throw new Error('cant find define of command: ' + minODExec[1])
            const range = Array.isArray(testRange[0])
                ? (testRange as TestDataRange[])[Array.from(this.defineVar).findIndex((val) => val[0] == minODExec[1])]
                : testRange as TestDataRange

            return (define.dataRange[1] - define.dataRange[0]) * range[0] + define.dataRange[0]
        } else if (this.RegExp.maxOfDefine.test(fullCommand)) {
            const maxODExec = this.RegExp.maxOfDefine.exec(fullCommand) || []
            const define = this.defineVar.get(maxODExec[1])
            if (!define) throw new Error('cant find define of command: ' + maxODExec[1])
            const range = Array.isArray(testRange[0])
                ? (testRange as TestDataRange[])[Array.from(this.defineVar).findIndex((val) => val[0] == maxODExec[1])]
                : testRange as TestDataRange

            return (define.dataRange[1] - define.dataRange[0]) * range[1] + define.dataRange[0]
        } else if (this.RegExp.assignReg.test(fullCommand)) {
            const assignExec = this.RegExp.assignReg.exec(fullCommand) || [];
            const keyword = assignExec[1];
            const command = assignExec[2];

            const value = this.parseCommand(command, testRange);

            this.cached.set(keyword, value)

            return value

        } else if (this.RegExp.rangeReg.test(fullCommand)) {
            const line = this.RegExp.rangeReg.exec(fullCommand) || [];

            let [start, end] = [this.cached.get(line[1]) || line[1], this.cached.get(line[2]) || line[2]].map(String) as [any, any]
            if (this.RegExp.function.test(start) || this.RegExp.valueReg.test(start)) start = this.parseCommand(start, testRange);
            if (this.RegExp.function.test(end) || this.RegExp.valueReg.test(end)) end = this.parseCommand(end, testRange);

            // console.log({ start, end });
            [start, end] = [start, end].map(Number)

            return this.getRandomInt(start, end).toString();
        } else if (this.RegExp.valueReg.test(fullCommand)) {
            const keyword = (this.RegExp.valueReg.exec(fullCommand) || [])[1];
            const user: Record<string, (...param: any[]) => any> = {
                max: (define) => this.parseCommand(`max(${define})`, testRange),
                min: (define) => this.parseCommand(`min(${define})`, testRange),
                get: (define) => this.cached.get(define),
                set: (define, value) => this.cached.set(define, value),
                cmd: (command) => {
                    const isArray =
                        this.RegExp.arrayReg_1.test(command) ||
                        this.RegExp.arrayReg_2.test(command) ||
                        this.RegExp.arrayReg_3.test(command) ||
                        this.RegExp.arrayReg_4.test(command)
                    if (isArray) return this.parseArray(command, testRange).join('\n')
                    else return this.parseLine(command, testRange)
                },
                current: () => this.temp.currentTest,
                total: () => this.testCount,
            }
            return eval(keyword) || '';
        } else if (this.RegExp.constReg.test(fullCommand)) {
            const keyword = (this.RegExp.constReg.exec(fullCommand) || [])[1];
            return this.cached.get(keyword)?.toString() || '';
        } else {

            let command = fullCommand.split(' ');

            const ghost: boolean = command.includes('ghost'),
                cache: boolean = command.includes('const');
            [ghost, cache]
                .filter(val => val == true)
                .forEach(() => void command.shift());
            const define = this.defineVar.get(command[0]);
            // console.log({ command, define, testRange })

            if (!define) throw new Error('cant find define of command: ' + command)
            const range = Array.isArray(testRange[0])
                ? (testRange as TestDataRange[])[Array.from(this.defineVar).findIndex((val) => val[0] == command[0])]
                : testRange as TestDataRange

            let result: DataType = '';
            if (define.dataType == 'char') result = this.getRandomCharacter(define.dataRange[0])
            else if (define.dataType == 'number') result = this.getRandomInt(
                (define.dataRange[1] - define.dataRange[0]) * range[0] + define.dataRange[0],
                (define.dataRange[1] - define.dataRange[0]) * range[1] + define.dataRange[0]
            ) * (
                    define.negative == true
                        ? Math.floor(Math.random()) == 0 ? 1 : -1
                        : 1
                );

            if (cache) this.cached.set(command[0], result)
            return !!ghost ? '' : result.toString();
        }
    }

    public getRandomInt(min: number, max: number): number {
        min = Math.floor(min);
        max = Math.ceil(max);
        if (min == max) return min
        else return crypto.randomInt(min, max);
    }
    public getRandomCharacter(str: string): string {
        return str[crypto.randomInt(0, str.length - 1)];
    }

    private largePush(src: any[], dest: any[]): void {
        for (let index of src) {
            dest.push(index)
        }
    }
    private mkdir(directory: string) {
        let temp: string = '';
        for (let dir of directory.split('/').slice(0, -1)) {
            temp = path.join(temp, dir)
            if (!fs.existsSync(temp)) fs.mkdirSync(temp)
        }
        return undefined
    }
    private async zip_(sourceDir: string, outPath: string, ZipProgram: string | null): Promise<void> {
        switch (ZipProgram) {
            default:
                console.log(`[ZIPPER] WARNING: Using default zip program: package (archiver ${package_json.dependencies.archiver})`)
            case 'package':
                return await this.zipDirectory(sourceDir, outPath)
                break;
            case 'system':
                switch (os.type()) {
                    case 'Linux':
                        await this.exec(`zip -r temp.zip .`, sourceDir)
                        fs.copyFileSync(sourceDir + '/temp.zip', outPath)
                        fs.rmSync(sourceDir + '/temp.zip')
                        return undefined
                        break;
                    default:
                        outPath = outPath.endsWith('.zip') ? outPath.slice(0, - '.zip'.length) : outPath
                        return void await this.exec(`Compress-Archive -Path ${sourceDir} -DestinationPath ${outPath}`)
                        break;
                }
                break;
            case 'jar':
                return void await this.exec(`jar -cMf ${outPath} -C ${sourceDir} ./`)
                break;
        }

    }
    private zipDirectory(sourceDir: string, outPath: string): Promise<void> {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);

        return new Promise((resolve, reject) => {
            archive.directory(sourceDir, false);
            archive.on('error', (err) => { throw err });
            archive.pipe(stream);

            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
    private spawn(command: string, cwd?: string, pipe?: { stdout?: stream.Writable, stderr?: stream.Writable }): Promise<{ code: number | null, stdout: string }> {
        return new Promise((resolve, reject) => {
            const compileCommand = command.split(' ')
            const childSpawn = !!cwd ? child_process.spawn(compileCommand[0], compileCommand.slice(1), {
                cwd,
            }) : child_process.spawn(compileCommand[0], compileCommand.slice(1))
            if (pipe?.stdout) childSpawn.stdout?.pipe(pipe.stdout)
            if (pipe?.stderr) childSpawn.stdout?.pipe(pipe.stderr)

            let stdout: string = ''
            childSpawn.stdout.on('data', (chunk) => stdout += chunk + '\n')
            childSpawn.stderr.on('data', (chunk) => stdout += chunk + '\n')

            childSpawn.on('error', (err) => { throw err })
            childSpawn.on('close', (code) => resolve({ code, stdout }))
        })
    }
    private exec(command: string, cwd?: string, pipe?: { stdout?: stream.Writable, stderr?: stream.Writable }): Promise<{ code: number | null, stdout: string }> {
        return new Promise((resolve, reject) => {
            const childExec = !!cwd ? child_process.exec(command, {
                cwd,
            }) : child_process.exec(command)
            if (pipe?.stdout) childExec.stdout?.pipe(pipe.stdout)
            if (pipe?.stderr) childExec.stdout?.pipe(pipe.stderr)

            let stdout: string = ''
            childExec.stdout?.on('data', (chunk) => stdout += chunk + '\n')
            childExec.stderr?.on('data', (chunk) => stdout += chunk + '\n')

            childExec.on('error', (err) => { throw err })
            childExec.on('close', (code) => resolve({ code, stdout }))
        })
    }
}