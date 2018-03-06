
const R = require('ramda');
const C = require('chalk');

const prepend = pre => text => pre + text;

module.exports = {
	message: (msg, color = 'white') => console.log(C[color](msg.split('\n').map(prepend('   ')).join('\n'))),
	error: msg => {
		console.error(C.red('   ' + msg));
		throw msg;
	},
	fatal: msg => {
		console.error(C.red(`   FATAL: ${ msg }`));
		process.exit(1);
	},
};
