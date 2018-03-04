
const R = require('ramda');

module.exports = () => {
	let files = {};
	return {
		setFiles: newFiles => files = newFiles,
		getFiles: () => files,
		module: {
			readFile: (path, options) => R.has(path, files) ? Promise.resolve(files[path]) : Promise.reject(`File nonexistent: ${ path }`),
			readFileSync: (path, options) => {
				if (!R.has(path, files)) throw `File nonexistent: ${ path }`;
				return files[path];
			},
			writeFile: (path, data, options) => {
				files[path] = data;
				return Promise.resolve(true);
			},
			writeFileSync: (path, data, options) => files[path] = data,
			existsSync: path => R.has(path, files),
			renameSync: (oldName, newName) => {
				if (!R.has(oldName, files)) throw `File nonexistent: ${ oldName }`;
				files[newName] = files[oldName];
				if (newName !== oldName) delete files[oldName];
			},
		},
	}
};
