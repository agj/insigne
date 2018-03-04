
const mockCLI = require('mock-cli');

module.exports = (...args) => {
	let kill;
	const p = new Promise((resolve, reject) => {
		const callback = (err, res) => {
			if (err) reject(err);
			else     resolve(res);
		}
		kill = mockCLI(...args, callback);
	});
	return [p, kill];
};
