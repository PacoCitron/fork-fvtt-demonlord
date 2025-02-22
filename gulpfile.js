const {rollup} = require('rollup');
const argv = require('yargs').argv;
const chalk = require('chalk');
const fs = require('fs-extra');
const gulp = require('gulp');
const path = require('path');
const rollupConfig = require('./rollup.config');
const semver = require('semver');
const sass = require('gulp-sass')(require('sass'));
const cp = require('child_process');
sass.compiler = require('sass');

/********************/
/*  CONFIGURATION   */
/********************/

const name = path.basename(path.resolve('.'));
const sourceDirectory = './src';
const distDirectory = './dist';
const stylesDirectory = `${sourceDirectory}/styles`;
const stylesExtension = 'scss';
const sourceFileExtension = 'js';
const staticFiles = ['assets', 'fonts', 'lang', 'templates', 'system.json', 'template.json', 'lib'];
const compendiaDirectory = `${sourceDirectory}/packs`
const compendiaExtension = 'json'
const getDownloadURL = (version) => `https://host/path/to/${version}.zip`;
const packageType = "System"  // System or Module (capital case)
const packageId = getPackageId()

/********************/
/*      BUILD       */
/********************/

/**
 * Build the distributable JavaScript code
 */
async function buildCode() {
  const build = await rollup({input: rollupConfig.input, plugins: rollupConfig.plugins});
  return build.write(rollupConfig.output);
}

/**
 * Build style sheets
 */
function buildStyles() {
  return gulp
    .src(`${stylesDirectory}/${name}.${stylesExtension}`)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(`${distDirectory}/styles`));
}

/**
 * Copy static files
 */
async function copyFiles() {
  for (const file of staticFiles) {
    if (fs.existsSync(`${sourceDirectory}/${file}`)) {
      await fs.copy(`${sourceDirectory}/${file}`, `${distDirectory}/${file}`);
    }
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch(`${sourceDirectory}/**/*.${sourceFileExtension}`, {ignoreInitial: false}, buildCode);
  gulp.watch(`${stylesDirectory}/**/*.${stylesExtension}`, {ignoreInitial: false}, buildStyles);
  gulp.watch(`${compendiaDirectory}/**/*.${compendiaExtension}`, {ignoreInitial: true})
    .on('ready', buildCompendia)
    .on('change', buildCompendium)
    .on('add', buildCompendium)
    .on('unlink', buildCompendium)
  gulp.watch(
    staticFiles.map((file) => `${sourceDirectory}/${file}`),
    {ignoreInitial: false},
    copyFiles,
  );
}

async function buildCompendia() {

  const compendia = fs.readdirSync(`${compendiaDirectory}`, {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  console.log("Compendia list: ", compendia)
  for (const compendium of compendia) {
    await buildCompendium(compendium)
  }
}

/**
 * Builds a single compendium from .json to LevelDb
 * @param compendium {string} the compendium name. Should be a folder in src/packs/{compendium}.
 *  If the name contains a .json, then it is treated as a path to a single compendium entry.
 * @return {Promise<void>}
 */
async function buildCompendium(compendium) {
  // If name includes json, treat it as a path and get the parent dir as the compendium name
  if (compendium.includes('json')) {
    const dirName = path.dirname(compendium);
    const parts = dirName.split(path.sep);
    compendium = parts.at(-1);
  }

  const command = `fvtt package pack  --type ${packageType} --id ${packageId} -n "${compendium}" --in "${compendiaDirectory}/${compendium}" --out "${distDirectory}/packs/"`
  console.log(cp.execSync(command).toString());
}

/********************/
/*      CLEAN       */
/********************/

/**
 * Remove built files from `dist` folder while ignoring source files
 */
async function clean() {
  const files = [...staticFiles, 'module'];

  if (fs.existsSync(`${stylesDirectory}/${name}.${stylesExtension}`)) {
    files.push('styles');
  }

  console.log(' ', chalk.yellow('Files to clean:'));
  console.log('   ', chalk.blueBright(files.join('\n    ')));

  for (const filePath of files) {
    await fs.remove(`${distDirectory}/${filePath}`);
  }
}

/********************/
/*       LINK       */
/********************/

/**
 * Get the data path of Foundry VTT based on what is configured in `foundryconfig.json`
 */
function getDataPath() {
  const config = fs.readJSONSync('foundryconfig.json');

  if (config?.dataPath) {
    if (!fs.existsSync(path.resolve(config.dataPath))) {
      throw new Error('User Data path invalid, no Data directory found');
    }

    return path.resolve(config.dataPath);
  } else {
    throw new Error('No User Data path defined in foundryconfig.json');
  }
}

/**
 * Link build to User Data folder
 */
async function linkUserData() {
  let destinationDirectory;
  if (fs.existsSync(path.resolve(sourceDirectory, 'system.json'))) {
    destinationDirectory = 'systems';
  } else {
    throw new Error(`Could not find ${chalk.blueBright('system.json')}`);
  }

  const linkDirectory = path.resolve(getDataPath(), destinationDirectory, name);

  if (argv.clean || argv.c) {
    console.log(chalk.yellow(`Removing build in ${chalk.blueBright(linkDirectory)}.`));

    await fs.remove(linkDirectory);
  } else if (!fs.existsSync(linkDirectory)) {
    console.log(chalk.green(`Linking dist to ${chalk.blueBright(linkDirectory)}.`));
    await fs.ensureDir(path.resolve(linkDirectory, '..'));
    await fs.symlink(path.resolve(distDirectory), linkDirectory);
  }
}

/********************/
/*    VERSIONING    */
/********************/

/**
 * Get the contents of the manifest file as object.
 */
function getManifest() {
  const manifestPath = `${sourceDirectory}/system.json`;

  if (fs.existsSync(manifestPath)) {
    return {
      file: fs.readJSONSync(manifestPath),
      name: 'system.json',
    };
  }
}

/**
 * Get the target version based on on the current version and the argument passed as release.
 */
function getTargetVersion(currentVersion, release) {
  if (['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'].includes(release)) {
    return semver.inc(currentVersion, release);
  } else {
    return semver.valid(release);
  }
}

/**
 * Update version and download URL.
 */
function bumpVersion(cb) {
  const packageJson = fs.readJSONSync('package.json');
  const packageLockJson = fs.existsSync('package-lock.json') ? fs.readJSONSync('package-lock.json') : undefined;
  const manifest = getManifest();

  if (!manifest) cb(Error(chalk.red('Manifest JSON not found')));

  try {
    const release = argv.release || argv.r;

    const currentVersion = packageJson.version;

    if (!release) {
      return cb(Error('Missing release type'));
    }

    const targetVersion = getTargetVersion(currentVersion, release);

    if (!targetVersion) {
      return cb(new Error(chalk.red('Error: Incorrect version arguments')));
    }

    if (targetVersion === currentVersion) {
      return cb(new Error(chalk.red('Error: Target version is identical to current version')));
    }

    console.log(`Updating version number to '${targetVersion}'`);

    packageJson.version = targetVersion;
    fs.writeJSONSync('package.json', packageJson, {spaces: 2});

    if (packageLockJson) {
      packageLockJson.version = targetVersion;
      fs.writeJSONSync('package-lock.json', packageLockJson, {spaces: 2});
    }

    manifest.file.version = targetVersion;
    manifest.file.download = getDownloadURL(targetVersion);
    fs.writeJSONSync(`${sourceDirectory}/${manifest.name}`, manifest.file, {spaces: 2});

    return cb();
  } catch (err) {
    cb(err);
  }
}

/**
 * Set download url based on version
 */
function setDownloadURL(cb) {
  const systemJson = fs.readJSONSync('src/system.json');
  const version = systemJson.version
  const newDownloadURL = `https://github.com/Xacus/demonlord/releases/download/${version}/system.zip`
  systemJson.download = newDownloadURL
  console.info("Updating system download URL to " + newDownloadURL + '\n')
  cb()
}

function getPackageId() {
  const systemJson = fs.readJSONSync(`src/${packageType.toLowerCase()}.json`);
  return systemJson.id
}
/********************/
/*      EXPORTS     */
/********************/

const execBuild = gulp.parallel(buildCode, buildStyles, buildCompendia);

exports.build = gulp.series(clean, execBuild, copyFiles);
exports.watch = buildWatch;
exports.clean = clean;
exports.link = linkUserData;
exports.bumpVersion = bumpVersion;
exports.setDownloadURL = setDownloadURL;
