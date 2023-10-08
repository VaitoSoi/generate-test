export type DataType =
    | 'number'
    | 'string'
    | 'boolean'
export type DataRange<Param_1 extends any = number, Param_2 extends any = number> = [Param_1, Param_2]
export interface DefinedType {
    keyword: string;
    dataType: DataType;
    dataRange: DataRange<any, any>
}
export type TestConfigRange = DataRange<number, number>
export interface TestConfig {
    range: TestConfigRange | TestConfigRange[],
    count: number,
    func?: (val: string) => boolean | PromiseLike<boolean>;
}
export interface GTConfig {
    testCount: number;
    testConfig: TestConfig[]
}

export class GenerateTest {
    private testCount: number = 10;
    private testConfig: TestConfig[] = [{ range: [0, 1], count: this.testCount }]

    constructor(config?: GTConfig) { if (config) this.setConfig(config) }

    private setConfig(config: GTConfig) {
        this.testCount = config.testCount
        this.testConfig = config.testConfig.map((val): TestConfig => {
            const cond = val.count < 1 && val.count > -1
            if (cond == true) return { range: val.range, count: val.count * this.testCount, func: val.func }
            else return val
        })
    }

    public async generate(testConfig: string, config?: GTConfig): Promise<string[]> {
        if (config) this.setConfig(config)
        testConfig = testConfig.replace(/\t/gi, '')
        const testConfig_array = testConfig.split(/-{5,}/).map((str) => str.replace(/\t/gi, '')),
            declares = testConfig_array[0].split('\n'),
            commands = testConfig_array[1].split('\n'),
            arrayReg_1 = /^\[(.+); (.+); "(.+)"\]$/,
            arrayReg_2 = /^\[(.+); (.+) - (.+); "(.+)"\]$/
        let defined: DefinedType[] = [], test: string[] = [];
        for (let i in declares) {
            if (declares[i] == '') continue;
            const declare = declares[i].split(' ');
            defined.push({
                keyword: declare[0],
                dataType: <DataType>declare[1],
                dataRange: <DataRange<number, string>>[Number(declare[2]), declare[3] || '0']
            })
        }
        let promise: Promise<void>[] = []
        for (let i = 0; i < this.testCount; i++) promise.push(new Promise(async (resolve) => {
            let const_arr: { keyword: string, value: number | string | boolean }[] = []
            let lastCount = { i: -1, count: 0 };
            const dataSet = this.testConfig.find((val, ind) => {
                if (lastCount.i != ind) {
                    lastCount.count += val.count
                    lastCount.i = ind
                }
                return i + 1 <= lastCount.count
            })
            if (!dataSet) throw new Error(`cant find testConfig at test ${i}`)
            console.log({ i, dataSet })
            const func = () => new Promise<void>(async (resolve) => {
                for (let ind in commands) {
                    const cmd = commands[ind]
                    const cmds = cmd.split('; ');
                    let line: string = '';
                    let promise: Promise<void>[] = []
                    if (arrayReg_1.test(cmd) || arrayReg_2.test(cmd)) {
                        const type = arrayReg_2.test(cmd) ? 1 : 0
                        const exec = type == 0 ? arrayReg_1.exec(cmd) : arrayReg_2.exec(cmd)
                        if (!exec) throw new Error('unknown format');

                        const findFunc = (val: string) => const_arr.find(def => def.keyword == val)

                        const find = defined.find(def => def.keyword == exec[1])
                        if (!find) throw new Error(`unknow define at line ${ind} ("${exec[1]}")`)
                        let range: any[] = dataSet.range
                        range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == exec[1])] : range
                        for (let i = 0; i < ((): number => {
                            const find = findFunc(exec[2])
                            if (!find) return Number(exec[2])
                            else
                                if (typeof find.value == 'number') return find.value
                                else throw new Error(`wrong const data type at line ${ind}`)
                        })(); i++) promise.push(
                            new Promise<void>((resolve) => {
                                let line_: string = ''
                                let promise: Promise<void>[] = []
                                for (let j = 0; j < (type == 1 ? ((): number => {
                                    const find = findFunc(exec[3])
                                    if (!find) return Number(exec[3])
                                    else
                                        if (typeof find.value == 'number') return find.value
                                        else throw new Error(`wrong const data type at line ${ind}`)
                                })() : 1); j++) promise.push(
                                    new Promise<void>((resolve) => {
                                        if (find.dataType == 'string') line_ += this.getRandomString(...<DataRange<number, string>>find.dataRange) + ' '
                                        else if (find.dataType == 'number') line_ += this.getRandomInt((find.dataRange[1] - find.dataRange[0]) * range[0] + find.dataRange[0], (find.dataRange[1] - find.dataRange[0]) * range[1] + find.dataRange[0]) + ' '
                                        else if (find.dataType == 'boolean') line_ += `${Math.round(Math.random()) == 0} `
                                        resolve()
                                    })
                                )
                                Promise.all(promise).then(() => {
                                    line += `${line_}\n`
                                    resolve()
                                })
                            })
                        )
                    } else {
                        let line: string = ''
                        for (let index in cmds) promise.push(
                            new Promise<void>((resolve) => {
                                let cmd_ = cmds[index].split(' '),
                                    cmd = cmd_[cmd_.length - 1],
                                    const_: boolean = cmd_.includes('const'),
                                    ghost: boolean = cmd_.includes('ghost'),
                                    var_: any = '';
                                if (cmd.startsWith('const ')) { cmd = cmd.slice('const '.length); const_ = true }
                                if (cmd.trim() == '') resolve()

                                const find = defined.find(def => def.keyword == cmd)
                                if (!find) throw new Error(`unknow define at line ${ind} ("${cmd}")`)
                                let range: any[] = dataSet.range
                                range = Array.isArray(range[0]) ? range[defined.findIndex((def) => def.keyword == cmd)] : range

                                if (find.dataType == 'string') var_ = this.getRandomString(...<DataRange<number, string>>find.dataRange)
                                else if (find.dataType == 'number') var_ = this.getRandomInt((find.dataRange[1] - find.dataRange[0]) * range[0] + find.dataRange[0], (find.dataRange[1] - find.dataRange[0]) * range[1] + find.dataRange[0])
                                else if (find.dataType == 'boolean') var_ = Math.round(Math.random()) == 0

                                if (const_ == true) const_arr.push({ keyword: cmd, value: var_ })
                                if (ghost != true) line += var_ + ' '
                                resolve()
                            })
                        )
                    }
                    await Promise.all(promise)
                    if (line == '') continue
                    if (!test[i]) test[i] = ''
                    test[i] += `${line}${line.endsWith('\n') ? '' : '\n'}`
                    resolve()
                }
            })
            await func()
            if (dataSet.func) while (true) {
                const func_ = await dataSet.func(test[i])
                // console.log({ test: test[i], func_ })
                if (func_ == true) break;
                else { test[i] = ''; await func() };
            }
            resolve()
        }))
        await Promise.all(promise)
        return test;
    }

    private getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    private getRandomString(length: number, type: string = '0') {
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
}