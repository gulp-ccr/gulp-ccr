'use stricts';
var gulp

// TODO: resolve too many dependencies problem. (optionalDependencies?)

var flatten = require('gulp-flatten');
var merge = require('merge-stream');
var path = require('path');
var _ = require('lodash');

var configUtil = require('./util/config_util');
var safeRequireDir = require('./util/safe_require_dir');

var defaults = require('./defaults');

var cwd = process.cwd();

var stuff = {
    flows: safeRequireDir('./flows'),
    streams: safeRequireDir(path.join(cwd, 'gulp/streams'), './streams'),
    recipes: safeRequireDir(path.join(cwd, 'gulp'), path.join(cwd, 'gulp/tasks'), './tasks')
};

function createGulpTasks(useGulp, taskConfigs) {
    var configs;

    gulp = useGulp;

    configs = configUtil.sort(taskConfigs, {}, defaults.consumes);
    createSubGulpTasks('', configs.subTaskConfigs, configs.taskConfig);
    gulp.task('help', helpTaskRunner);
}

function createSubGulpTasks(prefix, subTaskConfigs, parentConfig) {
    var tasks = [];

    _.keys(subTaskConfigs).forEach(function(name) {
        var task = _createGulpTask(name, subTaskConfigs[name]);
        if (task) {
            tasks.push(task);
        }
    });
    return tasks;

    function _createGulpTask(name, taskConfig) {
        var taskInfo, task;

	taskInfo = getTaskRuntimeInfo(name);

        if (name === 'modules') {
            debugger;
        }

        if (taskInfo.hidden === '#') {
            return null;
        }

        task = createTaskRunner(prefix, taskInfo, taskConfig, parentConfig);
        //console.log('creating task: ' + prefix + task.displayName);
        // TODO: call parallel for depends and then remove it from taskConfig.
        if (!task.hidden) {
            // TODO: warning about name collision.
            // TODO: what about the exec order of task's depends and depends' depends?
            // TODO: what about hidden task's depends?
            gulp.task(prefix + task.displayName, taskConfig.depends || [], task);
        }
        return task;
    }
}

var regexRuntimeOptions = /^([.#]?)([-\w]+)([!?]?)$/;

function getTaskRuntimeInfo(name) {
	var match;

	name = _.trim(name);
	match = regexRuntimeOptions.exec(name) || [];
	return {
		name: match[2] || name,
		hidden: match[1] || '',
		runtime: match[3] || ''
	};
}

function createTaskRunner(prefix, taskInfo, taskConfig, parentConfig) {
    var configs, schema, consumes, configurableRunner;

    schema = getTaskSchema(taskInfo.name);
    consumes = getTaskConsumes(taskInfo.name);

    if (schema) {
        configs = configUtil._sort(taskConfig, parentConfig, schema);
    } else {
        configs = configUtil.sort(taskConfig, parentConfig, consumes);
    }

    // if there is a matching recipe, use it and ignore any sub-configs.
    if (isRecipeTask(taskInfo.name)) {
        if (hasSubTaskConfig(configs.subTaskConfigs)) {
            // TODO: warn about ignoring sub-configs.
        }
        configurableRunner = createRecipeTaskRunner(taskInfo, configs.taskConfig);
    }
    // if there is configurations not being consumed, then treat them as subtasks.
    else if (isStreamTask(taskInfo.name, configs.subTaskConfigs)) {
        configurableRunner = createStreamTaskRunner(taskInfo, configs.taskConfig, prefix, configs.subTaskConfigs);
    } else {
        configurableRunner = createSoloTaskRunner(taskInfo, configs.taskConfig);
    }

    return wrapTaskRunner(taskInfo, configs.taskConfig, configurableRunner);
}

function getTaskSchema(name) {
    var schema;
    var configurableTask = stuff.streams[name] || stuff.recipes[name];
    if (configurableTask) {
        schema = configurableTask.schema;
    }
    return schema;
}

function getTaskConsumes(name) {
    var consumes = defaults.consumes;
    var configurableTask = stuff.streams[name] || stuff.recipes[name];
    if (configurableTask) {
        consumes = consumes.concat(configurableTask.consumes);
    }
    return consumes;
}

function isRecipeTask(name) {
    return stuff.recipes[name];
}

function isStreamTask(name, subTaskConfigs) {
    return stuff.streams[name] || hasSubTaskConfig(subTaskConfigs);
}

function hasSubTaskConfig(subTaskConfigs) {
    return _.size(subTaskConfigs) > 0;
}

// TODO: make sure config is inherited at config time and injectable at runtime.
function wrapTaskRunner(taskInfo, taskConfig, configurableRunner) {
    // invoked from stream processor
    var run = function(gulp, injectConfig, stream, done) {
        //inject runtime configuration.
        var config = configUtil.realize(taskConfig, injectConfig, configurableRunner.defaults);
        return configurableRunner(gulp, config, stream, done);
    };
    // invoked from gulp
    var task = function(done) {
        debugger;
        return run(this, taskConfig, null, done);
    };
    task.displayName = taskInfo.name;
    task.description = taskConfig.description || configurableRunner.description;
    task.config = taskConfig;
    task.hidden = taskInfo.hidden;
    task.runtime = taskInfo.runtime;
    task.run = run;
    return task;
}

function createRecipeTaskRunner(taskInfo, taskConfig) {
    return stuff.recipes[taskInfo.name];
}

function createStreamTaskRunner(taskInfo, taskConfig, prefix, subTaskConfigs) {
    // TODO: remove stream runner form parent's config.
    var hidden, streamTask, tasks;

    streamTask = stuff.streams[taskInfo.name];
    if (streamTask) {
        hidden = true;
        taskInfo.hidden = '~';
    } else {
        hidden = taskInfo.hidden;
        streamTask = stuff.streams['merge'];
    }
    if (!hidden) {
        prefix = prefix + taskInfo.name + ':';
    }

    tasks = createSubGulpTasks(prefix, subTaskConfigs, taskConfig);

    return function(gulp, config, stream /*, done*/ ) {
        return streamTask(gulp, config, stream, tasks);
    };
}

function createSoloTaskRunner(taskInfo, taskConfig) {
    var task = taskConfig.task;

    delete taskConfig.task;

    if (typeof task === 'string') {
        return function(gulp, config, stream, done) {
            var task = gulp.task(task);
            if (task.run) {
                return task.run(gulp, config, stream, done);
            }
            // support for tasks registered directlly via gulp.task().
            return task.call(gulp, done);
        };
    }

    if (_.isArray(task)) {
        return function(gulp, config, stream, done) {
            var tasks = task.map(function(name) {
                return gulp.task(name);
            });
            return stuff.streams.parallel(gulp, config, stream, tasks);
        };
    }

    if (typeof task === 'function') {
        return task;
    }

    return stuff.recipes['copy'];
}

function noopConfigurableRunner(gulp, config, stream, done) {
    done();
}

// NOTE:
// TaskRunner is ready for gulp.task() call.
// ConfigurableTask is called with config, and eventually be wrapped as TaskRunner.
function helpTaskRunner(done) {
    Object.keys(gulp.tasks).sort().forEach(function(name) {
        var task = gulp.tasks[name];
        console.log(name);
        console.log(' ', task.fn.description || '(no description)');
        console.log('');
    });
    done();
}

module.exports = createGulpTasks;
