
const gulp = require('gulp')
const del = require('del')
const fs = require('fs')
const runSequence = require('run-sequence')
const util = require('gulp-util')
const rollup = require('rollup').rollup
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')
const nodeResolve = require('rollup-plugin-node-resolve')
const connect = require('gulp-connect')
const bump = require('gulp-bump')
const git = require('gulp-git')
const conventionalGithubReleaser = require('conventional-github-releaser')
const insert = require('gulp-insert')
const jsdoc = require('gulp-jsdoc3');

// Configs for all tasks
// Comments are just examples how to add posible configurations to the tasks
const rollupConf = {
  entry: 'src/index.js',
  plugins: [
    //nodeResolve({ jsnext: true }),
    babel({ runtimeHelpers: true }),
    commonjs({
      //include: 'node_modules/**'
    })
   ]
}

//A self-executing function, suitable for inclusion as a <script> tag format
const iifeBundleConf = {
  format: 'iife',
  moduleName: 'component',
  dest: 'build/index.iife.js'
}

//CommonJS, suitable for Node and Browserify/Webpack format
const cjsBundleConf = {
  format: 'cjs',
  dest: 'build/index.js'
}

//example server confin
const exampleServConf = {
  root: ['example'],
  port: 8080,
  livereload: true
}
gulp.task('server:example', () => connect.server(exampleServConf))
gulp.task('reload-js', () => gulp.src('build/*.js').pipe(connect.reload()))

gulp.task('doc', function(cb) {
  gulp.src(['./src/**/*.js'], {read: false})
      .pipe(jsdoc(cb));
});

gulp.task('build:iife', () => rollup(rollupConf).then((bundle) => bundle.write(iifeBundleConf)))
gulp.task('build:cjs', () => rollup(rollupConf).then((bundle) => bundle.write(cjsBundleConf)))
gulp.task('build', ['build:cjs', 'build:iife'])
gulp.task('clean', () => del(['build']) )

gulp.task('watch', () => {
  gulp.watch('src/*.js', ['build:iife', 'build:cjs'])
})

// Tasks for the github release
gulp.task('bump-ver', () => {
  const options = { type: util.env.type || 'patch' }
  gulp.src('./package.json')
    .pipe(bump(options)).on('error', util.log)
    .pipe(gulp.dest('./'))
})

//git commit task
gulp.task('commit-changes', () => gulp.src('.')
  .pipe(git.add())
  .pipe(git.commit('Bumped version number'))
)

//git push taks
gulp.task('push-changes', cb => git.push('origin', 'master', cb))

//git create new tag task
gulp.task('create-new-tag', cb => {
  const version = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version
  git.tag(version, 'Created Tag for version: ' + version, error => {
    if (error) return cb(error)
    git.push('origin', 'master', { args: '--tags' }, cb)
  })
})

//github release task
gulp.task('github-release', done => {
  conventionalGithubReleaser({
    type: 'oauth',
    token: process.env.OAUTH // change this to your own GitHub token or use an environment variable
  }, {}, done)
})

gulp.task('release', callback => {
  runSequence(
    'bump-ver',
    'commit-changes',
    'push-changes',
    'create-new-tag',
    'github-release',
    error => {
      if (error) {
        console.log(error.message)
      } else {
        console.log('Release done')
      }
      callback(error)
    })
})

gulp.task('default', ['clean', 'watch'])
