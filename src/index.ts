import process from "node:process";
import crypto from 'node:crypto';
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
export type TestConfigRange = DataRange<number, number>
export interface TestConfig {
    range: TestConfigRange | TestConfigRange[],
    count: number,
    func?: Executable<[val: string, ...param: any[]], boolean>;
}
export interface GTOptions {
    testCount: number;
    testConfig: TestConfig[]
}

export class GenerateTest {
    private testCount: number = 0;
    private testConfig: TestConfig[] = [];
    private temp: any;
    private RegExp = {
        arrayReg_1: /^\[(.+), (.+)\]$/,
        arrayReg_2: /^\[(.+), (.+) - (.+)$/,
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

    constructor(config?: GTOptions) {
        if (config) this.setConfig(config);
    }

    public setConfig(config: GTOptions) {
        this.testCount = config.testCount;
        this.testConfig = config.testConfig
            .map((val: TestConfig): TestConfig => {
                const cond = val.count < 1 && val.count > -1
                if (cond == true) return { range: val.range, count: val.count * this.testCount, func: val.func }
                else return val;
            });
    }

    public getRandomInt(min: number, max: number): number {
        min = Math.floor(min);
        max = Math.floor(max);
        return crypto.randomInt(min, max);
    }
    public getRandomCharacter(str: string): string {
        return str[crypto.randomInt(0, str.length - 1)];
    }

    private async parseHeader(header: string): Promise<void> {
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
    private parseArray(command: string, testRange: TestConfigRange): string[][] {
        let result: string[][] = [];

        const array =
            this.RegExp.arrayReg_1.exec(command) ||
            this.RegExp.arrayReg_2.exec(command) ||
            [];
        const commands: string = array[1];
        const [row, column] =
            (this.RegExp.arrayReg_1.test(command)
                ? [1, array[2]]
                : [array[2], array[3]]).map(Number)

        for (let i = 0; i < column; i++) 
            for (let j = 0; j < row; j++)
                result.push(this.parseLine(commands, testRange));    

        return result
    }
    private parseLine(line: string, testRange: TestConfigRange): string[] {
        const commands: string[] = line.split(';');
        let result: string[] = [];

        for (let command of commands)
            result.push(this.parseCommand(command, testRange));

        return result;
    }
    private parseCommand(fullCommand: string, testRange: TestConfigRange): string {
        fullCommand = fullCommand.trim();

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
            [ghost, cache].filter(val => val == true)
                .forEach(() => void command.shift());
            const define = this.defineVar.get(command[0]);

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
}