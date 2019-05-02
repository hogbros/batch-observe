import { observeProperty } from "@hogbros/observe-property";

export interface PropertyChangeState<Value = any> {
  oldValue: Value;
  value: Value;
}

function notEqual(a: any, b: any) {
  return a !== b;
}

export function batchObserve<Target>(
  callback: (
    target: Target,
    changedProperties: Map<keyof Target, PropertyChangeState>
  ) => any
) {
  const UPDATING_PROPERTIES = Symbol();

  interface BatchObserved {
    [UPDATING_PROPERTIES]?: Map<keyof Target, PropertyChangeState>;
  }

  return function batchObserveProperty<Property extends keyof Target>(
    target: Target,
    key: Property,
    changeDetector: (
      oldValue: Target[Property],
      value: Target[Property]
    ) => boolean = notEqual
  ) {
    observeProperty<Target & BatchObserved, Target[Property]>(
      target,
      key,
      (target, oldValue, value) => {
        let updatingProperties = target[UPDATING_PROPERTIES];
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
          target[UPDATING_PROPERTIES] = updatingProperties = new Map([
            [key, { oldValue, value }]
          ]);
          Promise.resolve().then(() => {
            delete target[UPDATING_PROPERTIES];
            if (updatingProperties!.size > 0) {
              callback(target, updatingProperties!);
            }
          });
        }
      }
    );
  };
}
