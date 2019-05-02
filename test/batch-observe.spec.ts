import { batchObserve, PropertyChangeState } from "../src/batch-observe";
import { spy } from "sinon";
import { expect } from "chai";

describe("batchObserve", function() {
  it("asynchronously calls the callback", async function() {
    const callbackSpy = spy();
    const myObject = {
      foo: "bar"
    };
    const observeProperty = batchObserve<typeof myObject>(callbackSpy);
    observeProperty(myObject, "foo");
    myObject.foo = "baz";

    expect(callbackSpy).to.not.have.been.called;
    await Promise.resolve();
    expect(callbackSpy).to.have.been.called;
  });
  it("will pass all updated properties to the callback", async function() {
    const myObject = {
      foo: "a",
      bar: "b"
    };
    const callbackSpy = spy();
    const observeProperty = batchObserve<typeof myObject>(callbackSpy);
    observeProperty(myObject, "foo");
    observeProperty(myObject, "bar");
    myObject.foo = "c";
    myObject.bar = "d";

    await Promise.resolve();
    expect(callbackSpy).to.have.been.calledWith(myObject);
    const updatedProperties: Map<keyof typeof myObject, PropertyChangeState> =
      callbackSpy.args[0][1];
    const fooUpdateState = updatedProperties.get("foo");
    expect(fooUpdateState).to.not.be.undefined;
    expect(fooUpdateState!.oldValue).to.equal("a");
    expect(fooUpdateState!.value).to.equal("c");
    const barUpdateState = updatedProperties.get("bar");
    expect(barUpdateState).to.not.be.undefined;
    expect(barUpdateState!.oldValue).to.equal("b");
    expect(barUpdateState!.value).to.equal("d");
  });
  it("will pass the latest value from an updated property to the callback", async function() {
    const myObject = {
      foo: "a"
    };
    const callbackSpy = spy();
    const observeProperty = batchObserve<typeof myObject>(callbackSpy);
    observeProperty(myObject, "foo");
    myObject.foo = "b";
    myObject.foo = "c";

    await Promise.resolve();
    expect(callbackSpy).to.have.been.calledOnce.and.calledWith(myObject);
    const updatedProperties: Map<keyof typeof myObject, PropertyChangeState> =
      callbackSpy.args[0][1];
    const fooUpdateState = updatedProperties.get("foo");
    expect(fooUpdateState).to.not.be.undefined;
    expect(fooUpdateState!.oldValue).to.equal("a");
    expect(fooUpdateState!.value).to.equal("c");
  });
  it("will not pass a property to the callback if it is reverted to its old value", async function() {
    const myObject = {
      foo: "a",
      bar: "b"
    };
    const callbackSpy = spy();
    const observeProperty = batchObserve<typeof myObject>(callbackSpy);
    observeProperty(myObject, "foo");
    observeProperty(myObject, "bar");
    myObject.foo = "c";
    myObject.bar = "d";
    myObject.foo = "a";

    await Promise.resolve();
    expect(callbackSpy).to.have.been.calledOnce;
    const updatedProperties: Map<keyof typeof myObject, PropertyChangeState> =
      callbackSpy.args[0][1];
    expect(updatedProperties.has("foo")).to.be.false;
  });
  it("will not update if all updated properties are reverted to their old value", async function() {
    const myObject = {
      foo: "a"
    };
    const callbackSpy = spy();
    const observeProperty = batchObserve<typeof myObject>(callbackSpy);
    observeProperty(myObject, "foo");
    myObject.foo = "b";
    myObject.foo = "a";

    await Promise.resolve();
    expect(callbackSpy).to.not.have.been.called;
  });
  it("will allow multiple update pipelines to be registered to an object", async function() {
    const myObject = {
      foo: "a"
    };
    const callbackSpy1 = spy();
    const callbackSpy2 = spy();
    const observeProperty1 = batchObserve<typeof myObject>(callbackSpy1);
    const observeProperty2 = batchObserve<typeof myObject>(callbackSpy2);
    observeProperty1(myObject, "foo");
    observeProperty2(myObject, "foo");
    myObject.foo = "b";

    await Promise.resolve();
    expect(callbackSpy1).to.have.been.calledOnce;
    expect(callbackSpy2).to.have.been.calledOnce;
  });
});
