"use strict";

var gulp = require("gulp");

gulp.task("default", function() {
    gulp.start("style");
});

gulp.task("style", function() {
    var sass = require("gulp-sass")
    var postcss = require("gulp-postcss");
    var sourcemaps = require("gulp-sourcemaps");
    var autoprefixer = require("autoprefixer");

    return gulp.src(["./sass/*.scss", "./sass/widgets/*.scss"])
        .pipe(sourcemaps.init())
        // .pipe(sass().on("error", () => { sass.logError(); process.exit(1); }))
        .pipe(sass().on("error", sass.logError))
        .pipe(postcss([autoprefixer({ browsers: ["last 2 versions"] })]))
        .pipe(sourcemaps.write("./css/sourcemaps"))
        .pipe(gulp.dest("./css"));
});
