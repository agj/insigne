
module.exports = input => {
	const module = {
		args: input.args,

		version: R.always(module),
		description: R.always(module),
		usage: R.always(module),
		parse: R.always(module),
		help: R.always(module),
	};
	return module;
};
