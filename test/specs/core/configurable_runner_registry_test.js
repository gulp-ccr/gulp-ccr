'use strict';

// TODO: resolve too many dependencies problem. (optionalDependencies?)

var Chai = require('chai');
var expect = Chai.expect;

var base = process.cwd();

var test = require(base + '/test/testcase_runner');
var _ = require('lodash');

var ConfigurableRunnerRegistry = require(base + '/src/core/configurable_runner_registry');

describe('Core', function () {
	describe('ConfigurableTaskRegistry', function () {
		describe('constructor()', function () {
			it('should take a hash object of tasks', function () {
				var actual = new ConfigurableRunnerRegistry({
					task: function() {}
				});
				expect(actual).to.be.instanceof(ConfigurableRunnerRegistry);
				expect(actual.size()).to.equal(1);
			});
		});
		describe('lookup()', function () {
			var actual = new ConfigurableRunnerRegistry({
				task: function() {}
			});
			it('should return a function if found, otherwise, undefined', function () {
				expect(actual.lookup('task')).to.be.a('function');
				expect(actual.lookup('none')).to.be.an('undefined');
			});
		});
	});
});