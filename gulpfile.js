var gulp = require('gulp');
var clean = require('gulp-clean');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var tsify = require("tsify");
var browserSync = require('browser-sync').create();

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

gulp.task('serve', ['copy-js'], function () {
  browserSync.init({
    server: {
      baseDir: "./srv"
    }
  });
});