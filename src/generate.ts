import { parse } from 'yaml'
import fs, { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { GenerateTest } from './index.ts'
import child, { ExecOptions, exec } from 'node:child_process'
import archiver from 'archiver'
import process from 'node:process'
import os from 'node:os'

const config = parse(readFileSync(process.argv[2] || './config.yaml', 'utf8'))
config.Range = config.Range.map((val: { range: number[], count: number, func?: string }) => {
    let output = val
    if (!!output.func) output.func = require(join('..', output.func)).default
    else output.func = undefined
    return output
})
if (
    !config.Count ||
    !config.Range ||
    !config.Config ||
    !config.TestFolder ||
    !config.MainCPP ||
    !config.IOFile
) throw new Error(`missing configuration parameter, please read README.md file for more information`)

const runtime = process.argv.map(val => typeof val === 'string' ? val : (val as () => string)())[0].split('/').pop()
if (runtime == 'bun') console.warn(`[WARN] Bun runtime detected !!`)

const gt = new GenerateTest({
    testCount: config.Count,
    testConfig: config.Range,
})

run()
// zip(join(resolve(), config.TestFolder), config.ZipFile)

async function run() {
    const folder = config.TestFolder.toString().replace('./', '').split('/').slice(0, -1)
    let subfolder = './'
    for (let i in folder) {
        subfolder += `${folder[i]}/`
        if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder)
    }
    const folders = fs.readdirSync(join(config.TestFolder)).filter((dir) => fs.lstatSync(join(config.TestFolder, dir)).isDirectory())
    for (let i in folders) fs.rmSync(join(config.TestFolder, folders[i]), { recursive: true, force: true })

    if (!!config.OJFormatFolder) {
        const folder = config.OJFormatFolder.toString().replace('./', '').split('/').slice(0, -1)
        let subfolder = './'
        for (let i in folder) {
            subfolder += `${folder[i]}/`
            if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder)
        }
        const files = fs.readdirSync(join(config.OJFormatFolder)).filter((file) => fs.lstatSync(join(config.OJFormatFolder, file)).isFile())
        for (let i in files) fs.unlinkSync(join(config.OJFormatFolder, files[i]))
    }
    let mainCPP = config.MainCPP.split('/') as string[]
    await promiseExce(`g++ ${mainCPP.pop()} -o main`, { cwd: join(...mainCPP) }, config.DebugFile == true ? join(...mainCPP, 'debug.log') : undefined)

    await gt.generate(config.Config as string, {
        pushTest: false,
        logMem: config.LogMemory as boolean || false,
        config: config.Config,
        func: (i, data) => new Promise(async (resolve) => {
            const path = join(config.TestFolder, `CASE_${i + 1}`), filename = config.IOFile
            if (!fs.existsSync(path)) fs.mkdirSync(path)

            fs.writeFileSync(join(path, `${filename}.INP`), data)
            fs.copyFileSync(join(...mainCPP, 'main'), join(path, 'main'))

            if (config.MeasureTime) console.time(`testcase_${i + 1}`)
            await promiseExce('./main', { cwd: path }, join(path, 'debug.log'))
            if (config.MeasureTime) console.timeEnd(`testcase_${i + 1}`)
            else console.log(`Done testcase ${i + 1}`)

            if (config.OJFormatFolder) {
                if (fs.existsSync(join(path, `${filename}.INP`))) fs.copyFileSync(join(path, `${filename}.INP`), join(config.OJFormatFolder, `${i + 1}.INP`))
                else console.log(`Cant find ${filename}.INP in case ${i + 1}`)

                if (fs.existsSync(join(path, `${filename}.OUT`))) fs.copyFileSync(join(path, `${filename}.OUT`), join(config.OJFormatFolder, `${i + 1}.OUT`))
                else console.log(`Cant find ${filename}.OUT in case ${i + 1}`)
            }
            resolve()
        })
    })

    console.log('Completed genrate test')

    if (config.ZipFile) {
        process.stdout.write(`Zipping TestCase... `)
        await zip(join(resolve(), config.TestFolder), config.ZipFile)
        console.log('DONE')
    }
    if (config.OJZipFile && config.OJFormatFolder) {
        process.stdout.write(`Zipping OJ TestCase... `)
        await zip(join(resolve(), config.OJFormatFolder), config.OJZipFile)
        console.log('DONE')
    }
}

function promiseExce(command: string, option: ExecOptions = {}, writeTo?: fs.PathLike | boolean): Promise<void> {
    return new Promise((res, reject) => {
        const stream = writeTo == false ? { write: () => { } } : writeTo ? fs.createWriteStream(writeTo as string, { encoding: 'utf8' }) : { write: console.log }
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

function zip(sourceDir: string, outPath: string): Promise<void> {
    if (!sourceDir.endsWith('/')) sourceDir += '/'
    return new Promise(async (resolve) => {
        switch (config.ZipProgram) {
            default:
            case 'system':
                switch (os.type()) {
                    case 'Linux':
                        await promiseExce(`zip -r temp.zip .`, { cwd: sourceDir }, false)
                        fs.copyFileSync(sourceDir + '/temp.zip', outPath)
                        fs.rmSync(sourceDir + '/temp.zip')
                        resolve();
                        break;
                    default:
                        outPath = outPath.endsWith('.zip') ? outPath.slice(0, - '.zip'.length) : outPath
                        await promiseExce(`Compress-Archive -Path ${sourceDir} -DestinationPath ${outPath}`)
                        resolve()
                }
                break;
            case 'jar':
                promiseExce(`jar -cMf ${outPath} -C ${sourceDir} ./`)
                resolve()
                break;
            case 'package':
                await zipDirectory(sourceDir, outPath)
                resolve()
                break;
        }
    })
}

function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream);

        archive.on('close', () => resolve());
        archive.finalize();
    });
}