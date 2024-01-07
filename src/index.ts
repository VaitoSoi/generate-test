import process from "node:process";
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from "node:path";
import stream from "node:stream";
import _ from 'lodash';

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

    TestCode: string;
    MainCodePath?: string;
    Compiler?: string;
    CppVersion?: string;
    TestcasesPath: string;
    OJ_TestcasesPath?: string;
    TestcasesZip?: string;
    OJ_TestcasesZip?: string;
    IOFilename?: string;
    Zip_Program?: string;
}

export class GenerateTest {
    private testCount: number = 0;
    private testRange: TestRange[] = [];
    private testCode: string = '';

    private temp: any;
    private RegExp = {
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
    private cached: Map<string, DataType> = new Map();
    private defineVar: Map<string, DefineVariable> = new Map();

    private MainCodePath?: string = '';
    private IOFilename: string = '';
    private Compiler: string = '';
    private CppVersion: string = '';
    private TestcasesPath: string = '';
    private OJ_TestcasesPath?: string = '';
    private TestcasesZip?: string = '';
    private OJ_TestcasesZip?: string = '';
    private Zip_Program: string = '';

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
        this.IOFilename = config.IOFilename || 'TEST'
        this.Compiler = config.Compiler || 'g++'
        this.CppVersion = config.CppVersion || 'c++17'
        this.TestcasesPath = config.TestcasesPath
        this.TestcasesZip = config.TestcasesZip
        this.OJ_TestcasesPath = config.OJ_TestcasesPath
        this.OJ_TestcasesZip = config.OJ_TestcasesZip
        this.Zip_Program = config.Zip_Program || 'package'
    }
    public async generate(): Promise<void> {
        const dirContents = fs.readdirSync(path.join(__dirname, '..', this.TestcasesPath))
        dirContents.forEach((val) => fs.rmSync(path.join(__dirname, '..', this.TestcasesPath, val), { recursive: true, force: true }))

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
            let result: string[][] = [];
            while (true) {
                result = [];

                for (let [ind, line] of commandLines.entries()) {
                    const isArray =
                        this.RegExp.arrayReg_1.test(line) ||
                        this.RegExp.arrayReg_2.test(line)
                    const range = Array.isArray(config.range[0]) ? (config.range as TestDataRange[])[ind] : config.range as TestDataRange

                    if (isArray) result.push(...this.parseArray(line, range))
                    else result.push(this.parseLine(line, range))
                }

                const func = config.func
                if (!func) break
                else {
                    const test = result.map(val => val.join(' ')).join('\n')
                    const res = await Promise.resolve(func(test))

                    if (res == true) break;
                }
            }
            if (!fs.existsSync(path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`)))
                fs.mkdirSync(path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`))
            fs.writeFileSync(
                path.join(__dirname, '..', this.TestcasesPath, `TEST_${index + 1}`, `${this.IOFilename}.INP`),
                result.map(val => val.join(' ')).join('\n'),
                { encoding: 'utf-8' }
            )

            const usageRamRaw = process.memoryUsage()
            const usageRam = {
                heapUsed: (usageRamRaw.heapUsed / 1024 / 1024).toFixed(3),
                heapTotal: (usageRamRaw.heapTotal / 1024 / 1024).toFixed(3),
                external: (usageRamRaw.external / 1024 / 1024).toFixed(3),
                arrayBuffers: (usageRamRaw.arrayBuffers / 1024 / 1024).toFixed(3)
            }
            console.log(`[RAM_REPORT] [TEST_${index + 1}] V8: ${usageRam.heapUsed}/${usageRam.heapTotal} (MB) | C++: ${usageRam.external} (MB) | ArrayBuffers: ${usageRam.arrayBuffers} (MB)`)
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
    private parseArray(command: string, testRange: TestDataRange): string[][] {
        let result: string[][] = [];

        const array =
            this.RegExp.arrayReg_2.exec(command) ||
            this.RegExp.arrayReg_1.exec(command) ||
            [];
        const commands: string[] = array[1].split(' ');
        const [column, row] =
            (
                this.RegExp.arrayReg_2.test(command)
                    ? [array[2], array[3]]
                    : [1, array[2]]
            )
                .map((val) => this.cached.get(val.toString()) || val)
                .map(Number)

        for (let i = 0; i < column; i++) {
            const seq = this.RegExp.seqReg.test(command)
            const revSeq = this.RegExp.revSegReg.test(command)

            let line: string[] = []
            if (seq == true) {
                const seqExec = this.RegExp.seqReg.exec(command) || []
                for (let j = 0; j < row; j++) {
                    const begin = this.temp.lastItem || seqExec[1];
                    const end = this.cached.get(seqExec[2]) ? j / row * Number(this.cached.get(seqExec[2])) : Number(seqExec[2]);
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line.push(generated)
                }
            } else if (revSeq == true) {
                const seqExec = this.RegExp.revSegReg.exec(command) || []
                for (let j = 0; j < row; j++) {
                    const begin = this.cached.get(seqExec[2]) ? (row - j + 1) / row * Number(this.cached.get(seqExec[2])) : Number(seqExec[2]);
                    const end = this.temp.lastItem || seqExec[1];
                    const generated = this.parseCommand(`[${begin} - ${end}]`, testRange);
                    this.temp.lastItem = generated;
                    line.push(generated)
                }
            } else
                for (let j = 0; j < row; j++)
                    for (let command of commands)
                        line.push(...this.parseLine(command, testRange))

            result.push(line);
        }

        return result
    }
    private parseLine(line: string, testRange: TestDataRange): string[] {
        const commands: string[] = line.split(';');
        let result: string[] = [];

        for (let command of commands)
            result.push(this.parseCommand(command, testRange));

        return result;
    }
    private parseCommand(fullCommand: string, testRange: TestDataRange): string {
        fullCommand = fullCommand.trim();
        if (fullCommand == '') return '';

        if (this.RegExp.constReg.test(fullCommand)) {
            const keyword = (this.RegExp.constReg.exec(fullCommand) || [])[1];
            return this.cached.get(keyword)?.toString() || '';
        } else if (this.RegExp.valueReg.test(fullCommand)) {
            const keyword = (this.RegExp.valueReg.exec(fullCommand) || [])[1];
            return eval(keyword) || '';
        } else if (this.RegExp.rangeReg.test(fullCommand)) {
            const line = this.RegExp.rangeReg.exec(fullCommand) || [];

            const [start, end] = [this.cached.get(line[1]) || line[1], this.cached.get(line[2]) || line[2]].map(Number)

            return this.getRandomInt(start, end).toString();
        } else {
            let command = fullCommand.split(' ');

            let ghost: boolean = command.includes('ghost'),
                cache: boolean = command.includes('const');
            [ghost, cache]
                .filter(val => val == true)
                .forEach(() => void command.shift());
            const define = this.defineVar.get(command[0]);
            // console.log({ command, define, testRange })

            if (!define) throw new Error('Cant find define of command: ' + command)

            let result: DataType = '';
            if (define.dataType == 'char') result = this.getRandomCharacter(define.dataRange[0])
            else if (define.dataType == 'number') result = this.getRandomInt(
                (define.dataRange[1] - define.dataRange[0]) * testRange[0] + define.dataRange[0],
                (define.dataRange[1] - define.dataRange[0]) * testRange[1] + define.dataRange[0]
            ) * (
                    define.negative == true
                        ? Math.floor(Math.random()) == 0 ? 1 : -1
                        : 1
                );

            if (cache) this.cached.set(command[0], result)
            return ghost == true ? '' : result.toString();
        }
    }

    public getRandomInt(min: number, max: number): number {
        min = Math.floor(min);
        max = Math.floor(max);
        return crypto.randomInt(min, max);
    }
    public getRandomCharacter(str: string): string {
        return str[crypto.randomInt(0, str.length - 1)];
    }
}