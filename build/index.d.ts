/// <reference types="node" />
export type Awaitable<T> = T | PromiseLike<T>;
export type Executable<Param extends any[] = [], Callback extends any = void> = (...args: Param) => Awaitable<Callback>;
export type DataType_ = 'number' | 'char';
export type DataType = number | string;
export type DataRange<Param_1 extends DataType = number, Param_2 extends DataType = number> = [Param_1, Param_2];
export interface DefineVariable<R1 extends DataType = any, R2 extends DataType = any> {
    dataType: DataType_;
    dataRange: DataRange<R1, R2>;
    negative: boolean;
}
export type TestDataRange = DataRange<number, number>;
export interface TestRange {
    range: DataRange<number, number> | DataRange<number, number>[];
    count: number;
    func?: Executable<[val: string, ...param: any[]], boolean>;
}
export interface TestConfig {
    range: TestRange;
    testcasePath: string;
    ojPath: string;
}
export interface GTOptions {
    TestCount: number;
    TestRange: TestRange[];
    IOFilename: string;
    TestCode: string;
    MainCodePath: string | null;
    Compiler: string | null;
    CppVersion: string | null;
    TestcasesPath: string;
    OJ_TestcasesPath: string | null;
    TestcasesZipPath: string | null;
    OJ_TestcasesZipPath: string | null;
    Zip_Program: string | null;
}
export interface ReportArray {
    id: number;
    memoryUsage: NodeJS.MemoryUsage;
    time: number;
}
export declare class GenerateTest {
    private testCount;
    private testRange;
    private testCode;
    private temp;
    private RegExp;
    private cached;
    private defineVar;
    private MainCodePath;
    private IOFilename;
    private Compiler;
    private CppVersion;
    private TestcasesPath;
    private OJ_TestcasesPath?;
    private TestcasesZipPath?;
    private OJ_TestcasesZipPath?;
    private Zip_Program;
    constructor(config?: GTOptions);
    setConfig(config: GTOptions): void;
    set setTestCount(count: number);
    generate(): Promise<ReportArray[]>;
    runFile(): Promise<void>;
    zip(config?: {
        oj: boolean;
    }): Promise<void>;
    private parseCode;
    private parseHeader;
    private parseArray;
    private parseLine;
    parseCommand(fullCommand: string, testRange: TestDataRange | TestDataRange[]): string;
    getRandomInt(min: number, max: number): number;
    getRandomCharacter(str: string): string;
    private largePush;
    private mkdir;
    private zip_;
    private zipDirectory;
    private spawn;
    private exec;
}
