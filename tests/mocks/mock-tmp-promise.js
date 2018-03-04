
module.exports = config => {
	const module = {
		file: () => {
			config.onCreateFile(true);
			return Promise.resolve({ path: config.path });
		},
	};
	return module;
};
