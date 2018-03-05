
const R = require('ramda');

module.exports = (config = {}) => {
	let files = R.defaultTo({}, config.files);
	return {
		getFiles: () => files,
		module: {
			readFile: (path, options) => R.has(path, files) ? Promise.resolve(files[path]) : Promise.reject(`File nonexistent: ${ path }`),
			readFileSync: (path, options) => {
				if (!R.has(path, files)) throw `File nonexistent: ${ path }`;
				return files[path];
			},
			writeFile: (path, data, options) => {
				files(R.assoc(path, data, files));
				return Promise.resolve(true);
			},
			writeFileSync: (path, data, options) => files[path] = data,
			existsSync: path => R.has(path, files),
			renameSync: (oldName, newName) => {
				if (!R.has(oldName, files)) throw `File nonexistent: ${ oldName }`;
				files =
					files
					.into(R.assoc(newName, files[oldName]))
					.into(R.when(() => newName !== oldName, R.dissoc(oldName)));
				if (config.onRename) config.onRename(oldName, newName);
			},
		},
	}
};
