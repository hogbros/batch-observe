require("ts-node").register({
  project: "test/tsconfig.json"
});
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
