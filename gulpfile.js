"use strict";

const gulp = require("gulp");
const changed = require("gulp-changed");

gulp.task("default", function() {
    gulp.start("style");
});

gulp.task("style", function() {
    const sass = require("gulp-sass")
    const postcss = require("gulp-postcss");
    const sourcemaps = require("gulp-sourcemaps");
    const autoprefixer = require("autoprefixer");

    const SRC = "./sass/*.scss"
    const DEST = "./css"

    return gulp.src(SRC)
        .pipe(sourcemaps.init())
        .pipe(sass().on("error", sass.logError))
        .pipe(postcss([autoprefixer({ browsers: ["last 2 versions"] })]))
        .pipe(sourcemaps.write("./sourcemaps"))
        .pipe(gulp.dest(DEST));
});
