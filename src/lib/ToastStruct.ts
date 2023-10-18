import IToastStructParams from "./IToastStructParams";
import {TMessageType} from "./typedef";

export default class ToastStruct {
    private readonly __id: string = ''
    public message: string = ''
    public type: TMessageType = 'info'
    public duration: number = 3000

    get id(): string {
        return this.__id
    }

    constructor({message, type = 'info', duration = 3000}: IToastStructParams) {
        // ToDo Can be a performance issue because Math library used
        this.__id = `toast-${Date.now().toString().split("").sort(() => Math.random() - .5).join('')}`
        this.message = message
        this.type = type
        this.duration = duration
    }
}
