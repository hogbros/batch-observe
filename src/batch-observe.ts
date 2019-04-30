interface PropertyChangeState<Value = any> {
  oldValue: Value;
  value: Value;
}

export function batchObserve<Target>(
  _callback: (
    target: Target,
    changedProperties: Map<keyof Target, PropertyChangeState>
  ) => any
) {
  return function observeProperty<Property extends keyof Target>(
    _target: Target,
    _key: Property,
    _changeDetector?: (
      oldValue: Target[Property],
      value: Target[Property]
    ) => boolean
  ) {
    throw new Error("Not Implemented");
  };
}
