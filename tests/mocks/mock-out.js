
const R = require('ramda');

module.exports = (config = {}) => {
	let stdout = [];
	let stderr = [];
	let fatal = false;
	return {
		getMessages: () => stdout,
		getErrors: () => stderr,
		getFatalExit: () => fatal,
		module: {
			message: (msg, color = 'white') => {
				stdout = stdout.into(R.append(msg));
				console.log('MESSAGE:', msg);
				if (config.onMessage) config.onMessage(msg);
			},
			error: msg => {
				stderr = stderr.into(R.append(msg))
				console.log('ERROR:', msg);
				if (config.onError) config.onError(msg);
				throw msg;
			},
			fatal: msg => {
				stderr = stderr.into(R.append(msg))
				fatal = true;
				console.log('FATAL:', msg);
				if (config.onFatal) config.onFatal(msg);
				throw msg;
			},
		},
	};
};
