export abstract class GetterSerializable {
    /**
     * Serializes only the getters of an object to JSON.
     * @param instance object to retrieve getters as json properties
     */
    protected toJson(instance: any) {
        const jsonObj: any = {};
        const proto = Object.getPrototypeOf(instance);
        for (const key of Object.getOwnPropertyNames(proto)) {
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            const hasGetter = desc && typeof desc.get === 'function';
            if (hasGetter) {
                jsonObj[key] = desc.get.apply(instance);
            }
        }

        return jsonObj;
    }
}
