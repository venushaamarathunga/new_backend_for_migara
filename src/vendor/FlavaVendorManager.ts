import { IVendorManager, VendorManager } from '../models/vendor-manager';

/**
 * Represents a user who operates the Flava portal for a vendor.
 */
export class FlavaVendorManager {
    public static from(vendorManagerUUID: string) {
        return VendorManager.findVendorManagerByUUID(vendorManagerUUID).then(manager => {
            if (!manager) {
                return null;
            }
            return new FlavaVendorManager(manager);
        });
    }

    private manager: IVendorManager;

    private constructor(manager: IVendorManager) {
        this.manager = manager;
    }

    get vendorId() {
        return this.manager.vendorId;
    }
}
