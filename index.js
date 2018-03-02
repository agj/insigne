'use strict';

const R = require('ramda');
const fs = require('mz/fs');
const program = require('commander');
const path = require('path');
const C = require('chalk');
const tmp = require('tmp-promise');
const open = require('opn');
const watch = require('node-watch');
const flyd = require('flyd');
require('dot-into').install();


// Utilities.
const getPackageProp = prop => fs.readFile(path.resolve(__dirname, 'package.json'), 'utf-8').then(JSON.parse).then(R.prop(prop));
const log = (...msg) => {
	console.log(...msg);
	return msg[0];
};
const prepend = pre => text => pre + text;
const onUpdate = R.when(R.equals('update'));
const justName = R.pipe(path.parse, R.prop('base'));
const justDir = R.pipe(path.parse, R.prop('dir'));
const message = (msg, color = 'white') => console.log(C[color](msg.split('\n').map(prepend('   ')).join('\n')));
const error = msg => {
	console.error(C.red('   ' + msg));
	throw msg;
};
const streamMap = flyd.map;
const streamFilter = require('flyd/module/filter');
const streamTwo = stream => {
	const r = flyd.stream();
	let prev = stream();
	stream.into(flyd.on(v => {
		r([prev, v]);
		prev = v;
	}));
	return r;
};


(async () => {

	program
	.version(await getPackageProp('version'))
	.description(await getPackageProp('description'))
	.usage("<file ...>")
	.parse(process.argv);

	const startFilenames = program.args;

	if (startFilenames.length === 0) {
		program.help();
		process.exit(1);

	} else {
		const tempfile = await tmp.file({ postfix: '.txt', prefix: 'rename-' });
		const filenames = flyd.stream(startFilenames);
		const filenamesNoPath =
			filenames
			.into(streamMap(R.map(justName)));

		message(`Opening filename list at: ${ tempfile.path }`);

		const tempContents = flyd.stream([]);

		fs.writeFile(tempfile.path, filenamesNoPath().join('\n'), 'utf-8');
		open(tempfile.path);

		const tempWatcher = watch(tempfile.path);
		tempWatcher.on('change', onUpdate(() =>
			tempContents(
				fs.readFileSync(tempfile.path, 'utf-8')
				.split('\n'))));

		tempContents
		.into(flyd.on((newNames) => {
			try {
				if (newNames.length !== filenames().length)
					error("New filename list has more or fewer lines than the original!");
				if (R.uniq(newNames).length !== newNames.length)
					error("Some filenames are identical!");
				if (newNames.filter(R.isEmpty).length > 0)
					error("Some lines are empty!");
				if (newNames.filter(n => path.normalize(n).replace(path.sep, '') !== n).length > 0)
					error("Illegal filename used!");

				filenames(
					R.zip(filenames().map(justDir), newNames)
					.map(R.apply(path.join)));
			} catch (e) { }
		}));

		filenames
		.into(streamTwo)
		.into(streamFilter(([a, b]) => a !== b))
		.into(flyd.on(([oldNames, newNames]) => {
			const changes =
				R.zip(oldNames, newNames)
				.filter(([a, b]) => a !== b);
			if (changes.length > 0) {
				message("Filename changes:");
				changes.forEach(([oldName, newName]) => {
					message(` • ${ justName(oldName) }`, 'gray');
					message(` > ${ justName(newName) }`, 'green');
					fs.renameSync(oldName, newName);
				});
			}
		}));
	}

})();
