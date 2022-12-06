"use strict";

const gulp = require("gulp");
const changed = require("gulp-changed");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const sassGlob = "./sass/*.scss";

function findFilesToCompile(designPath, sassModTimes) {
    const design = path.basename(designPath, ".scss");
    const lastDesignModification = fs.statSync(designPath).mtime;
    const cssFiles = glob.sync(`./css/${design}/*.css`);

    // If nothing has been compiled yet, compile everything
    if (cssFiles.length === 0) {
        return sassGlob
    }

    // Gather SASS files which have been modified since they were last compiled,
    // also remember when the oldest CSS file has been created, and which SCSS
    // files have not been compiled at all yet
    const filesToCompile = []
    let earliestCompileTime = Infinity
    const remainingSassFiles = new Set(Object.keys(sassModTimes))
    for (const cssFile of cssFiles) {
        const baseName = path.basename(cssFile, ".css")
        const sassFile = `./sass/${baseName}.scss`  
        const lastCompileTime = fs.statSync(cssFile).mtime
        if (sassModTimes[sassFile] !== undefined) {
            if (lastCompileTime < sassModTimes[sassFile]) {
                filesToCompile.push(sassFile)
            }
            remainingSassFiles.delete(sassFile)
        }
        if (lastCompileTime < earliestCompileTime) {
            earliestCompileTime = lastCompileTime
        }
    }

    // If a design file has been modified, compile everything again
    if (earliestCompileTime < lastDesignModification) {
        return sassGlob
    }

    // sassModTimes now only contains those files for which no
    // corresponding CSS file has been found in the loop above
    for (const sassFile of remainingSassFiles) {
        const baseName = path.basename(sassFile, ".scss")

        // If a partial file (starting with underscore) has been modified,
        // compil everything because we don't know which files import it
        if (baseName.startsWith("_")) {
            if (earliestCompileTime < sassModTimes[sassFile]) {
                return sassGlob
            }
        }
        // Compile SASS files which haven't been compiled before
        else {
            filesToCompile.push(sassFile)
        }
    }

    return filesToCompile
}

gulp.task("style", async function() {
    const sass = require("gulp-sass")(require("node-sass"));
    const postcss = require("gulp-postcss");
    const sourcemaps = require("gulp-sourcemaps");
    const autoprefixer = require("autoprefixer");
    const varPath = `./sass/_design.scss`;

    let lastSassModification = 0;
    const sassModTimes = {}
    const sassFiles = glob.sync(sassGlob);
    for (const sassFile of sassFiles) {
        const mtime = fs.statSync(sassFile).mtime;
        sassModTimes[sassFile] = mtime;
        if (mtime > lastSassModification) {
            lastSassModification = mtime;
        }
    }

    const designPaths = glob.sync("./sass/designs/*.scss")
    for (const designPath of designPaths) {
        const globsToCompile = findFilesToCompile(designPath, sassModTimes)
        const design = path.basename(designPath, ".scss");
        if (Array.isArray(globsToCompile) && globsToCompile.length === 0) {
            console.log(`CSS for design '${design}' is already up to date.`)
            continue
        }
        const numFilesString = globsToCompile === sassGlob ?
            "all" : globsToCompile.length.toString()
        console.log(`Compiling ${numFilesString} CSS files for design '${design}'...\r`)
        await new Promise((resolve, reject) => {
            fs.createReadStream(designPath)
            .pipe(fs.createWriteStream(varPath))
            .on("finish", () => {
                const cssPath = `./css/${design}`
                gulp.src(globsToCompile)
                    // .pipe(sourcemaps.init())
                    .pipe(sass.sync().on("error", sass.logError))
                    .pipe(postcss([autoprefixer()]))
                    // .pipe(sourcemaps.write("./sourcemaps"))
                    .pipe(gulp.dest(cssPath))
                    .on("finish", () => resolve())
            });
        });
    }
    if (fs.existsSync(varPath)) {
        fs.unlinkSync(varPath);
    }
});

gulp.task("default", gulp.series("style"));
