'use strict';

const R = require('ramda');
const fs = require('mz/fs');
const program = require('commander');
const path = require('path');
const tmp = require('tmp-promise');
const open = require('opn');
const watch = require('node-watch');
require('dot-into').install();

const out = require('./src/out');
const stream = require('./src/stream-wrap');


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
const among = R.flip(R.contains);
const differentPairs = (a, b) =>
	R.zip(a, b)
	.filter(R.apply(neq));
const fileExists = fs.existsSync;
const sort = R.sort(R.ascend(R.identity));


(async () => {

	program
	.version(await getPackageProp('version'))
	.description(await getPackageProp('description'))
	.usage("<file ...>")
	.parse(process.argv);

	const startFilenames = sort(program.args);

	if (startFilenames.length === 0) {
		program.help();
		process.exit(1);

	} else {
		const tempfile = await tmp.file({ postfix: '.txt', prefix: 'rename-' });
		const filenames = stream.make(startFilenames);
		const filenamesNoPath =
			filenames
			.into(stream.map(R.map(justName)));

		out.message(`Opening filename list at: ${ tempfile.path }`);

		const tempContents = stream.make();

		console.log('???', startFilenames, filenames(), filenamesNoPath())
		fs.writeFileSync(tempfile.path, filenamesNoPath().join('\n'), 'utf-8');

		const tempWatcher = watch(tempfile.path);
		tempWatcher.on('change', onUpdate(() =>
			tempContents(
				fs.readFileSync(tempfile.path, 'utf-8')
				.split('\n'))));
		open(tempfile.path);

		tempContents
		.into(stream.on((newNames) => {
			try {
				if (newNames.length !== filenames().length)
					out.error("New filename list has more or fewer lines than the original!");
				if (newNames.filter(R.isEmpty).length > 0)
					out.error("Some lines are empty!");
				if (newNames.filter(n => path.normalize(n).replace(path.sep, '') !== n).length > 0)
					out.error("Illegal filename used!");

				const newNamesPath =
					R.zip(filenames().map(justDir), newNames)
					.map(R.apply(path.join));
				if (R.uniq(newNamesPath).length !== newNamesPath.length)
					out.error("Some paths are identical!");

				const changed =
					differentPairs(filenames(), newNamesPath)
					.map(R.prop(1));
				if (changed.some(fileExists))
					out.error("Some filenames are already taken!");
				if (!filenames().every(fileExists))
					out.fatal("Some files missing!");

				filenames(newNamesPath);
			} catch (e) { }
		}));

		filenames
		.into(stream.pairs)
		.into(stream.filter(([a, b]) => a !== b))
		.into(stream.on(([oldNames, newNames]) => {
			const changes = differentPairs(oldNames, newNames);
			if (changes.length > 0) {
				out.message("Filename changes:");
				changes.forEach(([oldName, newName]) => {
					out.message(` • ${ justName(oldName) }`, 'gray');
					out.message(` > ${ justName(newName) }`, 'green');
					if (!fileExists(oldName))
						out.fatal("File is missing!");
					if (fileExists(newName))
						out.fatal("A different file with the target filename exists!");
					fs.renameSync(oldName, newName);
				});
			}
		}));
	}

})();
