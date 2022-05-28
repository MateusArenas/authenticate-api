const { bindChanges } = require("../components/monitorEventEmitter");

const normalizedPath = require("path").join(__dirname, "../changes");

const changes = require("fs").readdirSync(normalizedPath).map(function(file) {
    console.log({ file });
  return require("../changes/" + file);
});

module.exports = bindChanges(changes)