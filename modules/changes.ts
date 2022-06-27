import { bindChanges } from "../components/monitorEventEmitter";

const normalizedPath = require("path").join(__dirname, "../changes");

const changes = require("fs").readdirSync(normalizedPath).map(function(file: string) {
  return require("../changes/" + file);
});

export default bindChanges(changes)