'use strict';

const R = require('ramda');
const fs = require('mz/fs');
const program = require('commander');
const path = require('path');
const C = require('chalk');
const tmp = require('tmp-promise');
const open = require('opn');
const watch = require('node-watch');
require('dot-into').install();


// Utilities.
const getPackageProp = prop => fs.readFile(path.resolve(__dirname, 'package.json'), 'utf-8').then(JSON.parse).then(R.prop(prop));
const log = (...msg) => {
	console.log(...msg);
	return msg[0];
};
const prepend = pre => text => pre + text;
const onUpdate = R.when(R.equals('update'));
const noPath = R.pipe(path.parse, R.prop('name'));
const message = msg => console.log(C.green(msg.split('\n').map(prepend('   ')).join('\n')));
const error = msg => {
	console.error(C.red('   ' + msg));
	throw msg;
};


(async () => {

	program
	.version(await getPackageProp('version'))
	.description(await getPackageProp('description'))
	.usage("<file ...>")
	.parse(process.argv);

	const filenames = program.args;

	if (filenames.length === 0) {
		program.help();
		process.exit(1);

	} else {
		const filenamesNoPath = filenames.map(noPath);
		const tempfile = await tmp.file({ postfix: '.txt', prefix: 'rename-' });

		message(`Opening filename list at: ${ tempfile.path }`);

		const tempContents = () =>
			fs.readFileSync(tempfile.path, 'utf-8')
			.split('\n');

		fs.writeFile(tempfile.path, filenamesNoPath.join('\n'), 'utf-8');
		open(tempfile.path);

		const watcher = watch(tempfile.path);
		watcher.on('change', onUpdate(() => {
			const newFilenames = tempContents();
			try {
				if (newFilenames.length !== filenames.length)
					error("New filename list has more or fewer lines than the original!");
				if (R.uniq(newFilenames).length !== newFilenames.length)
					error("Some filenames are identical!");
				if (newFilenames.filter(R.isEmpty).length > 0)
					error("Some lines are empty!");

				const changed =
					R.zip(filenamesNoPath, newFilenames)
					.filter(([a, b]) => a !== b);

				changed.forEach(([ol, nw]) => message(`${ ol }\n-> ${ nw }`));

			} catch (e) { }
		}));
	}

})();
