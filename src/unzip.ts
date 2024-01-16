import zip_stream from 'node-stream-zip'

export async function UnZip(sourceDir: string, destinationDir: string): Promise<number | undefined> {
    const stream = new zip_stream.async({ file: sourceDir })
    const entries = await stream.extract(null, destinationDir)
    stream.close()
    return entries
}