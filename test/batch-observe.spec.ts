import {
  CallbackPipeline,
  UpdatePipeline,
  PropertyChangeState
} from "../src/batch-observe";
import { spy } from "sinon";
import { expect } from "chai";

describe("CallbackPipeline", function() {
  describe("requestUpdate", function() {
    it("asynchronously calls the callback", async function() {
      const callbackSpy = spy();
      const pipeline = new CallbackPipeline<typeof myObject>(callbackSpy);
      const myObject = {};
      pipeline.requestUpdate(myObject);

      expect(callbackSpy).to.not.have.been.called;
      await pipeline.whenUpdateComplete(myObject);
      expect(callbackSpy).to.have.been.called;
    });
    it("will call the callback only once in the same tick", async function() {
      const callbackSpy = spy();
      const pipeline = new CallbackPipeline<typeof myObject>(callbackSpy);
      const myObject = {};
      pipeline.requestUpdate(myObject);
      pipeline.requestUpdate(myObject);

      expect(callbackSpy).to.not.have.been.called;
      await pipeline.whenUpdateComplete(myObject);
      expect(callbackSpy).to.have.been.calledOnce;
    });
  });
  it("will allow multiple pipelines to be registered to an object", async function() {
    const callbackSpy1 = spy();
    const callbackSpy2 = spy();
    const pipeline1 = new CallbackPipeline<typeof myObject>(callbackSpy1);
    const pipeline2 = new CallbackPipeline<typeof myObject>(callbackSpy2);
    const myObject = {};
    pipeline1.requestUpdate(myObject);
    pipeline2.requestUpdate(myObject);

    await Promise.all([
      pipeline1.whenUpdateComplete(myObject),
      pipeline2.whenUpdateComplete(myObject)
    ]);
    expect(callbackSpy1).to.have.been.calledOnce;
    expect(callbackSpy2).to.have.been.calledOnce;
  });
});

describe("UpdatePipeline", function() {
  it("will pass all updated properties to the callback", async function() {
    const callbackSpy = spy();
    const pipeline = new UpdatePipeline<typeof myObject>(callbackSpy);
    class MyClass {
      @pipeline.registerProperty()
      foo: string = "a";

      @pipeline.registerProperty()
      bar: string = "b";
    }
    const myObject = new MyClass();
    await pipeline.whenUpdateComplete(myObject);
    callbackSpy.resetHistory();

    myObject.foo = "c";
    myObject.bar = "d";

    await pipeline.whenUpdateComplete(myObject);
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
    const callbackSpy = spy();
    const pipeline = new UpdatePipeline<typeof myObject>(callbackSpy);
    class MyClass {
      @pipeline.registerProperty()
      foo: string = "a";
    }
    const myObject = new MyClass();
    await pipeline.whenUpdateComplete(myObject);
    callbackSpy.resetHistory();

    myObject.foo = "b";
    myObject.foo = "c";

    await pipeline.whenUpdateComplete(myObject);
    expect(callbackSpy).to.have.been.calledOnce.and.calledWith(myObject);
    const updatedProperties: Map<keyof typeof myObject, PropertyChangeState> =
      callbackSpy.args[0][1];
    const fooUpdateState = updatedProperties.get("foo");
    expect(fooUpdateState).to.not.be.undefined;
    expect(fooUpdateState!.oldValue).to.equal("a");
    expect(fooUpdateState!.value).to.equal("c");
  });
  it("will not pass a property to the callback if it is reverted to its old value", async function() {
    const callbackSpy = spy();
    const pipeline = new UpdatePipeline<typeof myObject>(callbackSpy);
    class MyClass {
      @pipeline.registerProperty()
      foo: string = "a";

      @pipeline.registerProperty()
      bar: string = "b";
    }
    const myObject = new MyClass();
    await pipeline.whenUpdateComplete(myObject);
    callbackSpy.resetHistory();

    myObject.foo = "c";
    myObject.bar = "d";
    myObject.foo = "a";

    await pipeline.whenUpdateComplete(myObject);
    expect(callbackSpy).to.have.been.calledOnce;
    const updatedProperties: Map<keyof typeof myObject, PropertyChangeState> =
      callbackSpy.args[0][1];
    expect(updatedProperties.has("foo")).to.be.false;
  });
  it("will not update if all updated properties are reverted to their old value", async function() {
    const callbackSpy = spy();
    const pipeline = new UpdatePipeline<typeof myObject>(callbackSpy);
    class MyClass {
      @pipeline.registerProperty()
      foo: string = "a";
    }
    const myObject = new MyClass();
    await pipeline.whenUpdateComplete(myObject);
    callbackSpy.resetHistory();

    myObject.foo = "b";
    myObject.foo = "a";

    await pipeline.whenUpdateComplete(myObject);
    expect(callbackSpy).to.not.have.been.called;
  });
});
