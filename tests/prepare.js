'use strict';

const proxyquire = require('proxyquire').noCallThru();
const mockCLI = require('./mock-cli-promise');
const flyd = require('flyd');
const path = require('path');
const R = require('ramda');
const argv = require('yargs').argv

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
	const initialFiles = R.defaultTo(
		{
			'/first/folder/file 1.txt':  'file 1 contents',
			'/first/folder/file 2.txt':  'file 2 contents',
			'/second/folder/file 3.txt': 'file 3 contents',
			'/second/folder/file 4.txt': 'file 4 contents',
		},
		config.files);
	const files = R.merge(initialFiles, { [packagePath]: packageContents });
	const initialArgs = R.defaultTo(
			['/first/folder/file 1.txt', '/first/folder/file 2.txt', '/second/folder/file 3.txt'],
			config.args);
	const args = R.concat([process.argv[0], '/path/to/renamer.js'], initialArgs);

	const fs = mockFs({ files: files, onRename: config.onRename });
	const tmpOpened = flyd.stream();
	const tmpChanged = flyd.stream();

	const createTemp = () => {
		fs.module.writeFileSync(tmpPath, '');
		tmpChanged(tmpPath);
	};
	const ready = new Promise((resolve) => tmpOpened.into(flyd.on(() => setTimeout(() => resolve(true)))));

	const [cliProcess, finish] =
		argv.verbose ?
			mockCLI(args, { stdout: process.stdout, stderr: process.stderr })
			: mockCLI(args);

	proxyquire('../', {
		'mz/fs': fs.module,
		'node-watch': mockWatch({ changes: tmpChanged }),
		opn: mockOpen({ onCalled: tmpOpened }),
		'tmp-promise': mockTmp({ path: tmpPath, onCreateFile: createTemp }),
	});

	const changeTemp = contents => {
		fs.module.writeFileSync(tmpPath, contents.join('\n'));
		tmpChanged(tmpPath);
	};
	const getTemp = () => fs.module.readFileSync(tmpPath);
	const relevantFiles =
		fs.files
		.into(flyd.map(R.omit([packagePath, tmpPath])));

	return {
		initialFiles: initialFiles,
		initialArgs: initialArgs,
		fs: fs.module,
		changeTemp,
		getTemp,
		files: relevantFiles,
		finish,
		ready,
		done: cliProcess,
	};
};
