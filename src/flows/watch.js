'use strict';

/**
 * 基本想法：
 *   watch 只要指定相依的 task 即可。
 *   然後自動由相依的 task 找出需要監控的對應檔案，
 *   並在檔案變動時，自動執行相關的 task。
 *
 * Recipe:
 * watch
 *
 * Ingredients:
 * gulp.watch()
 *
 */
function watch(done) {
	var context = this,
		gulp = context.gulp,
		options = context.config.options || {},
		tasks = context.tasks;

	// watch tasks' sources
	tasks.forEach(function (task) {
		if (task.config && task.config.src) {
			gulp.watch(task.config.src.globs, options, task);
		}
	});
}

watch.schema = {
	"title": "watch",
	"description": "see https://github.com/paulmillr/chokidar for options",
	"type": "object",
	"properties": {
		"options": {
			"properties": {
				"persistent": {},
				"ignored": {},
				"ignoreInitial": {},
				"followSymlinks": {},
				"cwd": {},
				"usePolling": {},
					"interval": {},
					"binaryInterval": {},
				"useFsEvents": {},
				"alwaysStat": {},
				"depth": {},
				"awaitWriteFinish": {},
				"ignorePermissionErrors": {},
				"atomic": {}
			}
		}
	}
};

watch.type = 'flow';

module.export = watch;
