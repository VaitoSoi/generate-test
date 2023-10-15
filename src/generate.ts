import { parse } from 'yaml'
import fs, { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GenerateTest, GTConfig, Executable } from '.'
import { ExecOptions, exec, execSync } from 'node:child_process'

function promiseExce(command: string, option: ExecOptions = {}, writeTo?: fs.PathLike): Promise<void> {
    return new Promise((res, reject) => {
        const stream = writeTo ? fs.createWriteStream(writeTo, { encoding: 'utf8' }) : { write: console.log }
        function resolve(): void {
            if (writeTo) (stream as any).close();
            res();
        }
        const child = exec(command, option)
        child.stdout?.on('data', (data) => void stream.write(`[LOG] ${data.toString()}\n`))
        child.stderr?.on('data', (data) => void stream.write(`[ERR] ${data.toString()}\n`))
        child.on('error', reject)
        child.on('close', async (code) => resolve())

    })
}
const config = parse(readFileSync('./config.yaml', 'utf8'))

if (
    !config.Count ||
    !config.Range ||
    !config.Config ||
    !config.TestFolder ||
    !config.MainCPP ||
    !config.IOFile
) throw new Error(`missing configuration parameter, please read README.md file for more information`)

const gt = new GenerateTest()
gt.setConfig({
    testCount: config.Count as number || 10,
    testConfig: config.Range.map(async (val: { range: number[], count: number, func?: string }) => {
        if (val.func) val.func = (await import(val.func)).default
        return val
    }) as any[] || [],
})

async function run() {
    const folders = fs.readdirSync(join(config.TestFolder)).filter((dir) => fs.lstatSync(join(config.TestFolder, dir)).isDirectory())
    for (let i in folders) fs.rmSync(join(config.TestFolder, folders[i]), { recursive: true, force: true })
    if (!!config.OJFormatFolder) {
        const files = fs.readdirSync(join(config.OJFormatFolder)).filter((file) => fs.lstatSync(join(config.OJFormatFolder, file)).isFile())
        for (let i in files) fs.unlinkSync(join(config.OJFormatFolder, files[i]))
    }
    let mainCPP = config.MainCPP.split('/') as string[]
    await promiseExce(`g++ ${mainCPP.pop()} -o main`, { cwd: join(...mainCPP) }, config.DebugFile == true ? join(...mainCPP, 'debug.log') : undefined)

    await gt.generate(config.TestFolder as string, {
        pushTest: false,
        logMem: config.LogMemory as boolean || false,
        config: config.Config,
        func: (i, data) => new Promise(async (resolve) => {
            const path = join(config.TestFolder, `CASE_${i + 1}`), filename = config.IOFile
            if (!fs.existsSync(path)) fs.mkdirSync(path)
            fs.writeFileSync(join(path, `${filename}.INP`), data)
            fs.copyFileSync(join(__dirname, 'testcase', 'main'), join(path, 'main'))
            if (config.MeasureTime) console.time(`testcase_${i + 1}`)
            await promiseExce('./main', { cwd: path }, join(path, 'debug.log'))
            if (config.MeasureTime) console.timeEnd(`testcase_${i + 1}`)
            else console.log(`Done testcase ${i + 1}`)
            if (config.OJFormatFolder) {
                if (fs.existsSync(join(path, `${filename}.INP`))) fs.copyFileSync(join(path, `${filename}.INP`), join(__dirname, 'test', `${i + 1}.INP`))
                else console.log(`Cant find ${filename}.INP in case ${i + 1}`)
                if (fs.existsSync(join(path, `${filename}.OUT`))) fs.copyFileSync(join(path, `${filename}.OUT`), join(__dirname, 'test', `${i + 1}.OUT`))
                else console.log(`Cant find ${filename}.OUT in case ${i + 1}`)
            }
            resolve()
        })
    })

    console.log('DONE')
}