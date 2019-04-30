require("ts-node").register({
  project: "test/tsconfig.json"
});
const chai = require("chai");
const spies = require("chai-spies");
chai.use(spies);
