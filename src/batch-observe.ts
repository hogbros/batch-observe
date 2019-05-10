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

export class CallbackPipeline<Target> {
  private updatingPromise = Symbol();
  private updateConditions = Symbol();

  constructor(private callback: (target: Target) => void) {}

  requestUpdate(target: Target, condition: () => boolean = () => true) {
    let updateConditions = (target as any)[this.updateConditions] as [
      () => boolean
    ];
    if (updateConditions !== undefined) {
      updateConditions.push(condition);
    } else {
      (target as any)[this.updateConditions] = updateConditions = [condition];
      (target as any)[this.updatingPromise] = Promise.resolve().then(() => {
        delete (target as any)[this.updateConditions];
        delete (target as any)[this.updatingPromise];
        if (updateConditions.some(condition => condition())) {
          this.callback(target);
        }
      });
    }
  }

  async whenUpdateComplete(target: Target) {
    await (target as any)[this.updatingPromise];
  }
}

export class UpdatePipeline<Target> extends CallbackPipeline<Target> {
  private propertyChangeDetectors: Map<
    keyof Target,
    ChangeDetector<any>
  > = new Map();

  private updatingProperties = Symbol();

  constructor(
    update: (
      target: Target,
      changedProperties?: Map<keyof Target, PropertyChangeState>
    ) => void | Promise<void>
  ) {
    super(target => {
      update(target, (target as any)[this.updatingProperties]);
    });
  }

  observeProperty<Property extends keyof Target>(
    target: Target,
    key: Property,
    changeDetector: ChangeDetector<Target[Property]> = notEqual
  ) {
    Object.defineProperty(target, key, this.registerProperty(changeDetector)(
      target,
      key
    ) as TypedPropertyDescriptor<Target[Property]>);
  }

  registerProperty<Property extends keyof Target>(
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
      let updatingProperties = (target as any)[this.updatingProperties] as
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
        (target as any)[this.updatingProperties] = updatingProperties = new Map(
          [[key, { oldValue, value }]]
        );
        this.requestUpdate(target, () => updatingProperties!.size > 0);
        this.whenUpdateComplete(target).then(
          () => delete (target as any)[this.updatingProperties]
        );
      }
    }
  }
}
