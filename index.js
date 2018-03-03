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
const neq = R.complement(R.identical);
const onUpdate = R.when(R.equals('update'));
const justName = R.pipe(path.parse, R.prop('base'));
const justDir = R.pipe(path.parse, R.prop('dir'));
const message = (msg, color = 'white') => console.log(C[color](msg.split('\n').map(prepend('   ')).join('\n')));
const error = msg => {
	console.error(C.red('   ' + msg));
	throw msg;
};
const fatal = msg => {
	console.error(C.red(`   FATAL: ${ msg }`));
	process.exit(1);
};
const among = R.flip(R.contains);
const differentPairs = (a, b) =>
	R.zip(a, b)
	.filter(R.apply(neq));
const fileExists = fs.existsSync;

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

				const newNamesPath =
					R.zip(filenames().map(justDir), newNames)
					.map(R.apply(path.join));

				const changed =
					differentPairs(filenames(), newNamesPath)
					.map(R.prop(1));
				if (changed.some(fileExists))
					error("Some filenames are already taken!");

				filenames(newNamesPath);
			} catch (e) { }
		}));

		filenames
		.into(streamTwo)
		.into(streamFilter(([a, b]) => a !== b))
		.into(flyd.on(([oldNames, newNames]) => {
			const changes = differentPairs(oldNames, newNames);
			if (changes.length > 0) {
				message("Filename changes:");
				changes.forEach(([oldName, newName]) => {
					try {
						message(` • ${ justName(oldName) }`, 'gray');
						message(` > ${ justName(newName) }`, 'green');
						if (!fileExists(oldName))
							fatal("File is missing!");
						if (fileExists(newName))
							fatal("A different file with the target filename exists!");
						fs.renameSync(oldName, newName);
					} catch (e) {}
				});
			}
		}));
	}

})();
