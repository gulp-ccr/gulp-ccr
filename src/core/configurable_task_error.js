'use strict';

var inherits = require('util').inherits,
	PluginError = require('gulp-util').PluginError;

function ConfigurableTaskError(plugin, message, options) {
	PluginError.call(this, plugin, message, options);
}

inherits(ConfigurableTaskError, PluginError);
ConfigurableTaskError.prototype.name = 'ConfigurableTaskError';

module.exports = ConfigurableTaskError;
