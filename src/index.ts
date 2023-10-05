type DataType =
    | 'number'
    | 'string'
    | 'boolean'
type DataRange<Param_1 extends any = number, Param_2 extends any = number> = [Param_1, Param_2]
interface DefinedType {
    keyword: string;
    dataType: DataType;
    dataRange: DataRange<any, any>
}
interface TestConfig {
    range: [number, number],
    count: number,
}
interface GTConfig {
    testCount: number;
    testConfig: TestConfig[]
}

export class GenerateTest {
    private testCount: number = 10;
    private testConfig: TestConfig[] = [{ range: [0, 1], count: this.testCount }]

    constructor(config?: GTConfig) { if (config) this.setConfig(config) }

    private setConfig(config: GTConfig) {
        this.testCount = config.testCount
        this.testConfig = config.testConfig
    }

    public async generate(testConfig: string, config?: GTConfig): Promise<string[]> {
        if (config) this.setConfig(config)
        testConfig = testConfig.replace(/\t/gi, '')
        const testConfig_array = testConfig.split('-----').map((str) => str.replace(/\t/gi, '')),
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
        for (let i = 0; i < this.testCount; i++) {
            for (let ind in commands) {
                const cmd = commands[ind]
                const cmds = cmd.split('; ');
                let line: string = '';
                if (arrayReg_1.test(cmd) || arrayReg_2.test(commands[ind])) {
                    const type = arrayReg_2.test(cmd) ? 1 : 0
                    const exec = type == 0 ? arrayReg_1.exec(cmd) : arrayReg_2.exec(cmd)
                    if (!exec) continue;

                    const find = defined.find(def => def.keyword == exec[1])
                    let lastCount = 0;
                    const dataSet = this.testConfig.find((val) => { lastCount += val.count; return i + 1 <= lastCount })
                    if (!find) throw new Error(`unknow define at line ${ind} ("${cmd}")`)
                    if (!dataSet) throw new Error(`cant find testConfig at test ${ind}`)

                    for (let i = 0; i < Number(exec[2]); i++) {
                        let line_: string = ''
                        for (let j = 0; j < (type == 1 ? Number(exec[3]) : 1); j++)
                            if (find.dataType == 'string') line_ += this.getRandomString(...<DataRange<number, string>>find.dataRange) + ' '
                            else if (find.dataType == 'number') line_ += this.getRandomInt((find.dataRange[1] - find.dataRange[0]) * dataSet.range[0] + find.dataRange[0], (find.dataRange[1] - find.dataRange[0]) * dataSet.range[1] + find.dataRange[0]) + ' '
                            else if (find.dataType == 'boolean') line_ += `${Math.round(Math.random()) == 0} `
                        line += `${line_}\n`
                    }
                } else for (let index in cmds) {
                    const cmd = cmds[index];
                    if (cmd == '') continue
                    let lastCount = 0;
                    const find = defined.find(def => def.keyword == cmd)
                    const dataSet = this.testConfig.find((val) => { lastCount += val.count; return i + 1 <= lastCount })
                    if (!find) throw new Error(`unknow define at line ${ind} ("${cmd}")`)
                    if (!dataSet) throw new Error(`cant find testConfig at test ${ind}`)
                    if (find.dataType == 'string') line += this.getRandomString(...<DataRange<number, string>>find.dataRange) + ' '
                    else if (find.dataType == 'number') line += this.getRandomInt((find.dataRange[1] - find.dataRange[0]) * dataSet.range[0] + find.dataRange[0], (find.dataRange[1] - find.dataRange[0]) * dataSet.range[1] + find.dataRange[0]) + ' '
                    else if (find.dataType == 'boolean') line += `${Math.round(Math.random()) == 0} `
                }
                if (line == '') continue
                if (!test[i]) test[i] = ''
                test[i] += `${line}${line.endsWith('\n') ? '' : '\n'}`
            }
        }
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