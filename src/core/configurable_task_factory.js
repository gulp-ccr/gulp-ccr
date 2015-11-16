'use strict';
var _ = require('lodash'),
	log = require('gulp-util').log;

var Configuration = require('./configuration'),
	ConfigurationError = require('./configuration_error');

function ConfigurableTaskFactory(stuff, runnerFactory, registry) {
	this.stuff = stuff;
	this.runnerFactory = runnerFactory;
	this.registry = registry;
}

ConfigurableTaskFactory.prototype.one = function(prefix, name, rawConfig, parentConfig) {
	var stuff, schema, configs, taskInfo, runner, task;

	stuff = this.stuff;

	taskInfo = Configuration.getTaskRuntimeInfo(name);

	if (rawConfig.debug) {
		debugger;
	}

	schema = getTaskSchema(taskInfo.name);
	configs = Configuration.sort(taskInfo, rawConfig, parentConfig, schema);

	if (Configuration.isDisabled(configs.taskInfo)) {
		return null;
	}

	runner = this.runnerFactory.create(prefix, configs, this.multiple.bind(this));
	if (! runner) {
		log("Warning: can't infer to a proper recipe task: " + taskInfo.name + ': task will do nothing.');
		runner = function(gulp, config, stream, done) { done(); };
	}
	task = this.create(prefix, taskInfo, configs.taskConfig, runner);
	if (Configuration.isVisible(task)) {
		this.registry.set(task.displayName, task);
	}
	return task;

	function getTaskSchema(name) {
		var configurableTask = stuff.streams.lookup(name) || stuff.recipes.lookup(name);
		return configurableTask && configurableTask.schema || {};
	}
};

ConfigurableTaskFactory.prototype.multiple = function(prefix, subTaskConfigs, parentConfig) {
	var self, tasks = [];

	self = this;

	Object.keys(subTaskConfigs).forEach(function (name) {
		var task = self.one(prefix, name, subTaskConfigs[name], parentConfig);
		if (task) {
			tasks.push(task);
		}
	});
	return tasks;
};

// TODO: consider using [medikoo/es6-weak-map](https://github.com/medikoo/es6-weak-map) to store metadata?
ConfigurableTaskFactory.prototype.create = function(prefix, taskInfo, taskConfig, configurableRunner) {
	var registry = this.registry;
	// make sure config is inherited at config time and injected, realized at runtime.
	// invoked from stream processor
	var run = function(gulp, injectConfig, stream, done) {
		// inject and realize runtime configuration.
		// TODO: let json-normalizer add defaults.
		var config = Configuration.realize(taskConfig, injectConfig, configurableRunner.defaults);
		return configurableRunner(gulp, config, stream, done);
	};
	// invoked from gulp
	var configurableTask = function(done) {
		// NOTE: gulp 4.0 task are called on undefined context. So we need gulp reference from registry here.
		return run(registry.gulp, taskConfig, null, done);
	};
	configurableTask.displayName = prefix + (taskInfo.name || configurableRunner.displayName || configurableRunner.name || '<anonymous>');
	configurableTask.description = taskInfo.description || configurableRunner.description;
	configurableTask.visibility = taskInfo.visibility;
	configurableTask.runtime = taskInfo.runtime;
	configurableTask.run = run;
	configurableTask.config = taskConfig;
	return configurableTask;
};

module.exports = ConfigurableTaskFactory;
