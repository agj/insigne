'use strict';

const proxyquire = require('proxyquire').noCallThru();
const test = require('tape');
const flyd = require('flyd');
const R = require('ramda');
require('dot-into').install();

const prepare = require('./prepare');


test("Rename three files once.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt']));

	p.done.then(result => {
		assert.equal(result.stderr, '', "No error message.");
		assert.deepEqual(
			p.files(),
			{
				'/first/folder/changed file 1.txt':  'file 1 contents',
				'/first/folder/changed file 2.txt':  'file 2 contents',
				'/second/folder/changed file 3.txt': 'file 3 contents',
				'/second/folder/file 4.txt':         'file 4 contents',
			},
			"Files changed.");
	})
	.catch(console.error);
});

test("Fail if temp file has too few lines.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 2.txt']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Fail if temp file has too many lines.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt',
		'something extra']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Fail if temp file has blank lines.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'',
		'changed file 3.txt',
		'something extra']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Fail when target filename exists.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'file 4.txt']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Fail when paths are identical.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 1.txt',
		'changed file 3.txt']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Proceed when filenames but not paths are identical.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'changed file 1.txt',
		'changed file 3.txt',
		'changed file 3.txt']));

	p.done.then(result => {
		assert.equal(result.stderr, '', "No error message.");
		assert.deepEqual(
			p.files(),
			{
				'/first/folder/changed file 1.txt':  'file 1 contents',
				'/first/folder/changed file 3.txt':  'file 2 contents',
				'/second/folder/changed file 3.txt': 'file 3 contents',
				'/second/folder/file 4.txt':         'file 4 contents',
			},
			"Files changed.");
	})
	.catch(console.error);
});

test("Fail when target paths overlap with original paths.", assert => {
	assert.plan(2);

	const p = prepare();

	p.ready.then(() => p.changeTemp([
		'file 2.txt',
		'file 1.txt',
		'file 3.txt']));

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(p.files(), p.initialFiles, "Files unchanged.");
	})
	.catch(console.error);
});

test("Filenames should be sorted by path in temp file.", assert => {
	assert.plan(2);

	const p = prepare({
		files: {
			'/folder/a/file c.txt': 'c',
			'/folder/c/file b.txt': 'b',
			'/folder/b/file a.txt': 'a',
		},
		args: [
			'/folder/b/file a.txt',
			'/folder/c/file b.txt',
			'/folder/a/file c.txt',
		],
	});

	p.ready.then(() =>
		assert.deepEqual(
			p.getTemp(),
			[
				'file c.txt',
				'file a.txt',
				'file b.txt',
			].join('\n'),
			"Filenames correctly sorted."));
	p.done.then(() =>
		assert.ok(true, "Done."));
});

test("Should hard fail when a file goes missing before renaming.", assert => {
	assert.plan(3);

	const p = prepare();

	p.ready.then(() => {
		p.fs.renameSync('/first/folder/file 2.txt', '/first/folder/file 2 gone.txt');
		p.changeTemp([
			'changed file 1.txt',
			'changed file 2.txt',
			'changed file 3.txt']);
	});

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.deepEqual(
			p.files(),
			{
				'/first/folder/file 1.txt':       'file 1 contents',
				'/first/folder/file 2 gone.txt':  'file 2 contents',
				'/second/folder/file 3.txt':      'file 3 contents',
				'/second/folder/file 4.txt':      'file 4 contents',
			},
			"Files untouched.");
		assert.equal(result.code, 1, "Exit code 1");
	})
	.catch(console.error);
});

test("Should hard fail when a file goes missing after renaming started.", assert => {
	assert.plan(3);

	const onRename = R.once(() => p.fs.renameSync('/first/folder/file 2.txt', '/first/folder/file 2 gone.txt'));
	const p = prepare({ onRename: onRename });

	p.ready.then(() => {
		console.log(p.files());
		p.changeTemp([
			'changed file 1.txt',
			'changed file 2.txt',
			'changed file 3.txt']);
	});

	p.done.then(result => p.files.into(flyd.on(() => {
		console.log(p.files());
		assert.notEqual(result.stderr, '', "Error message.");
		assert.equal(result.code, 1, "Exit code 1");
		assert.deepEqual(
			p.files(),
			{
				'/first/folder/changed file 1.txt': 'file 1 contents',
				'/first/folder/file 2 gone.txt':    'file 2 contents',
				'/second/folder/file 3.txt':        'file 3 contents',
				'/second/folder/file 4.txt':        'file 4 contents',
			},
			"Files modified until error.");
	})))
	.catch(console.error);
});

test("Should hard fail when a file with the target filename appears after renaming started.", assert => {
	assert.plan(3);

	const onRename = R.once(() => p.fs.writeFileSync('/first/folder/changed file 2.txt', 'jammed in'));
	const p = prepare({ onRename: onRename });

	p.ready.then(() => {
		p.changeTemp([
			'changed file 1.txt',
			'changed file 2.txt',
			'changed file 3.txt']);
	});

	p.done.then(result => {
		assert.notEqual(result.stderr, '', "Error message.");
		assert.equal(result.code, 1, "Exit code 1");
		assert.deepEqual(
			p.files(),
			{
				'/first/folder/changed file 1.txt': 'file 1 contents',
				'/first/folder/file 2.txt':         'file 2 contents',
				'/first/folder/changed file 2.txt': 'jammed in',
				'/second/folder/file 3.txt':        'file 3 contents',
				'/second/folder/file 4.txt':        'file 4 contents',
			},
			"Files modified until error.");
	})
	.catch(console.error);
});


