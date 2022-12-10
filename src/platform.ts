import {
    API,
    DynamicPlatformPlugin,
    Logger,
    PlatformAccessory,
    PlatformConfig,
    Service,
    Characteristic
} from 'homebridge'
import fetch from 'node-fetch'
import {PLATFORM_NAME, PLUGIN_NAME} from './settings'
import {HotTubAccessory} from './HotTubAccessory'

export class LayZSpaWhirlpool implements DynamicPlatformPlugin {
    public readonly baseUrl: string = 'https://usapi.gizwits.com/app/'
    public readonly Service: typeof Service = this.api.hap.Service
    public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic

    // this is used to track restored cached accessories
    public readonly accessories: PlatformAccessory[] = []

    public apiToken: string = ''
    public deviceId: string = ''

    constructor (
public readonly log: Logger,
public readonly config: PlatformConfig,
public readonly api: API,
    ) {
        this.log.debug('Finished initializing platform:', this.config.name)
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback')

            this.retrieveApiKey(config.username, config.password).then(success => {
                if (success) {
                    this.discoverDevices()
                }
            })
        })
    }

    configureAccessory (accessory: PlatformAccessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName)
        this.accessories.push(accessory)
    }

    async retrieveApiKey (username: string, password: string): Promise<boolean> {
        try {
            const body = {"username": username, "password": password, "lang": "en"}
            const response = await fetch(this.baseUrl + `login`, {
                method: 'POST',	body: JSON.stringify(body),
	headers: {'Content-Type': 'application/json',"X-Gizwits-Application-Id":"98754e684ec045528b073876c34c7348"}

            })
            if (!response.ok) {
                this.log.error(`Could not retrieve api key. Status ${response.status}`)
                return false
            }

            const result = await response.json();
            this.apiToken = result.token;
            this.userId = result.uid;
            this.expiresAt = result.expire_at;
            const dResponse = await fetch(this.baseUrl + `bindings`, {
                method: 'GET',
	headers: {'X-Gizwits-User-token': this.apiToken,"X-Gizwits-Application-Id":"98754e684ec045528b073876c34c7348"}

            })
            const devices = await dResponse.json();
            this.log.info(devices)
            this.deviceId = devices.devices[0].did
            this.log.info('Successfully retrieved api token')
            return true
        } catch (e) {
            this.log.error('Something went wrong while trying to retrieve api key', e)
            return false
        }
    }

    discoverDevices () {
        const uuid = this.api.hap.uuid.generate(this.deviceId)
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

        if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)

            // eslint-disable-next-line no-new
            new HotTubAccessory(this, existingAccessory)
        } else {
            this.log.info('Adding new accessory:', this.config.name)
            // eslint-disable-next-line new-cap
            const accessory = new this.api.platformAccessory(this.config.name!, uuid)
            // eslint-disable-next-line no-new
            new HotTubAccessory(this, accessory)

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
        }
    }
}
