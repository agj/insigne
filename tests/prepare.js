'use strict';

const proxyquire = require('proxyquire').noCallThru();
const mockCLI = require('./mock-cli-promise');
const path = require('path');
const R = require('ramda');
const argv = require('yargs').argv
const defer = require('promise-defer');

const mockFs = require('./mocks/mock-mzfs');
const mockCommander = require('./mocks/mock-commander');
const mockWatch = require('./mocks/mock-node-watch');
const mockOpen = require('./mocks/mock-opn');
const mockTmp = require('./mocks/mock-tmp-promise');


module.exports = (config = {}) => {
	const tmpPath = 'temp/dir/temp.txt';
	const packagePath = path.resolve(path.normalize(__dirname + '/../'), 'package.json');
	const packageContents = JSON.stringify({
		version: 'test',
		description: "Testing.",
	});
	const filesToRename = R.defaultTo(
		{
			'/first/folder/file 1.txt':  'file 1 contents',
			'/first/folder/file 2.txt':  'file 2 contents',
			'/second/folder/file 3.txt': 'file 3 contents',
			'/second/folder/file 4.txt': 'file 4 contents',
		},
		config.files);
	const files = R.merge(filesToRename, { [packagePath]: packageContents });
	const initialArgs = R.defaultTo(
			['/first/folder/file 1.txt', '/first/folder/file 2.txt', '/second/folder/file 3.txt'],
			config.args);
	const args = R.concat([process.argv[0], '/path/to/renamer.js'], initialArgs);

	const fs = mockFs({ files: files, onRename: config.onRename });
	const watch = mockWatch();

	const createTemp = () => {
		fs.module.writeFileSync(tmpPath, '');
		watch.changed(tmpPath);
	};
	const ready = defer();
	const tmpOpened = () => ready.resolve(true);

	const [cliProcess, finish] =
		argv.verbose ?
			mockCLI(args, { stdout: process.stdout, stderr: process.stderr })
			: mockCLI(args);

	proxyquire('../', {
		'mz/fs': fs.module,
		'node-watch': watch.module,
		opn: mockOpen({ onCalled: tmpOpened }),
		'tmp-promise': mockTmp({ path: tmpPath, onCreateFile: createTemp }),
	});

	return {
		initialFiles: filesToRename,
		fs: fs.module,
		getTemp: () => fs.module.readFileSync(tmpPath),
		getFiles: () => fs.getFiles().into(R.omit([packagePath, tmpPath])),
		setTemp: contents => {
			fs.module.writeFileSync(tmpPath, contents.join('\n'));
			watch.changed(tmpPath);
		},
		finish,
		ready: ready.promise,
		done: cliProcess,
	};
};
