
const R = require('ramda');

module.exports = config => {
	let changeSubscribers = {};
	const changed = (path) => {
		R.defaultTo([], changeSubscribers[path])
			.forEach(cb => {
				setTimeout(() => {
					cb('update', path)
				})
			});
	};
	return {
		changed: changed,
		module: path => ({
			on: (type, callback) => {
				if (type === 'change') {
					changeSubscribers[path] =
						R.defaultTo([], changeSubscribers[path])
						.into(R.append(callback))
						.into(R.uniq);
				}
			},
		}),
	};
};
