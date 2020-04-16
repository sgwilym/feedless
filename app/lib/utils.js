const fs = require("fs");
const leftpad = require("left-pad"); // I don't believe I'm depending on this
const pull = require("pull-stream");
const split = require("split-buffer");
const metrics = require("./metrics");

module.exports.asyncRouter = (app) => {
  const debug = require("debug")("router");

  let wrapper = (method, path, fn) => async (req, res, next) => {
    try {
      debug(`${method} ${path}`);
      metrics.router.inc({ method, path });
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  return {
    get: (path, fn) => {
      app.get(path, wrapper("GET", path, fn));
    },
    post: (path, fn) => {
      debug(`POST ${path}`);
      app.post(path, wrapper("POST", path, fn));
    },
  };
};

const ssbFolder = () => {
  let homeFolder =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}`;
};
module.exports.ssbFolder = ssbFolder;

module.exports.writeKey = (key, path) => {
  let secretPath = `${ssbFolder()}${path}`;

  // Same options ssb-keys use
  try {
    fs.mkdirSync(ssbFolder(), { recursive: true });
  } catch (e) {}
  fs.writeFileSync(secretPath, key, { mode: 0x100, flag: "wx" });
};

module.exports.identityFilename = (index) => {
  return "secret_" + leftpad(index, 2, "0") + ".butt";
};

module.exports.nextIdentityFilename = async (ssbServer) => {
  const identities = await ssbServer.identities.list();
  return module.exports.identityFilename(identities.length - 1);
};

// From ssb-keys
module.exports.reconstructKeys = (keyfile) => {
  var privateKey = keyfile
    .replace(/\s*\#[^\n]*/g, "")
    .split("\n")
    .filter((x) => x)
    .join("");

  var keys = JSON.parse(privateKey);
  const hasSigil = (x) => /^(@|%|&)/.test(x);

  if (!hasSigil(keys.id)) keys.id = "@" + keys.public;
  return keys;
};

module.exports.readKey = (path) => {
  let secretPath = `${ssbFolder()}${path}`;

  let keyfile = fs.readFileSync(secretPath, "utf8");
  return module.exports.reconstructKeys(keyfile);
};

module.exports.uploadPicture = async (ssbServer, picture) => {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (picture.size > maxSize) throw "Max size exceeded";

  return await new Promise((resolve, reject) =>
    pull(
      pull.values(split(picture.data, 64 * 1024)),
      ssbServer.blobs.add((err, result) => {
        if (err) return reject(err);
        return resolve(result);
      })
    )
  );
};

module.exports.promisePull = (...streams) =>
  new Promise((resolve, reject) => {
    pull(
      ...streams,
      pull.collect((err, msgs) => {
        if (err) return reject(err);
        return resolve(msgs);
      })
    );
  });

module.exports.mapValues = (x) => x.map((y) => y.value);
