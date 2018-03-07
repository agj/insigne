'use strict';

const proxyquire = require('proxyquire').noCallThru();
const test = require('blue-tape');
const R = require('ramda');
require('dot-into').install();

const prepare = require('./prepare');

const makeCounter = () => {
	let n = 0;
	return () => n++;
};


test("Rename three files simultaneously.", async assert => {
	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt']);

	const result = await p.done;

	assert.false(p.getHasErrors(), "No error message.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/changed file 1.txt':  'file 1 contents',
			'/first/folder/changed file 2.txt':  'file 2 contents',
			'/second/folder/changed file 3.txt': 'file 3 contents',
			'/second/folder/file 4.txt':         'file 4 contents',
		},
		"Files changed.");
});

test("Rename three files in succession.", async assert => {
	assert.plan(2);

	const count = makeCounter();
	const sequence = [
		() => p.setTemp([
			'changed file 1.txt',
			'file 2.txt',
			'file 3.txt']),
		() => p.setTemp([
			'changed file 1.txt',
			'changed file 2.txt',
			'file 3.txt']),
		() => p.setTemp([
			'changed file 1.txt',
			'changed file 2.txt',
			'changed file 3.txt']),
	];

	const perform = turn => turn < sequence.length ? sequence[turn]() : null;
	const performNext = () => perform(count());

	const p = prepare({ onRename: performNext });

	await p.ready;

	performNext();

	const result = await p.done;

	assert.false(p.getHasErrors(), "No error message.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/changed file 1.txt':  'file 1 contents',
			'/first/folder/changed file 2.txt':  'file 2 contents',
			'/second/folder/changed file 3.txt': 'file 3 contents',
			'/second/folder/file 4.txt':         'file 4 contents',
		},
		"Files changed.");
});

test("Filenames should be sorted by path in temp file.", async assert => {
	assert.plan(1);

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

	await p.ready;
	await p.done;

	assert.deepEqual(
		p.getTemp(),
		[
			'file c.txt',
			'file a.txt',
			'file b.txt',
		].join('\n'),
		"Filenames correctly sorted.");
});

test("Fail if temp file has too few lines.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Fail if temp file has too many lines.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt',
		'something extra']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Fail if temp file has blank lines.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'',
		'changed file 3.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Fail when target filename exists.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'file 4.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Fail when paths are identical.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 1.txt',
		'changed file 3.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Proceed when filenames but not paths are identical.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 3.txt',
		'changed file 3.txt']);

	const result = await p.done;

	assert.false(p.getHasErrors(), "No error message.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/changed file 1.txt':  'file 1 contents',
			'/first/folder/changed file 3.txt':  'file 2 contents',
			'/second/folder/changed file 3.txt': 'file 3 contents',
			'/second/folder/file 4.txt':         'file 4 contents',
		},
		"Files changed.");
});

test("Fail when target paths overlap with original paths.", async assert => {
	assert.plan(2);

	const p = prepare();

	await p.ready;

	p.setTemp([
		'file 2.txt',
		'file 1.txt',
		'file 3.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.deepEqual(p.getFiles(), p.initialFiles, "Files unchanged.");
});

test("Should hard fail when a file goes missing before renaming.", async assert => {
	assert.plan(3);

	const p = prepare();

	await p.ready;

	p.fs.renameSync('/first/folder/file 2.txt', '/first/folder/file 2 gone.txt');
	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt']);

	const result = await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.ok(p.getFatalExit(), "Exit code 1.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/file 1.txt':       'file 1 contents',
			'/first/folder/file 2 gone.txt':  'file 2 contents',
			'/second/folder/file 3.txt':      'file 3 contents',
			'/second/folder/file 4.txt':      'file 4 contents',
		},
		"Files untouched.");
});

test("Should hard fail when a file goes missing after renaming started.", async assert => {
	assert.plan(3);

	const onRename = R.once(() => p.fs.renameSync('/first/folder/file 2.txt', '/first/folder/file 2 gone.txt'));
	const p = prepare({ onRename: onRename });

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt']);

	await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.ok(p.getFatalExit(), "Exit code 1.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/changed file 1.txt': 'file 1 contents',
			'/first/folder/file 2 gone.txt':    'file 2 contents',
			'/second/folder/file 3.txt':        'file 3 contents',
			'/second/folder/file 4.txt':        'file 4 contents',
		},
		"Files modified until error.");
});

test("Should hard fail when a file with the target filename appears after renaming started.", async assert => {
	assert.plan(3);

	const onRename = R.once(() => p.fs.writeFileSync('/first/folder/changed file 2.txt', 'jammed in'));
	const p = prepare({ onRename: onRename });

	await p.ready;

	p.setTemp([
		'changed file 1.txt',
		'changed file 2.txt',
		'changed file 3.txt']);

	await p.done;

	assert.ok(p.getHasErrors(), "Error message.");
	assert.ok(p.getFatalExit(), "Exit code 1.");
	assert.deepEqual(
		p.getFiles(),
		{
			'/first/folder/changed file 1.txt': 'file 1 contents',
			'/first/folder/file 2.txt':         'file 2 contents',
			'/first/folder/changed file 2.txt': 'jammed in',
			'/second/folder/file 3.txt':        'file 3 contents',
			'/second/folder/file 4.txt':        'file 4 contents',
		},
		"Files modified until error.");
});


