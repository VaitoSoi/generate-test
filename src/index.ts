import process from "node:process";
import _ from 'lodash'

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
    func?: Executable<[val: string, ...param: any[]], boolean>;
}
export interface GTConfig {
    testCount: number;
    testConfig: TestConfig[]
}
export type ConstantArray = { keyword: string, value: DataType_ }

export class GenerateTest {
    private testCount: number = 10;
    private testConfig: TestConfig[] = [{ range: [0, 1], count: this.testCount }]
    private temp: any = {}

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
        const testConfig_array = testConfig.split(/-{5,}/),
            declares = testConfig_array[0].split('\n'),
            commands = testConfig_array[1].split('\n'),
            arrayReg_1 = /^\[(.+), (.+)\]$/,
            arrayReg_2 = /^\[(.+), (.+) - (.+), "(.+)"\]$/,
            arrayReg_3 = /^\[(.+), (.+) - (.+), ""\]$/,
            seqReg = /^\[(.+) -> (.+)\]/,
            reSegReg = /^\[(.+) <- (.+)\]/,
            assignReg = /^(.+) (.+) = (.+)$/
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
            let const_arr: ConstantArray[] = []
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
                    if (arrayReg_1.test(cmd) || arrayReg_2.test(cmd) || arrayReg_3.test(cmd)) {
                        const type = arrayReg_2.test(cmd) || arrayReg_3.test(cmd) ? 1 : 0
                        const exec = type == 0 ? arrayReg_1.exec(cmd) : (arrayReg_2.exec(cmd) || arrayReg_3.exec(cmd))
                        if (!exec) throw new Error('unknown format');
                        if (arrayReg_3.test(cmd)) exec.push('')

                        join = type == 0 ? exec[3] : exec[4]

                        const it = ((): number => {
                            const find = findFunc(exec[2])
                            if (!find) return Number(exec[2])
                            else
                                if (typeof find.value == 'number') return find.value
                                else throw new Error(`wrong const data type at line ${ind}`)
                        })()
                        for (let i = 0; i < it; i++) promise.push(
                            new Promise<void>(async (resolve) => {
                                let line_: DataType_[] = []
                                let promise: Promise<void>[] = []
                                const it_ = (type == 1 ? ((): number => {
                                    const find = findFunc(exec[3])
                                    if (!find) return Number(exec[3])
                                    else
                                        if (typeof find.value == 'number') return find.value
                                        else throw new Error(`wrong const data type at line ${ind}`)
                                })() : 1)
                                let lastItem: any;
                                for (let j = 0; j < it_; j++) promise.push(
                                    new Promise<void>(async (resolve) => {
                                        const cmd = exec[1].split('; ')
                                        let promises: Promise<void>[] = []
                                        for (let k = 0; k < cmd.length; k++) promises.push(new Promise(resolve => {
                                            let range: any[] = dataSet.range, cmd_ = cmd[k];
                                            const item = cmd[k].slice(1, -1).split(' ')
                                            range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == this.parseKeywrord(cmd[k]))] : range
                                            if (seqReg.test(cmd[k])) {
                                                if (!lastItem) lastItem = item[0]
                                                const findItem = findFunc(item[2])
                                                cmd_ = `[${lastItem} - ${findItem ? j / it_ * Number(findItem.value) : item[2]}]`
                                            } else if (reSegReg.test(cmd[k])) {
                                                if (!lastItem) lastItem = item[2]
                                                const findItem = findFunc(item[2])
                                                cmd_ = `[${findItem ? (it_ - j + 1) / it_ * Number(findItem.value) : item[2]} - ${lastItem}]`
                                            }

                                            const const_: boolean = cmd_.includes('const'),
                                                ghost: boolean = cmd_.includes('ghost')

                                            lastItem = this.parseCMD(cmd_, range as any, defined, const_arr, { line: ind })
                                            if (const_ == true) const_arr.push({ keyword: this.parseKeywrord(cmd_), value: lastItem })
                                            if (ghost == false) line_.push(lastItem)
                                            // console.log({ lastItem, const_, ghost, line_ })

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
                                if (assignReg.test(cmds[index])) {
                                    const exec = assignReg.exec(cmds[index])
                                    if (!exec) throw new Error('unknown format')

                                    const type = exec[1].split(' '),
                                        const_ = type.includes('const'),
                                        ghost = type.includes('ghost'),
                                        name = exec[2],
                                        cmd = exec[3]
                                    let range: any[] = dataSet.range
                                    range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == this.parseKeywrord(cmd))] : range
                                    const value = this.parseCMD(cmd, range as any, defined, const_arr, { line: ind })

                                    if (const_ == true) const_arr.push({ keyword: name, value: value })
                                    if (ghost != true) line_.push(value)
                                } else {
                                    const cmd_ = cmds[index].split(' '),
                                        cmd = cmd_[cmd_.length - 1]
                                    if (cmds[index].trim() == '') resolve()

                                    let range: any[] = dataSet.range
                                    range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == cmd)] : range

                                    const const_: boolean = cmd_.includes('const'),
                                        ghost: boolean = cmd_.includes('ghost'),
                                        var_ = this.parseCMD(cmds[index], range as any, defined, const_arr, { line: ind })

                                    if (const_ == true) const_arr.push({ keyword: cmd, value: var_ })
                                    if (ghost != true) line_.push(var_)
                                }
                                resolve()
                            })
                        )
                    }
                    await Promise.all(promise)
                    if (line_.length != 0) line.push(line_)
                    if (line.length == 0) continue
                    prePush.push(...line)
                    if (config?.logMem == true) console.log(`Testcase: ${i + 1} | Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(5)} / ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(5)} (MB)`)
                }
                resolve()
            })
            await func()
            let test_ = this.parseTest2D(prePush, join)
            if (dataSet.func)
                while (true) {
                    const func_ = await dataSet.func(test_, i)
                    if (func_ == true) break;
                    else {
                        const_arr = []
                        prePush = []
                        join = ' ';
                        await func();
                        test_ = this.parseTest2D(prePush, join)
                    };
                }
            if (config?.pushTest == true) test.push(prePush)
            else prePush = [];
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
    private parseKeywrord(keyword: string): string {
        const constReg = /\[(.+)\]/,
            rangeReg = /\[(.+) - (.+)\]/,
            seqReg = /\[(.+) -> (.+)\]/
        return rangeReg.test(keyword) || seqReg.test(keyword)
            ? (rangeReg.exec(keyword) || seqReg.exec(keyword) || [])[2]
            : constReg.test(keyword)
                ? (constReg.exec(keyword) as string[])[1]
                : keyword.split(' ').pop() || keyword
    }
    private parseCMD(cmd: string, range: TestConfigRange, defined: DefinedType[], const_arr: ConstantArray[], debug?: { line?: number | string, lastItem?: number }): DataType_ {
        const findFunc = (val: string) => _.findLast(const_arr, (def) => def.keyword == val)

        const constReg = /\[(.+)\]/,
            rangeReg = /\[(.+) - (.+)\]/
        let line_: DataType_ = ''
        if (rangeReg.test(cmd)) {
            const exec = rangeReg.exec(cmd)
            if (!exec) throw new Error('unknown format');
            const find1 = findFunc(exec[1]) || { value: exec[1] }
            const find2 = findFunc(exec[2]) || { value: exec[2] }
            line_ = this.getRandomInt(Number(find1.value), Number(find2.value))
        } else if (constReg.test(cmd)) {
            const exec = constReg.exec(cmd)
            if (!exec) throw new Error('unknown format');
            const find = findFunc(exec[1])
            if (!find) throw new Error(`cant find const with name "${exec[1]}" at line ${debug?.line || 0}`)
            else line_ = find.value
        } else {
            const command = cmd.split(' '),
                cmd_ = command[command.length - 1]
            const find = defined.find(def => def.keyword == cmd_)
            if (!find) throw new Error(`unknow define "${cmd_}" at line ${debug?.line || 0}`)
            if (find.dataType == 'string') line_ = this.getRandomString(find.dataRange[0] * range[1], find.dataRange[1])
            else if (find.dataType == 'number') line_ =
                (
                    find.negative == true
                        ? (Math.round(Math.random()) == 0 ? -1 : 1)
                        : 1
                ) * this.getRandomInt(
                    (find.dataRange[1] - find.dataRange[0]) * range[0] + find.dataRange[0],
                    (find.dataRange[1] - find.dataRange[0]) * range[1] + find.dataRange[0]
                )
            else if (find.dataType == 'boolean') line_ = Math.round(Math.random()) == 0
            else if (find.dataType == 'char') line_ = this.getRandomChar(find.dataRange[0])
        }
        return line_
    }
}