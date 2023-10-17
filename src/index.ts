import process from "node:process";

export type Awaitable<T> = T | PromiseLike<T>
export type Executable<Param extends any[] = [], Callback extends any = void> = (...args: Param) => Awaitable<Callback>
export type DataType =
    | 'number'
    | 'string'
    | 'boolean'
    | 'char'
export type DataType_ =
    | number
    | string
    | boolean
export type DataRange<Param_1 extends any = number, Param_2 extends any = number> = [Param_1, Param_2]
export interface DefinedType {
    keyword: string;
    dataType: DataType;
    dataRange: DataRange<any, any>;
    negative: boolean;
}
export type TestConfigRange = DataRange<number, number>
export interface TestConfig {
    range: TestConfigRange | TestConfigRange[],
    count: number,
    func?: Executable<[val: string], boolean>;
}
export interface GTConfig {
    testCount: number;
    testConfig: TestConfig[]
}

export class GenerateTest {
    private testCount: number = 10;
    private testConfig: TestConfig[] = [{ range: [0, 1], count: this.testCount }]

    constructor(config?: GTConfig) { if (config) this.setConfig(config) }

    public setConfig(config: GTConfig) {
        this.testCount = config.testCount
        this.testConfig = config.testConfig
            .map((val): TestConfig => {
                const cond = val.count < 1 && val.count > -1
                if (cond == true) return { range: val.range, count: val.count * this.testCount, func: val.func }
                else return val
            })
    }

    public async generate(testConfig: string, config?: {
        pushTest: boolean,
        logMem?: boolean,
        config?: GTConfig,
        func?: Executable<[index: number, data: string], void>
    }): Promise<any[]> {
        testConfig = testConfig.replace(/\t/gi, '')
        const testConfig_array = testConfig.split(/-{5,}/).map((str) => str.replace(/\t/gi, '')),
            declares = testConfig_array[0].split('\n'),
            commands = testConfig_array[1].split('\n'),
            arrayReg_1 = /^\[(.+), (.+)\]$/,
            arrayReg_2 = /^\[(.+), (.+) - (.+), "(.+)"\]$/,
            constReg = /\[(.+)\]/,
            rangeReg = /\[(.+) - (.+)\]/
        let defined: DefinedType[] = [],
            test: DataType_[][][] = [];
        for (let i in declares) {
            if (declares[i] == '') continue;
            const declare = declares[i].split(' ')
            defined.push({
                keyword: declare[0],
                dataType: <DataType>declare[1],
                dataRange: <DataRange<number, string>>[
                    declare[1] == 'char'
                        ? declare[2]
                        : Math.abs(Number(declare[2])) == Number(declare[3])
                            ? 0
                            : Number(declare[2]),
                    declare[3] || '0'
                ],
                negative: (Number(declare[2]) < 0 || Number(declare[3]) < 0),
            })
        }
        let promise: Promise<void>[] = []
        for (let i = 0; i < this.testCount; i++) promise.push(new Promise(async (resolve) => {
            let const_arr: { keyword: string, value: number | string | boolean }[] = []
            let prePush: DataType_[][] = []
            let join: string = ' ';
            let lastCount: any = { i: -1, count: 0 };
            const dataSet = this.testConfig.find((val, ind) => {
                if (lastCount.i != ind) {
                    lastCount.count += val.count
                    lastCount.i = ind
                }
                return i + 1 <= lastCount.count
            })
            lastCount = null
            if (!dataSet) throw new Error(`cant find testConfig at test ${i}`)
            const findFunc = (val: string) => const_arr.find(def => def.keyword == val)
            const func = () => new Promise<void>(async (resolve) => {
                for (let ind in commands) {
                    const cmd = commands[ind]
                    const cmds = cmd.split('; ');
                    let line: DataType_[][] = [];
                    let line_: DataType_[] = []
                    let promise: Promise<void>[] = [];
                    if (arrayReg_1.test(cmd) || arrayReg_2.test(cmd)) {
                        const type = arrayReg_2.test(cmd) ? 1 : 0
                        const exec = type == 0 ? arrayReg_1.exec(cmd) : arrayReg_2.exec(cmd)
                        if (!exec) throw new Error('unknown format');

                        join = type == 0 ? exec[3] : exec[4]

                        let range: any[] = dataSet.range
                        range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == exec[1])] : range
                        const it = (): number => {
                            const find = findFunc(exec[2])
                            if (!find) return Number(exec[2])
                            else
                                if (typeof find.value == 'number') return find.value
                                else throw new Error(`wrong const data type at line ${ind}`)
                        }
                        for (let i = 0; i < it(); i++) promise.push(
                            new Promise<void>((resolve) => {
                                let line_: DataType_[] = []
                                let promise: Promise<void>[] = []
                                const it = (type == 1 ? ((): number => {
                                    const find = findFunc(exec[3])
                                    if (!find) return Number(exec[3])
                                    else
                                        if (typeof find.value == 'number') return find.value
                                        else throw new Error(`wrong const data type at line ${ind}`)
                                })() : 1)
                                for (let j = 0; j < it; j++) promise.push(
                                    new Promise<void>(async (resolve) => {
                                        const cmd = exec[1].split('; ')
                                        let promises: Promise<void>[] = []
                                        for (let k = 0; k < cmd.length; k++) promise.push(new Promise((resolve) => {
                                            if (rangeReg.test(cmd[k])) {
                                                const exec = rangeReg.exec(cmd[k])
                                                if (!exec) throw new Error('unknown format');
                                                const find1 = findFunc(exec[1]) || { value: exec[1] }
                                                const find2 = findFunc(exec[2]) || { value: exec[2] }
                                                line_.push(this.getRandomInt(Number(find1.value), Number(find2.value)))
                                            } else if (constReg.test(cmd[k])) {
                                                const exec = constReg.exec(cmd[k])
                                                if (!exec) throw new Error('unknown format');
                                                const find = findFunc(exec[1])
                                                if (!find) throw new Error(`cant find const with name '${exec[1]}' at line ${ind}`)
                                                else line_.push(find.value)
                                            } else {
                                                const find = defined.find(def => def.keyword == cmd[k])
                                                if (!find) throw new Error(`unknow define at line ${ind} ("${cmd}")`)
                                                if (find.dataType == 'string') line_.push(this.getRandomString(find.dataRange[0] * range[1], find.dataRange[1]))
                                                else if (find.dataType == 'number') line_.push(
                                                    (
                                                        find.negative == true
                                                            ? (Math.round(Math.random()) == 0 ? -1 : 1)
                                                            : 1
                                                    ) * this.getRandomInt(
                                                        (find.dataRange[1] - find.dataRange[0]) * range[0] + find.dataRange[0],
                                                        (find.dataRange[1] - find.dataRange[0]) * range[1] + find.dataRange[0]
                                                    )
                                                )
                                                else if (find.dataType == 'boolean') line_.push(Math.round(Math.random()) == 0)
                                                else if (find.dataType == 'char') line_.push(this.getRandomChar(find.dataRange[0]))
                                            }
                                            resolve()
                                        }))
                                        resolve(void await Promise.all(promises))
                                    })
                                )
                                Promise.all(promise).then(() => {
                                    line.push(line_)
                                    resolve()
                                })
                            })
                        )
                    } else {
                        for (let index in cmds) promise.push(
                            new Promise<void>((resolve) => {
                                let cmd_ = cmds[index].split(' '),
                                    cmd = cmd_[cmd_.length - 1],
                                    const_: boolean = cmd_.includes('const'),
                                    ghost: boolean = cmd_.includes('ghost'),
                                    var_: DataType_ = '';
                                if (cmd.startsWith('const ')) { cmd = cmd.slice('const '.length); const_ = true }
                                if (cmd.trim() == '') resolve()

                                if (rangeReg.test(cmd)) {
                                    const exec = rangeReg.exec(cmd)
                                    if (!exec) throw new Error('unknown format');
                                    const find1 = findFunc(exec[1]) || { value: exec[1] }
                                    const find2 = findFunc(exec[2]) || { value: exec[2] }
                                    line_.push(this.getRandomInt(Number(find1.value), Number(find2.value)))
                                } else if (constReg.test(cmd)) {
                                    const exec = constReg.exec(cmd)
                                    if (!exec) throw new Error('unknown format');
                                    const find = const_arr.find(val => val.keyword == exec[1])
                                    if (!find) throw new Error(`cant find const with name '${exec[1]}' at line ${ind}`)
                                    else var_ = find.value
                                } else {
                                    const find = defined.find(def => def.keyword == cmd)
                                    if (!find) throw new Error(`unknow define at line ${ind} ("${cmd}")`)
                                    let range: any[] = dataSet.range
                                    range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == cmd)] : range

                                    if (find.dataType == 'string') var_ = this.getRandomString(find.dataRange[0] * range[1], find.dataRange[1])
                                    else if (find.dataType == 'number') var_ =
                                        (
                                            find.negative == true
                                                ? (Math.floor(Math.random()) == 1 ? -1 : 1)
                                                : 1
                                        ) * this.getRandomInt(
                                            (find.dataRange[1] - find.dataRange[0]) * range[0] + find.dataRange[0],
                                            (find.dataRange[1] - find.dataRange[0]) * range[1] + find.dataRange[0]
                                        )
                                    else if (find.dataType == 'boolean') var_ = Math.round(Math.random()) == 0
                                    else if (find.dataType == 'char') var_ = this.getRandomChar(find.dataRange[0])
                                }
                                if (const_ == true) const_arr.push({ keyword: cmd, value: var_ })
                                if (ghost != true) line_.push(var_)
                                resolve()
                            })
                        )
                    }
                    await Promise.all(promise)
                    if (line_.length != 0) line.push(line_)
                    if (line.length == 0) continue
                    prePush.push(...line)
                    if (config?.logMem == true) console.log(`Testcase: ${i} | Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(5)} / ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(5)} (MB)`)
                }
                resolve()
            })
            await func()
            let test_ = this.parseTest2D(prePush, join)
            if (dataSet.func) while (true) {
                const func_ = await dataSet.func(test_)
                if (func_ == true) break;
                else { prePush = []; await func(); test_ = this.parseTest2D(prePush, join) };
            }
            if (config?.pushTest == true) test.push(prePush)
            if (config?.func)
                await Promise.resolve(config.func(i, test_))

            resolve()
        }))
        for (let i of promise) {
            await Promise.resolve(i);
        }
        return this.parseTest(test)
    }

    public getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    public getRandomString(length: number, type: string = '0'): string {
        let result = '';
        let characters = '';
        if (type.includes('0')) characters += 'abcdefghijklmnopqrstuvwxyz'
        if (type.includes('1')) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        if (type.includes('2')) characters += '0123456789'
        if (type.includes('3')) characters += '!@#$%^&*'
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }
    public getRandomChar(characters: string = ''): string {
        return characters.charAt(Math.floor(Math.random() * characters.length));
    }
    private parseTest(test: DataType_[][][], join: string = ' '): string[] {
        return test.map((val) =>
            this.parseTest2D(val, join)
        );
    }
    private parseTest2D(test: DataType_[][], join: string = ' '): string {
        return test.map((val) =>
            val.join(join)
        ).join('\n')
    }
}