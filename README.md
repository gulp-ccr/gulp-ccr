# configurable-gulp-recipes (Alpha)

Gulp 4.0 recipes ready to use and configurable. An elegant, intuition way to reuse gulp tasks.

## Install
``` bash
$ npm install --save-dev https://github.com/amobiz/configurable-gulp-recipes.git
```

## Terminology

### Gulp Task

A gulp task is a function you register using `gulp.task()` method, and then run it from CLI.

Starting from gulp 4.0, a gulp task takes `undefined` as context, and returns promises, observables, child processes or streams, or call `done()` callback when finished.
``` javascript
function gulpTask(done) {
    assert(this === null);
    // do things ...
    done();
}

gulp.task(gulpTask);
```

### Configurable Task

A configurable task has signature same as normal gulp task, and can be used just as a normal gulp task. But, were called with an object: `{ gulp, config, upstream }` as context.
``` javascript
// You don't write configurable task but configuration.
// The plugin generates configurable task for you.
function configurableTask(done) {
    done();
}
```

You don't write configurable tasks, instead, you create a configurable task by defining a configuration, and call `configure()` function.
``` javascript
var gulp = require('gulp');
var configure = require('configurable-gulp-recipes');
var recipes = configure({
    scripts: {
        src: 'src/**/*.js',
        dest: 'dist'
    }
});
gulp.registry(recipes);
```
This generates a configurable task called "`scripts`" for you, and can be accessed via `recipes.get('scripts')`. The configurable task will be called with the configuration defined with it, some kind of like this:
``` javascript
scripts.call({
    gulp: gulp,
    config: {
        src: 'src/**/*.js',
        dest: 'dist'
    }
}, done);
```

Note the `configure()` function returns a registry, you can call `gulp.registry()` to register all available tasks in the registry.

### Configurable Recipe

A configurable recipe is the actual function that do things, and also has signature same as normal gulp task. A configurable recipe is the actual __recipe__ you want to write and reuse. In fact, "configurable task" is simply a wrapper that calls "configurable recipe" with exactly the same name.
``` javascript
function configurableRecipe(done) {
    var context = this,
        gulp = context.gulp,
        config = context.config;
    // do things ...
    done();
}
```

## Writing Configurations

### Nesting Task

Tasks can be nested. Sub tasks lexically inherits its parent's configurations. And even better, for some predefined properties, e.g. `src`, `dest`, paths are joined automatically.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    build: {
        scripts: {
            src: '**/*.js'
        },
        styles: {
            src: '**/*.css'
        }
    }
});
```
This creates __3__ configurable tasks for you: "`build`", "`build:scripts`" and "`build:styles`".

### Parallel Tasks

In the above example, when you run `build`, its sub tasks `scripts` and `styles` will be executed in __parallel__, and be called with configurations like this:
``` javascript
scripts: {
    src: 'src/**/*.js',
    dest: 'dist'
}

styles: {
    src: 'src/**/*.css',
    dest: 'dist'
}
```

### Series Tasks

If you want sub tasks be executed in __series__, you can use `series` "flow controller", and add `order` property to them:
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    build: {
        series: {
            scripts: {
                src: '**/*.js',
                order: 0
            },
            styles: {
                src: '**/*.css',
                order: 1
            }
        }
    }
});
```
Or even simpler, just put sub task configurations in array:
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    build: [{
        name: 'scripts',
        src: '**/*.js'
    }, {
        name: 'styles',
        src: '**/*.css'
    }]
};
```

### Referencing Task

You can reference other task by its name.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    clean: {},
    scripts: {
        src: '**/*.js'
    },
    styles: {
        src: '**/*.css'
    },
    build: ['clean', ['scripts', 'styles']]
};
```

Referencing tasks won't generate new task names, so you can't run them in console. In this example, only `clean`, `scripts`, `styles` and `build` task were generated.

As said previously, sub tasks lexically inherits its parent's configurations, since refered tasks are not defined under the referencing task, they won't inherit its static configuration. However, dynamic generated configurations are still injected to refered tasks. See [Dynamic Configuration] for detail.

Note in the above example, `scripts` and `styles` are in array, so they will be executed in series. You can use `parallel` "flow controller" to change this default behavior.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    clean: {},
    scripts: {
        src: '**/*.js'
    },
    styles: {
        src: '**/*.css'
    },
    build: ['clean', { parallel: ['scripts', 'styles'] }]
};
```

Or you can put them into a common parent, so they will be executed parallel by default. To reference sub tasks, use their full name.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    clean: {},
    make: {
        scripts: {
            src: '**/*.js'
        },
        styles: {
            src: '**/*.css'
        }
    },
    build: ['clean', 'make'],
    watch: ['make:scripts', 'make:styles']
});
```

You can use `task` property to specify the referred tasks, so referencing tasks can have their own configurations.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    clean: {},
    make: {
        scripts: {
            src: '**/*.js'
        },
        styles: {
            src: '**/*.css'
        }
    },
    build: ['clean', 'make'],
    watch: {
    options: {
        usePolling: true
    },
    task: ['make:scripts', 'make:styles']
    }
};
```

### Plain / Inline Function
Tasks can be plain Javascript functions and be referenced directly, or can be defined inline and be referenced by name.
``` javascript
function clean(done) {
    del(this.dest.path, done);
}

var recipes = configure({
    src: 'src',
    dest: 'dist',
    scripts: function (done) {
    },
    styles: function (done) {
    },
    build: [clean, { parallel: ['scripts', 'styles'] }]
};
```
Note in this example, since `clean` was never defined in configuration, it is never exposed, i.e., can't be run in CLI. The other thing to note is that even plain functions are called in the `{ gulp, config, upstream }` context.

You can use `task` property to specify the plain/inline functions, so referencing tasks can have their own configurations too.
``` javascript
function clean(done) {
    del(this.dest.path, done);
}

var recipes = configure({
    src: 'src',
    dest: 'dist',
    make: {
        scripts: {
            src: '**/*.js',
            task: function (done) {
            }
        },
        styles: {
            src: '**/*.css',
            task: function (done) {
            }
        }
    },
    build: {
    options: {
        usePolling: true
    },
    task: [clean, 'make']
    }
};
```

### Invisible Task
Do not expose a task to CLI and can't be referenced, without affacting its sub tasks. Since it's invisible, its sub tasks won't prefix it's name, but still inherit its configuration. A invisible task is still functional if invoked from its parent task.
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    scripts: {
        '.concat': {
            hidden: true,
            file: 'bundle.js',
            src: 'lib',
            coffee: {
                src: '**/*.coffee'
            },
            js: {
                src: '**/*.js'
            }
        }
    }
};

```
In this example the `concat` task is invisible.

### Disabled Task
Disable a task and all its sub tasks. Not defined at all.


### Conditional Configurations
Configurable-gulp-recipes supports conditional configurations via rumtime environment modes.
By default, `development`, `production` and `staging` modes are supported. You can write your configurations for each specific mode under sections with keys `development`/`dev`, `production`/`prod` and `staging` respectively.

For example, with the following configuration:
``` javascript
{
    scripts: {
        // common configs
        src: 'src',

        options: {
            // common options

            dev: {
                // development options
                description: 'development mode',
                sourcemap: false
            },

            prod: {
                // production options
                description: 'production mode',
                sourcemap: 'external'
            }
        },

        development: {
            // development configs
            description: 'development mode',
            dest: 'build',

            options: {
                // development options
                debug: true
            },

            // sub tasks for development mode
            lint: {
            }
        },

        // sub tasks

        typescript: {
            src: '**/*.ts'
        },

        js: {
            src: '**/*.js'
        },

        production: {
            // production configs
            description: 'production mode',
            dest: 'dist',

            options: {
                // production options
                debug: false
            },

            // sub tasks for production mode
            all: [ 'uglify', 'concat' ]
        }
    }
}
```

In `development` mode will becomes:
``` javascript
{
    scripts: {
        src: 'src',
        dest: 'build',
        options: {
            description: 'development mode',
            sourcemap: false,
            debug: true
        },
        description: 'development mode',
        lint: {
        },
        typescript: {
            src: '**/*.ts'
        },
        js: {
            src: '**/*.js'
        }
    }
}
```

And in `production` mode will becomes:
``` javascript
{
    scripts: {
        src: 'src',
        dest: 'dist',
        options: {
            description: 'production mode',
            sourcemap: 'external',
            debug: false
        },
        typescript: {
            src: '**/*.ts'
        },
        js: {
            src: '**/*.js'
        },
        description: 'production mode',
        all: [ 'uglify', 'concat' ]
    }
}
```
Super!

#### Run Gulp in Specific Runtime Environment Mode

##### Via CLI Argument
``` bash
$ gulp --development build
```
Or, for short:
``` bash
$ gulp --dev build
```

##### Via Environment Variable
In Linux/Unix:
``` bash
$ NODE_ENV=development gulp build
```
Or, for short:
``` bash
$ NODE_ENV=dev gulp build
```

#### Customizing Rumtime Environment Modes
Rumtime environment modes are totally configurable too. If you are a minimalist, you can even use `d`, `p` and `s` for `development`, `production` and `staging` respectively, just remember that your configurations and rumtime environment modes are in sync.
``` javascript
var config = {
    scripts: {
        src: 'src',
        lint: {
        },
        d: {
            debug: true
        },
        p: {
            debug: false,
            sourcemap: 'external',
            uglify: {
            },
            concat: {
            }
        }
    }
};
var options = {
    modes: {
        production: 'p',
        development: 'd',
        staging: 's',
        default: 'production'
    },
    defaultMode: 'production'
};
var recipes = configure(config, options);
```
If `options.modes.default` is not specified, first mode will becomes default. However, it's recommended not to skip.

Moreover, you can design any modes you want, with alias supported.
``` javascript
var config = {};
var modes = {
    build: ['b', 'build'],
    compile: ['c', 'compile'],
    deploy: ['d', 'deploy', 'deployment'],
    review: ['r', 'review']
    default: 'build'
};
```

However, you can't use [keywords] reserved for task information, of course.

## Writing Recipes

There are 3 kinds of recipes: "task", "stream processor" and "flow controller".

If you write recipes only for your own project use, you can put them in sub folders within your project's root folder:

type            |folder
----------------|------------------
task            |gulp, gulp/tasks
stream processor|gulp/streams
flow controller |gulp/flows

If you willing to share your recipes, you can write them as plugins. Check out [Writing Plugins] for how.

If your recipes do not need configuration, you can write them just as normal gulp tasks. That is, your existing gulp tasks are already reusable recipes! You just need to put them in a standalone module file separately, and put to the "gulp" folder within your project's root folder.

To use your existing recipe, write a configuration with a property name exactly same as your recipe's module name.
For example, say you have your "my-recipe.js" recipe in `<your-project>/gulp` folder. Write a configuration to reference it:
``` javascript
var recipes = configure({
    "my-recipe": {}
});
```
Then you can run it by executing `gulp my-recipe` from console.

However, configurations helps maximizing the reusability of recpies. A configurable recipe takes its configurations via its execution context, i.e., `this` variable.
``` javascript
function scripts(done) {
    var gulp = this.gulp,
        config = this.config;

    return gulp.src(config.src.globs)
        .pipe(eslint())
        .pipe(concat(config.file))
        .pipe(uglify())
        .pipe(gulp.dest(config.dest.path));
}

module.exports = scripts;
```
And can be configured as:
``` javascript
var recipes = configure({
    src: 'src',
    dest: 'dist',
    scripts: {
        src: '**/*.js',
        file: 'bundle.js'
    }
});
```

### Dynamic Configuration / Template Variable Realizing

Some stream processors (e.g., "gulp-recipe-eachdir") programmatically modify and/or generate new configurations. The new configuratuin are injected to recipe's configuration at runtime. And templates with `${var}` syntax are realized with resolved variables.

### Development / Production Mode

Configurable recipes don't have to worry about development/production mode. Configurations are resolved for that specific mode already.

### Reserved Configuration Properties

#### name
Name of the task. Only required when defining task in an array and you want to run it from CLI.

#### description
Description of the task.

#### order
Execution order of the task. Only required when you defining tasks in object and want them be executed in series. The values are used for sort, so don't have to be contiguous.

#### runtime
Execution time of the task. Valid values are `all`, `production` and `development`. Defaults to `all`.

#### task
Define a plain, inline or reference task.

#### visibility
Visibility of the task. Valid values are `normal`, `invisible` and `disabled`.

#### options
Additional options to pass to task. Usually used by underling gulp plugins.

#### src

#### dest

## Building Recipes

### Task

#### clean

#### copy

#### help




### Stream Processor
A stream processor manipulates its sub tasks' input and/or output streams.

In the "Configurable Recipe" section, that said "configurable task" is simply a wrapper that calls "configurable recipe" with exactly the same name. That's not entirely true. Stream processor may not has the same name as "configurable task".

#### merge
A merge stream processor creates a new stream, that ends only when all its sub tasks' stream ends.
See [merge-stream](https://www.npmjs.com/package/merge-stream) for details.

#### queue
A queue stream processor creates a new stream, that pipe queued streams of its sub tasks progressively, keeping datas order.
See [streamqueue](https://www.npmjs.com/package/streamqueue) for details.

#### pipe
Provides the same functionality of `gulp.pipe()`. Pipe streams from one sub task to another.



### Flow Controller
A flow controller takes care of when to execute, and execution order of its sub tasks and don't care their input and/or output streams.

#### parallel

#### series

#### watch


## Writing Plugins

### Configuration Schema

Configurable-gulp-recipes uses "[json-normalizer](https://www.npmjs.com/package/json-normalizer)" to normalize json configurations. You can define your configuration schema to support property alias, type convertion and default values, etc.

### Test Plugin



## List of Recipe Plugins

### Task

#### configurable-gulp-recipe-atomify
#### configurable-gulp-recipe-babel
#### configurable-gulp-recipe-browserify
#### configurable-gulp-recipe-bump
#### configurable-gulp-recipe-css
#### configurable-gulp-recipe-eslint
#### configurable-gulp-recipe-images
#### configurable-gulp-recipe-jscs
#### configurable-gulp-recipe-jshint
#### configurable-gulp-recipe-markups
#### configurable-gulp-recipe-stylus
#### configurable-gulp-recipe-uglify
#### configurable-gulp-recipe-webpack

### Stream Processor

#### configurable-gulp-recipe-concat
#### configurable-gulp-recipe-each
#### configurable-gulp-recipe-each-dir

### Flow Controller

#### configurable-gulp-recipe-if

### Filter

#### configurable-gulp-recipe-newer
#### configurable-gulp-recipe-changed
