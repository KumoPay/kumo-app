const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
// pnpm creates transient *_tmp_<pid> dirs under node_modules/.pnpm during installs.
// Metro's fallback watcher races on them and crashes with ENOENT — block them out.
// Same race happens with native build temp dirs (.cxx) that gradle creates and
// deletes during release bundling.
config.resolver.blockList = [
  /node_modules\/[^/]+_tmp_[^/]+\//,
  /\/\.cxx\//,
  /\/android\/app\/build\//,
  /\/android\/build\//,
]

module.exports = config
