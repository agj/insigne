
const R = require('ramda');
const flyd = require('flyd');


const attempt = (fn, streams = []) => (...args) => {
	try {
		return fn(...args);
	} catch (e) {
		console.error('STREAM EXCEPTION', e);
		streams.forEach(s => s.end(true));
	}
};

const make = flyd.stream;

const on = R.curry((fn, st) => flyd.on(attempt(fn, [st]), st));

const map = R.curry((fn, st) => flyd.map(attempt(fn, [st]), st));

const combine = R.curry((fn, sts) => flyd.combine(attempt(fn, sts), sts));

const filter = require('flyd/module/filter');

const take = R.curry((n, stream) => {
	let count = 0;
	return combine((stream, self) => {
			if (count >= n) self.end(true);
			else            self(stream());
			count++;
		}, [stream]);
});

const pairs = stream => {
	const r = make();
	let prev = stream();
	stream.into(on(v => {
		r([prev, v]);
		prev = v;
	}));
	return r;
};


module.exports = {
	make,
	on,
	map,
	filter,
	take,
	pairs,
};
