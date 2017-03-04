"use strict";

const gulp = require("gulp");
const changed = require("gulp-changed");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

gulp.task("default", function() {
    gulp.start("style");
});

gulp.task("style", function() {
    const sass = require("gulp-sass");
    const postcss = require("gulp-postcss");
    const sourcemaps = require("gulp-sourcemaps");
    const autoprefixer = require("autoprefixer");

    const sassPath = "./sass/*.scss";
    const varPath = `./sass/_design.scss`;

    let lastSassModification = 0;
    const sassFiles = glob.sync(sassPath);
    for (const sassFile of sassFiles) {
        const mtime = fs.statSync(sassFile).mtime;
        if (mtime > lastSassModification) {
            lastSassModification = mtime;
        }
    }

    let promise = Promise.resolve();

    const designPaths = glob.sync("./sass/designs/*.scss");
    for (const designPath of designPaths) {
        const design = path.basename(designPath, ".scss");
        const lastDesignModification = fs.statSync(designPath).mtime;
        const cssFiles = glob.sync(`./css/${design}/*.css`);
        let compileAgain = false;

        if (cssFiles.length === 0) {
            compileAgain = true;
        } else {
            const lastCompileTime = fs.statSync(cssFiles[0]).mtime;
            if (lastCompileTime < lastDesignModification) {
                compileAgain = true;
            }
            if (lastCompileTime < lastSassModification) {
                compileAgain = true;
            }
        }
        if (compileAgain) {
            const cssPath = `./css/${design}`;
            promise = promise.then(() => new Promise((resolve, reject) => {
                console.log(`Compiling CSS for design '${design}'...\r`);
                fs.createReadStream(designPath).pipe(fs.createWriteStream(varPath))
                .on("finish", () => {
                    gulp.src(sassPath)
                        .pipe(sourcemaps.init())
                        .pipe(sass().on("error", sass.logError))
                        .pipe(postcss([autoprefixer({ browsers: ["last 2 versions"] })]))
                        .pipe(sourcemaps.write("./sourcemaps"))
                        .pipe(gulp.dest(cssPath))
                    .on("finish", () => resolve());
                });
            }));
        } else {
            console.log(`CSS for design '${design}' is already up to date.`);
        }
    }

    return promise.then(() => {
        if (fs.existsSync(varPath)) {
            fs.unlinkSync(varPath);
        }
    });
});
