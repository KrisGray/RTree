var gulp = require('gulp');
var clean = require('gulp-clean');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var browserSync = require('browser-sync').create();

gulp.task('default', function(){
  gulp.src(['src/**/*.ts'])
    .pipe(typescript())
    .pipe(gulp.dest('dest/'));
});

gulp.task('clean', function () {
  return gulp.src('dist', {
      read: false
    })
    .pipe(clean());
});

gulp.task("global-build", function () {
  return browserify('src/rtree-global.ts')
    .plugin(tsify)
    .bundle()
    .pipe(source('rtree.js'))
    .pipe(gulp.dest("srv"));
});

gulp.task('copy-js', ['global-build'], function () {
  return gulp.src([
      './jsspec/**/*'
    ])
    .pipe(gulp.dest('./srv'));
});

gulp.task('default', ['copy-js'], function () {
  browserSync.init({
    server: {
      baseDir: "./srv"
    }
  });
});