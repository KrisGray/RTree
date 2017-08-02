var gulp = require('gulp');
var clean = require('gulp-clean');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var tsify = require("tsify");


gulp.task('clean', function () {
  return gulp.src('dist', {
      read: false
    })
    .pipe(clean());
});

gulp.task("default", ['clean'], function () {
  return browserify('src/rtree.ts')
    .plugin(tsify)
    .bundle()
    .pipe(source('rtree.js'))
    .pipe(gulp.dest("dist"));
});