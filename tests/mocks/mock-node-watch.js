
const flyd = require('flyd');

module.exports = config => path => ({
	on: (type, callback) => {
		config.changes.into(flyd.on(path => callback('update', path)));
		setTimeout(() => callback('update', path), 0);
	},
});
