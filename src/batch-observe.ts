import { onSet } from "@hogbros/observe-property";

export interface PropertyChangeState<Value = any> {
  oldValue: Value;
  value: Value;
}

export interface ChangeDetector<Value> {
  (oldValue: Value, newValue: Value): boolean;
}

function notEqual(a: any, b: any) {
  return a !== b;
}

export class UpdatePipeline<Target> {
  private propertyChangeDetectors: Map<
    keyof Target,
    ChangeDetector<any>
  > = new Map();

  private updatingProperties = Symbol();
  private updatingPromise = Symbol();

  constructor(
    private update: (
      target: Target,
      changedProperties?: Map<keyof Target, PropertyChangeState>
    ) => void | Promise<void>
  ) {}

  observeProperty<Property extends keyof Target>(
    target: Target,
    key: Property,
    changeDetector: ChangeDetector<Target[Property]> = notEqual
  ) {
    Object.defineProperty(target, key, this.decorateProperty(changeDetector)(
      target,
      key
    ) as TypedPropertyDescriptor<Target[Property]>);
  }

  decorateProperty<Property extends keyof Target>(
    changeDetector: ChangeDetector<Target[Property]> = notEqual
  ) {
    return (
      target: Target,
      propertyKey: Property,
      descriptor?: TypedPropertyDescriptor<Target[Property]>
    ): any => {
      this.propertyChangeDetectors.set(propertyKey, changeDetector);
      return onSet<Target, Property>((target, oldValue, value) =>
        this.requestPropertyUpdate(target, propertyKey, oldValue, value)
      )(target, propertyKey, descriptor);
    };
  }

  requestPropertyUpdate<Property extends keyof Target>(
    target: Target,
    key: Property,
    oldValue: Target[Property],
    value: Target[Property]
  ) {
    const changeDetector = this.propertyChangeDetectors.get(key);
    if (changeDetector !== undefined) {
      const updatingProperties = (target as any)[this.updatingProperties] as
        | Map<keyof Target, PropertyChangeState>
        | undefined;
      if (updatingProperties !== undefined) {
        if (updatingProperties.has(key)) {
          const updateState = updatingProperties.get(key)!;
          if (changeDetector(updateState.oldValue, value)) {
            updateState.value = value;
          } else {
            updatingProperties.delete(key);
          }
        } else if (changeDetector(oldValue, value)) {
          updatingProperties.set(key, { oldValue, value });
        }
      } else if (changeDetector(oldValue, value)) {
        (target as any)[this.updatingProperties] = new Map([
          [key, { oldValue, value }]
        ]);
        this.requestUpdate(target);
      }
    }
  }

  requestUpdate(target: Target) {
    (target as any)[this.updatingPromise] = Promise.resolve().then(() => {
      const updatingProperties = (target as any)[this.updatingProperties] as
        | Map<keyof Target, PropertyChangeState>
        | undefined;
      delete (target as any)[this.updatingProperties];
      if (updatingProperties === undefined || updatingProperties.size > 0) {
        return this.update(target, updatingProperties);
      }
    });
  }

  async whenUpdateComplete(target: Target) {
    await (target as any)[this.updatingPromise];
  }
}
