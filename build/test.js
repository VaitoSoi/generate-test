"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_stream_1 = __importDefault(require("node:stream"));
const writeableStream = new node_stream_1.default.Readable();
const file1Stream = node_fs_1.default.createWriteStream(`${__dirname}/file1.txt`);
const file2Stream = node_fs_1.default.createWriteStream(`${__dirname}/file2.txt`);
writeableStream.pipe(file1Stream);
writeableStream.pipe(file2Stream);
