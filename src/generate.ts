import yaml from 'yaml'
import fs from 'node:fs'
import path from 'node:path'
import { GenerateTest } from './index.ts'
import child from 'node:child_process'
import archiver from 'archiver'
import process from 'node:process'
import os from 'node:os'

const config = yaml.parse(fs.readFileSync(process.argv[2] || './config.yaml', 'utf8'))
config.Range = config.Range.map((val: { range: number[], count: number, func?: string }) => {
    let output = val
    if (!!output.func) output.func = require(`../${output.func}`).default
    else output.func = undefined
    return output
})
if (
    !config.Count ||
    !config.Range ||
    !config.Config ||
    !config.TestFolder ||
    // !config.MainCPP ||
    !config.IOFile
) throw new Error(`missing configuration parameter, please read README.md file for more information`)

const runtime = process.argv.map(val => typeof val === 'string' ? val : (val as () => string)())[0].split('/').pop()
if (runtime == 'bun') console.warn(`[WARN] Bun runtime detected !!`)
const mainFile =
    os.type() == 'Windows_NT'
        ? 'main.exe'
        : 'main'

const gt = new GenerateTest({
    testCount: config.Count,
    testConfig: config.Range,
})

run()

async function run() {
    const folder = config.TestFolder.toString().replace('./', '').split('/').slice(0, -1)
    let subfolder = './'
    for (let i in folder) {
        subfolder += `${folder[i]}/`
        if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder)
    }

    const folders = fs.readdirSync(path.join(config.TestFolder)).filter((dir) => fs.lstatSync(path.join(config.TestFolder, dir)).isDirectory())
    for (let i in folders) fs.rmSync(path.join(config.TestFolder, folders[i]), { recursive: true, force: true })

    if (!!config.OJFormatFolder) {
        const folder = config.OJFormatFolder.toString().replace('./', '').split('/').slice(0, -1)
        let subfolder = './'
        for (let i in folder) {
            subfolder += `${folder[i]}/`
            if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder)
        }

        const files = fs.readdirSync(path.join(config.OJFormatFolder)).filter((file) => fs.lstatSync(path.join(config.OJFormatFolder, file)).isFile())
        for (let i in files) fs.unlinkSync(path.join(config.OJFormatFolder, files[i]))
    }
    let mainCPP: string[] = []
    if (config.MainCPP) {
        mainCPP = config.MainCPP.split('/') as string[];
        await promiseExce(`g++ ${mainCPP.pop()} -std=${config.CPPVersion || 'c++17'} -o ${mainFile}`, { cwd: path.join(...mainCPP) }, config.DebugFile == true ? path.join(...mainCPP, 'debug.log') : undefined)
    }

    await gt.generate(config.Config as string, {
        pushTest: false,
        logMem: config.LogMemory as boolean || false,
        config: config.Config,
        func: (i, data) => new Promise(async (resolve) => {
            const path_ = path.join(__dirname, '..', config.TestFolder, `CASE_${i + 1}`), filename = config.IOFile
            if (!fs.existsSync(path_)) fs.mkdirSync(path_)

            fs.writeFileSync(path.join(path_, `${filename}.INP`), data)

            if (config.MainCPP) {
                fs.copyFileSync(path.join(...mainCPP, mainFile), path.join(path_, mainFile))

                if (config.TimeMeasure) console.time(`testcase_${i + 1}`)
                child.execSync(os.type() == 'Windows_NT' ? mainFile : `./${mainFile}`, { cwd: path_ })
                if (config.TimeMeasure) console.timeEnd(`testcase_${i + 1}`)
                else console.log(`Done testcase ${i + 1}`)
            } else console.log(`Generated testcase ${i + 1}`)

            if (config.OJFormatFolder) {
                if (fs.existsSync(path.join(path_, `${filename}.INP`))) fs.copyFileSync(path.join(path_, `${filename}.INP`), path.join(config.OJFormatFolder, `${i + 1}.INP`))
                else console.log(`Cant find ${filename}.INP in case ${i + 1}`)

                if (config.MainCPP)
                    if (fs.existsSync(path.join(path_, `${filename}.OUT`))) fs.copyFileSync(path.join(path_, `${filename}.OUT`), path.join(config.OJFormatFolder, `${i + 1}.OUT`))
                    else console.log(`Cant find ${filename}.OUT in case ${i + 1}`)
            }

            resolve()
        })
    })

    console.log('Completed genrate test')

    if (config.ZipFile) {
        process.stdout.write(`Zipping TestCase... `)
        await zip(path.join(path.resolve(), config.TestFolder), config.ZipFile)
        console.log('DONE')
    }
    if (config.OJZipFile && config.OJFormatFolder) {
        process.stdout.write(`Zipping OJ TestCase... `)
        await zip(path.join(path.resolve(), config.OJFormatFolder), config.OJZipFile)
        console.log('DONE')
    }
}

function promiseExce(command: string, option: child.ExecOptions = {}, writeTo?: fs.PathLike | boolean): Promise<void> {
    return new Promise((res, reject) => {
        const stream = writeTo == false ? { write: () => { } } : writeTo ? fs.createWriteStream(writeTo as string, { encoding: 'utf8' }) : { write: console.log }
        function resolve(): void {
            if (writeTo) (stream as any).close();
            res();
        }
        const child_ = child.exec(command, option)
        child_.stdout?.on('data', (data) => void stream.write(`[LOG] ${data.toString()}\n`))
        child_.stderr?.on('data', (data) => void stream.write(`[ERR] ${data.toString()}\n`))
        child_.on('error', reject)
        child_.on('close', async (code) => resolve())

    })
}
// function promiseWrite(file: fs.PathLike, data: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         const stream = fs.createWriteStream(file, { encoding: 'utf8' })
//         stream.write(data)
//         stream.on('error', reject)
//         stream.on('drain', () => {
//             stream.close()
//             resolve()
//         })
//     })
// }

function zip(sourceDir: string, outPath: string): Promise<void> {
    if (!sourceDir.endsWith('/')) sourceDir += '/'
    return new Promise(async (resolve) => {
        switch (config.ZipProgram) {
            default:
                process.stdout.write('(WARNING: Using default zip program, package)')
            case 'package':
                if (runtime == 'bun') throw new Error(`Bun runtime is not supported for zipping file using package`)
                await zipDirectory(sourceDir, outPath)
                resolve()
                break;
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
        }
    })
}
function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', reject)
            .pipe(stream);

        archive.on('close', () => resolve());
        archive.finalize();
    });
}